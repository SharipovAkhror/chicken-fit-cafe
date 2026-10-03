\set ON_ERROR_STOP 1
-- Проверки миграции 0008: столы (admin), тестовый персонал (dev_test изолирован от отчётов и реальных смен).
reset role;
insert into public.staff(name, role, pin_hash, is_test)
select 'Тест', 'admin', extensions.crypt('97531864', extensions.gen_salt('bf')), true
where not exists (select 1 from public.staff where name = 'Тест');
set role anon;

do $$ declare tt text; ta text; tc text; sh uuid := gen_random_uuid(); od uuid := gen_random_uuid(); r jsonb; before_rev bigint;
begin
  tt := public.pos_login('97531864', 'dev-test-e2e')->>'token';
  ta := public.pos_login('12345678', 'dev-admin')->>'token';
  tc := public.pos_login('1234', 'dev-c')->>'token';
  before_rev := (public.report_sales(ta, public._business_date(now()), public._business_date(now()))->'totals'->>'revenue')::bigint;

  perform public.pos_apply_mutation(tt, gen_random_uuid(), 'shift.upsert', jsonb_build_object('id', sh, 'openedAt', now(), 'initialCash', 1000, 'status', 'open'));
  perform public.pos_apply_mutation(tt, gen_random_uuid(), 'order.upsert', jsonb_build_object('id', od, 'number', 'T1', 'type', 'dine_in',
    'tableId', '1', 'shiftId', sh, 'deviceId', 'dev-test-e2e', 'total', 50000, 'subtotal', 50000, 'status', 'sent', 'paymentStatus', 'paid',
    'paymentMethod', 'cash', 'paidAt', now(), 'items', jsonb_build_array(jsonb_build_object('id','x','name','Тест-блюдо','price',50000,'qty',1,'isKitchen',true))));

  reset role;
  if (select source from public.orders where id = od) <> 'dev_test' then raise exception 'FAIL: test order not dev_test'; end if;
  if (select source from public.shifts where id = sh) <> 'dev_test' then raise exception 'FAIL: test shift not dev_test'; end if;
  set role anon;

  if (public.report_sales(ta, public._business_date(now()), public._business_date(now()))->'totals'->>'revenue')::bigint <> before_rev then
    raise exception 'FAIL: test order in report_sales'; end if;
  if (public.report_shift(tt, sh)->>'total_revenue')::bigint <> 50000 then raise exception 'FAIL: test shift X-report %', public.report_shift(tt, sh); end if;

  r := public.pos_pull(ta, null);
  if exists (select 1 from jsonb_array_elements(r->'orders') e where e->>'id' = od::text) then raise exception 'FAIL: real pull sees test order'; end if;
  if exists (select 1 from jsonb_array_elements(r->'shifts') e where e->>'id' = sh::text) then raise exception 'FAIL: real pull sees test shift'; end if;
  r := public.pos_pull(tt, null);
  if not exists (select 1 from jsonb_array_elements(r->'orders') e where e->>'id' = od::text) then raise exception 'FAIL: test pull misses order'; end if;

  begin perform public.pos_apply_mutation(tt, gen_random_uuid(), 'menu.upsert', '{"id":"x","price":1}'); raise exception 'FAIL: test staff edits menu';
  exception when raise_exception then if sqlerrm not like 'forbidden%' then raise; end if; end;

  -- столы
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'table.upsert', '{"id":"9","name":"Стол 9","zone":"Терраса"}');
  if jsonb_array_length(public.pos_pull(ta, null)->'tables') <> 9 then raise exception 'FAIL: table add'; end if;
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'table.upsert', '{"id":"9","isActive":false}');
  if jsonb_array_length(public.pos_pull(ta, null)->'tables') <> 8 then raise exception 'FAIL: table remove'; end if;
  begin perform public.pos_apply_mutation(tc, gen_random_uuid(), 'table.upsert', '{"id":"10"}'); raise exception 'FAIL: cashier edits tables';
  exception when raise_exception then if sqlerrm <> 'forbidden' then raise; end if; end;
  raise notice 'OK 9 tables + test staff isolation';
end $$;
reset role;
