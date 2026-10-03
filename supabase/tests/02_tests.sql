\set ON_ERROR_STOP 1
-- Интеграционные проверки миграций. Каждый блок падает с исключением при нарушении.
set role anon;

-- 1. Прямой доступ закрыт
do $$ begin
  begin perform 1 from public.orders limit 1; raise exception 'FAIL: anon reads orders';
  exception when insufficient_privilege then null; end;
  begin insert into public.menu_items(id, name_ru, price) values ('x','x',1); raise exception 'FAIL: anon inserts menu';
  exception when insufficient_privilege then null; end;
  begin delete from public.menu_items; raise exception 'FAIL: anon deletes menu';
  exception when insufficient_privilege then null; end;
  begin perform public._shift_summary(gen_random_uuid()); raise exception 'FAIL: internal fn callable';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.menu_items) < 1 then raise exception 'FAIL: anon cannot read menu'; end if;
  if (select count(*) from public.dining_tables) <> 8 then raise exception 'FAIL: tables'; end if;
  raise notice 'OK 1 access';
end $$;

-- 2. Логин: неверный PIN, верный PIN
do $$ declare r jsonb; begin
  if public.pos_login('9999', 'dev-test')->>'error' <> 'invalid_pin' then raise exception 'FAIL: bad pin accepted'; end if;
  r := public.pos_login('1234', 'dev-a');
  if r->'staff'->>'name' <> 'Кассир 1' or length(r->>'token') <> 64 then raise exception 'FAIL login %', r; end if;
  perform set_config('t.token', r->>'token', false);
  r := public.pos_login('0000', 'dev-k');
  perform set_config('t.ktoken', r->>'token', false);
  raise notice 'OK 2 login';
end $$;

-- 3. Блокировка перебора: 5 неудач -> too_many_attempts
do $$ declare i int; begin
  for i in 1..5 loop
    perform public.pos_login('1111', 'dev-brute');
  end loop;
  if public.pos_login('1234', 'dev-brute')->>'error' <> 'too_many_attempts' then raise exception 'FAIL: no lockout'; end if;
  raise notice 'OK 3 lockout';
end $$;

-- 4. Без токена ничего нельзя
do $$ begin
  begin perform public.pos_pull('bad', null); raise exception 'FAIL: pull w/o token';
  exception when others then if sqlerrm <> 'unauthorized' then raise; end if; end;
  raise notice 'OK 4 unauthorized';
end $$;

-- 5. Смена + заказ + идемпотентность + статус кухни не откатывается
do $$ declare
  tok text := current_setting('t.token'); ktok text := current_setting('t.ktoken');
  sid uuid := 'aaaaaaaa-0000-4000-8000-000000000001'; oid uuid := 'bbbbbbbb-0000-4000-8000-000000000001';
  m1 uuid := gen_random_uuid(); r jsonb; s jsonb;
begin
  perform public.pos_apply_mutation(tok, gen_random_uuid(), 'shift.upsert',
    jsonb_build_object('id', sid, 'openedAt', now() - interval '1 hour', 'initialCash', 100000, 'cashierName', 'Кассир 1'));
  r := jsonb_build_object('id', oid, 'number', '#001', 'type', 'dine_in', 'tableId', '3', 'status', 'sent',
       'shiftId', sid, 'total', 46000, 'subtotal', 46000, 'cashierName', 'Кассир 1',
       'items', jsonb_build_array(
          jsonb_build_object('id','strips-5','name','Стрипсы, 5 шт','price',38000,'qty',1,'isKitchen',true),
          jsonb_build_object('id','tea','name','Чай','price',8000,'qty',1,'isKitchen',false)));
  perform public.pos_apply_mutation(tok, m1, 'order.upsert', r);
  s := public.pos_apply_mutation(tok, m1, 'order.upsert', r);   -- повтор той же мутации
  if (s->>'duplicate')::boolean is not true then raise exception 'FAIL: not idempotent'; end if;
  -- кухня берёт в работу
  perform public.pos_apply_mutation(ktok, gen_random_uuid(), 'order.set_status', jsonb_build_object('id', oid, 'status', 'cooking'));
  -- касса присылает устаревший статус 'sent' (без resend) — статус должен остаться cooking
  perform public.pos_apply_mutation(tok, gen_random_uuid(), 'order.upsert', r);
  -- оплата
  perform public.pos_apply_mutation(tok, gen_random_uuid(), 'order.upsert',
     r || jsonb_build_object('paymentStatus','paid','paymentMethod','cash','paidAt', now(), 'cashReceived', 50000, 'changeAmount', 4000));
  reset role;
  if (select status from public.orders where id = oid) <> 'cooking' then raise exception 'FAIL: status regressed'; end if;
  if (select count(*) from public.order_items where order_id = oid) <> 2 then raise exception 'FAIL: items'; end if;
  if (select count(*) from public.orders where id = oid) <> 1 then raise exception 'FAIL: dup order'; end if;
  if (select count(*) from realtime.sent where topic = 'cf-sync') < 3 then raise exception 'FAIL: no broadcast'; end if;
  if exists (select 1 from realtime.sent where payload ? 'customer_phone') then raise exception 'FAIL: PII in broadcast'; end if;
  set role anon;
  -- закрытие смены -> z_snapshot с серверными итогами
  perform public.pos_apply_mutation(tok, gen_random_uuid(), 'shift.upsert',
    jsonb_build_object('id', sid, 'status', 'closed', 'closedAt', now(), 'countedCash', 146000));
  s := public.report_shift(tok, sid);
  if (s->>'total_revenue')::int <> 46000 or (s->>'cash_revenue')::int <> 46000 or (s->>'expected_cash')::int <> 146000
     then raise exception 'FAIL: shift summary %', s; end if;
  reset role;
  if (select z_snapshot->>'total_revenue' from public.shifts where id = sid) <> '46000' then raise exception 'FAIL: z snapshot'; end if;
  set role anon;
  raise notice 'OK 5 order/shift/idempotency/kitchen/z';
end $$;

-- 6. Legacy-импорт идемпотентен, существующие записи не перезаписываются
do $$ declare tok text := current_setting('t.token'); p jsonb; i int; begin
  p := jsonb_build_object('id','cccccccc-0000-4000-8000-000000000001','legacyId','cccccccc-0000-4000-8000-000000000001',
     'number','#017','type','takeaway','status','completed','paymentStatus','paid','paymentMethod','click_payme',
     'total', 18000, 'createdAt','2026-09-20T08:00:00Z','dataQuality', jsonb_build_array('shift_inferred'),
     'items', jsonb_build_array(jsonb_build_object('id','fries','name','Фри','price',18000,'qty',1)));
  for i in 1..3 loop
    perform public.pos_apply_mutation(tok, gen_random_uuid(), 'legacy.order', p);  -- разные mutation_id, тот же заказ
  end loop;
  perform public.pos_apply_mutation(tok, gen_random_uuid(), 'legacy.order', p || '{"total": 1}'::jsonb);
  reset role;
  if (select count(*) from public.orders where legacy_id = 'cccccccc-0000-4000-8000-000000000001') <> 1 then raise exception 'FAIL legacy dup'; end if;
  if (select total_amount from public.orders where legacy_id = 'cccccccc-0000-4000-8000-000000000001') <> 18000 then raise exception 'FAIL legacy overwritten'; end if;
  if (select business_date from public.orders where legacy_id = 'cccccccc-0000-4000-8000-000000000001') <> '2026-09-20' then raise exception 'FAIL business date'; end if;
  set role anon;
  raise notice 'OK 6 legacy idempotent';
end $$;

-- 7. Снимок: без PIN, дедупликация по sha256
do $$ declare r1 jsonb; r2 jsonb; snap jsonb; begin
  snap := jsonb_build_object('sha256', repeat('a', 64), 'deviceId', 'dev-a', 'capturedAt', now(), 'origin', 'https://x',
          'keys', jsonb_build_object('chickenfit_pos_orders_v1', '[]'));
  r1 := public.rescue_store_snapshot(snap);
  r2 := public.rescue_store_snapshot(snap);
  if (r2->>'duplicate')::boolean is not true or r1->>'id' <> r2->>'id' then raise exception 'FAIL snapshot dedupe'; end if;
  raise notice 'OK 7 snapshot';
end $$;

-- 8. Отчёты: dev_test исключены, legacy помечены
do $$ declare tok text := current_setting('t.token'); r jsonb; begin
  r := public.report_sales(tok, '2026-08-01', '2026-12-31');
  if (r->'totals'->>'revenue')::int <> 46000 + 18000 then raise exception 'FAIL report revenue %', r->'totals'; end if;
  if (r->'quality'->>'legacy_orders')::int <> 1 then raise exception 'FAIL quality'; end if;
  if (r->'quality'->'flags'->>'shift_inferred')::int <> 1 then raise exception 'FAIL flags'; end if;
  if jsonb_array_length(r->'by_item') < 2 then raise exception 'FAIL by_item'; end if;
  r := public.rescue_verify(tok);
  if (r->>'orders')::int <> 1 then raise exception 'FAIL verify'; end if;
  raise notice 'OK 8 reports';
end $$;
reset role;
select 'dev_test orders' as check, count(*) from public.orders where source = 'dev_test';
