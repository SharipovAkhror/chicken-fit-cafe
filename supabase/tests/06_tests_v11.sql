\set ON_ERROR_STOP 1
-- Проверки миграций 0011–0013: ограничения, housekeeping, фото по талонам, проверка блюд, отмена/объединение,
-- возобновление с защитой от двойной оплаты, «Счёт выдан» на сервере.

-- 1. CHECK-ограничения: base64-картинка и отрицательная сумма не пишутся
do $$ begin
  begin insert into public.menu_items(id, name_ru, price, image_url) values ('t-data', 'Тест', 1000, 'data:image/png;base64,AAAA');
    raise exception 'FAIL: data: url accepted'; exception when check_violation then null; end;
  begin insert into public.menu_items(id, name_ru, price) values ('t-neg', 'Тест', -1);
    raise exception 'FAIL: negative price'; exception when check_violation then null; end;
  begin insert into public.orders(id, order_number, order_type, items, total_amount, payment_status, source, status)
    values (gen_random_uuid(), '1', 'dine_in', '[]', -5, 'unpaid', 'pos', 'open');
    raise exception 'FAIL: negative total'; exception when check_violation then null; end;
  begin insert into public.orders(id, order_number, order_type, items, total_amount, payment_status, source, status)
    values (gen_random_uuid(), '1', 'dine_in', '{}', 5, 'unpaid', 'pos', 'open');
    raise exception 'FAIL: items not array'; exception when check_violation then null; end;
  raise notice 'OK v11.1 constraints';
end $$;

-- 2. housekeeping: удаляет просроченное, не чаще раза в 6 часов, доступна anon
insert into public.staff_sessions(token_hash, staff_id, expires_at, device_id)
select 'hk-old', id, now() - interval '30 days', 'hk' from public.staff limit 1;
set role anon;
do $$ declare r jsonb; begin
  r := public.housekeeping();
  if (r->>'sessions')::int < 1 then raise exception 'FAIL: housekeeping %', r; end if;
  if public.housekeeping()->>'skipped' <> 'true' then raise exception 'FAIL: housekeeping not rate-limited'; end if;
  raise notice 'OK v11.2 housekeeping';
end $$;
reset role;

-- 3. Фото: без талона аноним не пишет и не удаляет; талон — только admin/cashier; удаление — только неиспользуемого
set role anon;
do $$ declare ta text; tk text; t jsonb; r jsonb; n int; url text; begin
  ta := public.pos_login('12345678', 'dev-v11-photo')->>'token';
  tk := public.pos_login('0000', 'dev-v11-photo-k')->>'token';
  begin insert into storage.objects(bucket_id, name) values ('menu-photos', 'items/00000000-0000-4000-8000-000000000000.webp');
    raise exception 'FAIL: upload without ticket'; exception when insufficient_privilege then null; end;
  begin perform public.pos_photo_ticket(tk); raise exception 'FAIL: kitchen got ticket'; exception when raise_exception then
    if sqlerrm <> 'forbidden' then raise; end if; end;
  t := public.pos_photo_ticket(ta);
  if t->>'path' !~ '^items/[0-9a-f-]{36}\.webp$' or t->>'thumb' <> replace(t->>'path', '.webp', '-t.webp') then raise exception 'FAIL: ticket %', t; end if;
  insert into storage.objects(bucket_id, name) values ('menu-photos', t->>'path'), ('menu-photos', t->>'thumb');
  begin insert into storage.objects(bucket_id, name) values ('other', t->>'path');
    raise exception 'FAIL: other bucket'; exception when insufficient_privilege or foreign_key_violation then null; end;
  url := 'https://x.supabase.co/storage/v1/object/public/menu-photos/' || (t->>'path');
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-photo', 'nameRu', 'Фото-блюдо',
    'categoryId', 'chicken', 'price', 10000, 'imageUrl', url));
  r := public.pos_photo_release(ta, url);
  if r->>'in_use' <> 'true' then raise exception 'FAIL: released photo in use %', r; end if;
  delete from storage.objects where name = t->>'path';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: delete without ticket'; end if;
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-photo', 'imageUrl', ''));
  r := public.pos_photo_release(ta, url);
  if jsonb_array_length(r->'paths') <> 2 then raise exception 'FAIL: release %', r; end if;
  delete from storage.objects where name in (t->>'path', t->>'thumb');
  get diagnostics n = row_count;
  if n <> 2 then raise exception 'FAIL: delete with ticket, deleted %', n; end if;
  if jsonb_array_length(public.pos_photo_release(ta, '/menu/chicken.jpg')->'paths') <> 0 then raise exception 'FAIL: release local file'; end if;
  raise notice 'OK v11.3 photo tickets';
end $$;
reset role;
do $$ begin
  if (select file_size_limit from storage.buckets where id = 'menu-photos') <> 524288 or not (select public from storage.buckets where id = 'menu-photos')
    then raise exception 'FAIL: bucket settings'; end if;
end $$;

-- 4. Проверка блюд: обрезка, цена, категория, дубль названия, ссылка на фото; legacy не проверяется
set role anon;
do $$ declare ta text; begin
  ta := public.pos_login('12345678', 'dev-v11-menu')->>'token';
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-a', 'nameRu', '  Плов   по-самаркандски ',
    'categoryId', 'chicken', 'price', 30000));
  begin perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-b', 'nameRu', 'плов по-самаркандски',
    'categoryId', 'chicken', 'price', 31000)); raise exception 'FAIL: duplicate accepted';
  exception when unique_violation then null; end;
  begin perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-c', 'nameRu', 'Без цены',
    'categoryId', 'chicken', 'price', 0)); raise exception 'FAIL: zero price accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-d', 'nameRu', 'Без категории', 'price', 1000));
    raise exception 'FAIL: no category accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-e', 'nameRu', 'Ссылка',
    'categoryId', 'chicken', 'price', 1000, 'imageUrl', 'javascript:alert(1)')); raise exception 'FAIL: bad url accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-a', 'nameRu', 'П'));
    raise exception 'FAIL: short name accepted'; exception when invalid_parameter_value then null; end;
  -- стоп-лист (без названия) и правка того же блюда — без ложного «дубля»
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-a', 'available', false));
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id', 'v11-a', 'nameRu', 'Плов по-самаркандски', 'price', 32000));
end $$;
reset role;
do $$ begin
  if (select name_ru from public.menu_items where id = 'v11-a') <> 'Плов по-самаркандски' then raise exception 'FAIL: name not normalized'; end if;
  if (select price from public.menu_items where id = 'v11-a') <> 32000 or (select available from public.menu_items where id = 'v11-a') then raise exception 'FAIL: edit'; end if;
  if exists (select 1 from public.menu_items where id in ('v11-b', 'v11-c', 'v11-d', 'v11-e')) then raise exception 'FAIL: invalid rows written'; end if;
  raise notice 'OK v11.4 menu validation';
end $$;

-- 5–8. Заказы: отмена с правами, объединение, «Счёт выдан», возобновление без двойной оплаты
set role anon;
do $$ declare
  ta text; tc text; sh uuid := gen_random_uuid(); o1 uuid := gen_random_uuid(); o2 uuid := gen_random_uuid(); o3 uuid := gen_random_uuid();
  o4 uuid := gen_random_uuid(); r jsonb; ap jsonb; t0 timestamptz;
  it jsonb := jsonb_build_array(jsonb_build_object('id','x','name','Чай','price',5000,'originalPrice',5000,'qty',2));
  base jsonb;
begin
  ta := public.pos_login('12345678', 'dev-v11-a')->>'token';
  tc := public.pos_login('1234', 'dev-v11-c')->>'token';
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'shift.upsert', jsonb_build_object('id', sh, 'openedAt', now(), 'initialCash', 0, 'status', 'open', 'cashierName', 'Кассир 1'));
  base := jsonb_build_object('type','dine_in','tableId','2','items',it,'subtotal',10000,'total',10000,'paymentStatus','unpaid','shiftId',sh);
  -- 5. кассир отменяет неотправленный заказ сам
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('id', o1, 'number','V1','status','open'));
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.cancel', jsonb_build_object('id', o1, 'reason', 'Гость ушёл'));
  -- отправленный на кухню: без подтверждения нельзя (ни order.cancel, ни order.upsert)
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('id', o2, 'number','V2','status','sent'));
  begin perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.cancel', jsonb_build_object('id', o2, 'reason', 'Ошибка'));
    raise exception 'FAIL: cashier cancelled sent order'; exception when insufficient_privilege then null; end;
  begin perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('id', o2, 'number','V2','status','cancelled'));
    raise exception 'FAIL: cashier cancelled via upsert'; exception when insufficient_privilege then null; end;
  if public.pos_manager_approve(tc, '1234', 'cancel', o2)->>'error' <> 'invalid_pin' then raise exception 'FAIL: cashier pin approved'; end if;
  ap := public.pos_manager_approve(tc, '12345678', 'cancel', o2);
  if ap->>'approval_id' is null then raise exception 'FAIL: approve %', ap; end if;
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.cancel', jsonb_build_object('id', o2, 'reason', 'Ошибка кассира', 'approvalId', ap->>'approval_id'));
  -- подтверждение одноразовое
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('id', o3, 'number','V3','status','sent'));
  begin perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.cancel', jsonb_build_object('id', o3, 'reason', 'x', 'approvalId', ap->>'approval_id'));
    raise exception 'FAIL: approval reused'; exception when insufficient_privilege then null; end;
  -- 6. объединение: o3 → o4 (кассиру можно)
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('id', o4, 'number','V4','status','open','tableId','3'));
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.cancel', jsonb_build_object('id', o3, 'reason', 'Объединён со столом 3', 'mergedInto', o4));
  -- 7. «Счёт выдан»: ставится, не стирается старым payload без поля, снимается пустой строкой
  t0 := now();
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('id', o4, 'number','V4','status','open','tableId','3','precheckAt', t0));
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('id', o4, 'number','V4','status','open','tableId','3'));
  perform set_config('t.o1', o1::text, false); perform set_config('t.o2', o2::text, false); perform set_config('t.o3', o3::text, false);
  perform set_config('t.o4', o4::text, false); perform set_config('t.sh', sh::text, false); perform set_config('t.tc', tc, false); perform set_config('t.ta', ta, false);
end $$;
reset role;
do $$ declare o1 uuid := current_setting('t.o1'); o2 uuid := current_setting('t.o2'); o3 uuid := current_setting('t.o3'); o4 uuid := current_setting('t.o4'); begin
  if (select status from public.orders where id = o1) <> 'cancelled' or (select status from public.orders where id = o2) <> 'cancelled' then raise exception 'FAIL: cancel'; end if;
  if (select payload->>'reason' from public.order_events where order_id = o1 and type = 'cancelled') <> 'Гость ушёл' then raise exception 'FAIL: cancel audit'; end if;
  if (select payload->>'approved_by' from public.order_events where order_id = o2 and type = 'cancelled') is null then raise exception 'FAIL: approver not audited'; end if;
  if (select payload->>'merged_into' from public.order_events where order_id = o3 and type = 'merged')::uuid <> o4 then raise exception 'FAIL: merge audit'; end if;
  if (select precheck_at from public.orders where id = o4) is null then raise exception 'FAIL: precheck_at lost'; end if;
  raise notice 'OK v11.5-7 cancel rights, merge, precheck';
end $$;
set role anon;
do $$ declare tc text := current_setting('t.tc'); ta text := current_setting('t.ta'); o4 uuid := current_setting('t.o4'); sh uuid := current_setting('t.sh');
  it jsonb := jsonb_build_array(jsonb_build_object('id','x','name','Чай','price',5000,'originalPrice',5000,'qty',2));
  it2 jsonb := jsonb_build_array(jsonb_build_object('id','x','name','Чай','price',5000,'originalPrice',5000,'qty',3));
  paid1 timestamptz := now() - interval '1 minute'; r jsonb; ap jsonb;
  base jsonb := jsonb_build_object('id', o4, 'number','V4','type','dine_in','tableId','3','shiftId',sh);
begin
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('items',it,'subtotal',10000,'total',10000,'status','open','precheckAt',''));
  -- оплата
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('items',it,'subtotal',10000,'total',10000,'status','completed',
    'paymentStatus','paid','paymentMethod','cash','paidAt',paid1,'cashReceived',10000));
  -- устаревшая копия «не оплачен» с другого устройства не снимает оплату
  r := public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('items',it2,'subtotal',15000,'total',15000,'status','open','paymentStatus','unpaid'));
  if r->'result'->>'ignored' <> 'paid' then raise exception 'FAIL: unpay via upsert %', r; end if;
  -- кассир без подтверждения не возобновляет
  if public.pos_reopen_order(tc, o4, 'Дозаказ')->>'error' <> 'manager_required' then raise exception 'FAIL: cashier reopened'; end if;
  if public.pos_reopen_order(tc, o4, '')->>'error' <> 'reason_required' then raise exception 'FAIL: reason'; end if;
  ap := public.pos_manager_approve(tc, '12345678', 'reopen', o4);
  r := public.pos_reopen_order(tc, o4, 'Дозаказ', (ap->>'approval_id')::uuid);
  base := base || jsonb_build_object('reopenedAt', r->'order'->>'reopened_at');
  if r->'order'->>'payment_status' <> 'unpaid' or (r->'order'->>'reopen_paid_amount')::int <> 10000 or r->'order'->>'reopen_paid_method' <> 'cash' then raise exception 'FAIL: reopen %', r; end if;
  -- запоздалая оплата, сделанная до возобновления, не применяется повторно
  r := public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', (base - 'reopenedAt') || jsonb_build_object('items',it,'subtotal',10000,'total',10000,'status','completed',
    'paymentStatus','paid','paymentMethod','cash','paidAt',paid1,'cashReceived',10000));
  if r->'result'->>'ignored' <> 'stale_payment' then raise exception 'FAIL: stale payment applied %', r; end if;
  -- дозаказ и повторная оплата (клиент знает reopenedAt из ответа pos_reopen_order)
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('items',it2,'subtotal',15000,'total',15000,'status','open'));
  perform public.pos_apply_mutation(tc, gen_random_uuid(), 'order.upsert', base || jsonb_build_object('items',it2,'subtotal',15000,'total',15000,'status','completed',
    'paymentStatus','paid','paymentMethod','cash','paidAt',now(),'cashReceived',15000));
  -- после закрытия смены возобновить нельзя
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'shift.upsert', jsonb_build_object('id', sh, 'status', 'closed', 'closedAt', now(), 'countedCash', 15000));
  r := public.pos_reopen_order(ta, o4, 'Поздно');
  if r->>'error' is distinct from 'shift_closed' then raise exception 'FAIL: reopen after shift close %', r; end if;
end $$;
reset role;
do $$ declare o4 uuid := current_setting('t.o4'); sh uuid := current_setting('t.sh'); s jsonb; begin
  if (select payment_status from public.orders where id = o4) <> 'paid' or (select total_amount from public.orders where id = o4) <> 15000 then raise exception 'FAIL: re-pay'; end if;
  if (select count(*) from public.order_events where order_id = o4 and type = 'reopened') <> 1 then raise exception 'FAIL: reopen audit'; end if;
  s := public._shift_summary(sh);
  -- выручка смены = одна действующая оплата 15 000 (не 10 000 + 15 000)
  if (s->>'total_revenue')::int <> 15000 or (s->>'cash_revenue')::int <> 15000 then raise exception 'FAIL: shift revenue %', s; end if;
  raise notice 'OK v11.8 reopen: one active payment, stale writes ignored, shift guard';
end $$;
