\set ON_ERROR_STOP 1
-- Проверки миграции 0010: аудит ручной цены; запись заказа без изменений для старых payload.
set role anon;
do $$ declare ta text; od uuid := gen_random_uuid(); ev jsonb; n int;
  item_ok jsonb := jsonb_build_object('id','x','name','Плов','price',30000,'originalPrice',30000,'qty',1);
  item_ovr jsonb := jsonb_build_object('id','x','name','Плов','price',25000,'originalPrice',30000,'qty',2);
  item_kg jsonb := jsonb_build_object('id','chicken-1kg','name','Chicken 750 г','price',67500,'originalPrice',67500,'qty',1,'weightKg',0.75,'pricePerKg',90000,'listPricePerKg',90000);
begin
  ta := public.pos_login('12345678', 'dev-admin-v10')->>'token';
  -- без ручной цены (в т.ч. смена веса весовой позиции) — событий price_override нет
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'order.upsert', jsonb_build_object('id', od, 'number','A1','type','dine_in','tableId','1',
    'total', 97500, 'subtotal', 97500, 'status','open','paymentStatus','unpaid','items', jsonb_build_array(item_ok, item_kg)));
  reset role;
  if (select count(*) from public.order_events where order_id = od and type = 'price_override') <> 0 then raise exception 'FAIL: false override'; end if;
  if (select count(*) from public.order_items where order_id = od) <> 2 then raise exception 'FAIL: items not written'; end if;
  set role anon;
  -- ручная цена: одно событие с from/to и сотрудником
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'order.upsert', jsonb_build_object('id', od, 'number','A1','type','dine_in','tableId','1',
    'total', 117500, 'subtotal', 117500, 'status','open','paymentStatus','unpaid','items', jsonb_build_array(item_ovr, item_kg)));
  -- повторная запись того же заказа — без нового события
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'order.upsert', jsonb_build_object('id', od, 'number','A1','type','dine_in','tableId','1',
    'total', 117500, 'subtotal', 117500, 'status','sent','paymentStatus','unpaid','items', jsonb_build_array(item_ovr, item_kg)));
  reset role;
  select count(*), max(payload::text)::jsonb into n, ev from public.order_events where order_id = od and type = 'price_override';
  if n <> 1 then raise exception 'FAIL: expected 1 override event, got %', n; end if;
  if (ev->'lines'->0->>'from')::int <> 30000 or (ev->'lines'->0->>'to')::int <> 25000 or ev->'lines'->0->>'name' <> 'Плов' then raise exception 'FAIL: payload %', ev; end if;
  if (select staff_id from public.order_events where order_id = od and type = 'price_override') is null then raise exception 'FAIL: no staff'; end if;
  if (select line_total from public.order_items where order_id = od and name_snapshot = 'Плов') <> 50000 then raise exception 'FAIL: line total'; end if;
  -- старый payload без originalPrice (prod v2 / legacy) пишется как раньше, без событий аудита
  set role anon;
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'order.upsert', jsonb_build_object('id', od, 'number','A1','type','dine_in','tableId','1',
    'total', 1000, 'subtotal', 1000, 'status','sent','paymentStatus','unpaid','items', jsonb_build_array(jsonb_build_object('id','y','name','Чай','price',1000,'qty',1))));
  reset role;
  if (select count(*) from public.order_items where order_id = od) <> 1 or (select total_amount from public.orders where id = od) <> 1000 then raise exception 'FAIL: old payload'; end if;
  if (select count(*) from public.order_events where order_id = od and type = 'price_override') <> 1 then raise exception 'FAIL: old payload produced audit'; end if;
end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.order_events where type = 'price_override') then raise exception 'FAIL: override lost'; end if;
  raise notice 'OK v10: price override audit, no false positives, idempotent';
end $$;
