\set ON_ERROR_STOP 1
-- Проверки миграции 0009: kind/options у товаров; старый payload (без kind/options) их не затирает; перенос заказа на другой стол.
set role anon;
do $$ declare ta text; od uuid := gen_random_uuid(); r jsonb;
begin
  ta := public.pos_login('12345678', 'dev-admin-v9')->>'token';
  -- новый товар на вес с модификаторами
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', jsonb_build_object('id','test-kg','nameRu','Курица на вес','categoryId','chicken',
    'price', 90000, 'unit','kg', 'pricePerKg', 90000, 'kind','weighted', 'isKitchen', true,
    'options', jsonb_build_object('variants', jsonb_build_array('Микс','Крылья','Стрипсы'), 'extras', jsonb_build_array('Острый'))));
  reset role;
  if (select kind from public.menu_items where id='test-kg') <> 'weighted' then raise exception 'FAIL: kind not stored'; end if;
  if (select options->'variants'->>1 from public.menu_items where id='test-kg') <> 'Крылья' then raise exception 'FAIL: options not stored'; end if;
  set role anon;
  -- старый клиент (prod v2): только цена — kind/options не трогаются
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', '{"id":"test-kg","price":95000}');
  reset role;
  if (select kind || ':' || price from public.menu_items where id='test-kg') <> 'weighted:95000' then raise exception 'FAIL: old payload clobbered kind'; end if;
  if (select options from public.menu_items where id='test-kg') is null then raise exception 'FAIL: old payload clobbered options'; end if;
  set role anon;
  -- явная очистка
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', '{"id":"test-kg","kind":"portion","options":null}');
  reset role;
  if (select kind from public.menu_items where id='test-kg') <> 'portion' or (select options from public.menu_items where id='test-kg') is not null then raise exception 'FAIL: clear'; end if;
  -- неверный kind отклоняется
  set role anon;
  begin perform public.pos_apply_mutation(ta, gen_random_uuid(), 'menu.upsert', '{"id":"test-kg","kind":"bogus"}'); raise exception 'FAIL: bogus kind accepted';
  exception when check_violation then null; end;
  -- pull отдаёт новые поля
  r := public.pos_pull(ta, null);
  if not exists (select 1 from jsonb_array_elements(r->'menu') e where e->>'id' = 'test-kg' and e ? 'kind' and e ? 'options') then raise exception 'FAIL: pull lacks kind/options'; end if;
  -- перенос заказа на другой стол (order.upsert с новым tableId)
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'order.upsert', jsonb_build_object('id', od, 'number', 'M1', 'type','dine_in','tableId','1',
    'total', 10000, 'subtotal', 10000, 'status','sent','paymentStatus','unpaid','items', jsonb_build_array(jsonb_build_object('id','x','name','Блюдо','price',10000,'qty',1))));
  perform public.pos_apply_mutation(ta, gen_random_uuid(), 'order.upsert', jsonb_build_object('id', od, 'number', 'M1', 'type','dine_in','tableId','2',
    'total', 10000, 'subtotal', 10000, 'status','sent','paymentStatus','unpaid','items', jsonb_build_array(jsonb_build_object('id','x','name','Блюдо','price',10000,'qty',1))));
  reset role;
  if (select table_id from public.orders where id = od) <> '2' then raise exception 'FAIL: transfer table'; end if;
  if (select count(*) from public.order_items where order_id = od) <> 1 then raise exception 'FAIL: transfer duplicated items'; end if;
  raise notice 'OK v9: kind/options, old payload compat, pull, transfer';
end $$;
reset role;
