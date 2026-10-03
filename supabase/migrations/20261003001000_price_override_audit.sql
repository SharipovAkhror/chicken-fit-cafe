-- 0010: аудит ручного изменения цены позиции (аддитивно).
-- Позиция считается «с ручной ценой», если price <> originalPrice (клиент держит originalPrice = цена по меню,
-- для весовых — вес × цена за кг по меню). Когда набор таких позиций в заказе меняется, пишется событие
-- order_events.type = 'price_override' с сотрудником и строками {name, qty, from, to}.
-- _upsert_order меняется только вызовом аудита в блоке exception — старые клиенты (prod v2) работают как раньше.

create or replace function public._audit_price_overrides(p_order uuid, p_old jsonb, p_new jsonb, p_staff uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_lines jsonb;
begin
  with n as (
    select it->>'name' as name, coalesce((it->>'qty')::numeric, 1) as qty,
           round((it->>'originalPrice')::numeric) as orig, round((it->>'price')::numeric) as price
      from jsonb_array_elements(case when jsonb_typeof(p_new) = 'array' then p_new else '[]'::jsonb end) it
     where it ? 'originalPrice' and it ? 'price'
       and round((it->>'price')::numeric) <> round((it->>'originalPrice')::numeric)
  ), o as (
    select it->>'name' as name, round((it->>'originalPrice')::numeric) as orig, round((it->>'price')::numeric) as price
      from jsonb_array_elements(case when jsonb_typeof(p_old) = 'array' then p_old else '[]'::jsonb end) it
     where it ? 'originalPrice' and it ? 'price'
  )
  select jsonb_agg(jsonb_build_object('name', n.name, 'qty', n.qty, 'from', n.orig, 'to', n.price))
    into v_lines
    from n
   where not exists (select 1 from o where o.name is not distinct from n.name and o.price = n.price and o.orig = n.orig);
  if v_lines is not null then
    insert into public.order_events(order_id, type, payload, staff_id)
    values (p_order, 'price_override', jsonb_build_object('lines', v_lines), p_staff);
  end if;
end $$;

revoke execute on function public._audit_price_overrides(uuid, jsonb, jsonb, uuid) from public, anon, authenticated;

create or replace function public._upsert_order(p jsonb, p_staff public.staff, p_source text, p_legacy boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid := (p->>'id')::uuid;
  cur public.orders;
  v_status text := coalesce(p->>'status', 'open');
  v_created timestamptz := coalesce((p->>'createdAt')::timestamptz, now());
  v_shift uuid := nullif(p->>'shiftId', '')::uuid;
  v_table text := nullif(p->>'tableId', '');
  v_items jsonb := coalesce(p->'items', '[]'::jsonb);
  v_bd date;
  it jsonb;
  pos integer := 0;
begin
  if v_id is null then raise exception 'order id required'; end if;
  if v_table is not null and not exists (select 1 from public.dining_tables where id = v_table) then
    v_table := null; -- неизвестный стол не должен ронять запись
  end if;
  if v_shift is not null and not exists (select 1 from public.shifts where id = v_shift) then
    v_shift := null;
  end if;
  select s.business_date into v_bd from public.shifts s where s.id = v_shift;
  v_bd := coalesce(v_bd, public._business_date(v_created));

  select * into cur from public.orders where id = v_id for update;

  if found then
    if p_legacy then
      return jsonb_build_object('id', v_id, 'skipped', 'exists');
    end if;
    if cur.status = 'cancelled' and v_status <> 'cancelled' then
      v_status := 'cancelled';
    elsif v_status <> 'cancelled' and not coalesce((p->>'resend')::boolean, false)
          and public._status_rank(cur.status) > public._status_rank(v_status) then
      v_status := cur.status;
    end if;
    update public.orders set
      order_number = coalesce(p->>'number', order_number),
      order_type = coalesce(p->>'type', order_type),
      table_id = v_table,
      table_number = v_table,
      customer_phone = p->>'customerPhone',
      delivery_address = p->>'deliveryAddress',
      items = v_items,
      subtotal = (p->>'subtotal')::integer,
      discount_percent = (p->>'discountPercent')::integer,
      discount_amount = (p->>'discountAmount')::integer,
      delivery_fee = (p->>'deliveryFee')::integer,
      total_amount = coalesce((p->>'total')::integer, 0),
      payment_status = coalesce(p->>'paymentStatus', payment_status),
      payment_method = coalesce(p->>'paymentMethod', payment_method),
      paid_at = coalesce((p->>'paidAt')::timestamptz, paid_at),
      cash_received = (p->>'cashReceived')::integer,
      change_amount = (p->>'changeAmount')::integer,
      status = v_status,
      shift_id = coalesce(v_shift, shift_id),
      business_date = case when v_shift is not null then v_bd else business_date end,
      cashier_name = coalesce(p->>'cashierName', cashier_name),
      notes = p->>'notes',
      version = version + 1,
      updated_at = now()
    where id = v_id;
  else
    insert into public.orders(id, order_number, order_type, table_id, table_number, customer_phone, delivery_address,
      items, subtotal, discount_percent, discount_amount, delivery_fee, total_amount, payment_status, payment_method,
      paid_at, cash_received, change_amount, status, shift_id, business_date, cashier_name, created_by, device_id,
      source, data_quality, notes, legacy_id, created_at, updated_at)
    values (v_id, coalesce(p->>'number', '?'), coalesce(p->>'type', 'dine_in'), v_table, coalesce(v_table, p->>'tableNumber'),
      p->>'customerPhone', p->>'deliveryAddress', v_items, (p->>'subtotal')::integer, (p->>'discountPercent')::integer,
      (p->>'discountAmount')::integer, (p->>'deliveryFee')::integer, coalesce((p->>'total')::integer, 0),
      coalesce(p->>'paymentStatus', 'unpaid'), p->>'paymentMethod', (p->>'paidAt')::timestamptz,
      (p->>'cashReceived')::integer, (p->>'changeAmount')::integer, v_status, v_shift, v_bd,
      p->>'cashierName', p_staff.id, p->>'deviceId', p_source,
      coalesce(array(select jsonb_array_elements_text(p->'dataQuality')), '{}'),
      p->>'notes', p->>'legacyId', v_created, now());
  end if;

  delete from public.order_items where order_id = v_id;
  for it in select * from jsonb_array_elements(v_items) loop
    pos := pos + 1;
    if coalesce((it->>'qty')::numeric, 0) > 0 then
      insert into public.order_items(order_id, position, menu_item_id, name_snapshot, category, unit_price, original_price,
        qty, weight_kg, price_per_kg, notes, garnish_mix, is_kitchen, line_total)
      values (v_id, pos, it->>'id', coalesce(it->>'name', '?'), it->>'category',
        round(coalesce((it->>'price')::numeric, 0))::integer, round((it->>'originalPrice')::numeric)::integer,
        (it->>'qty')::numeric, (it->>'weightKg')::numeric, round((it->>'pricePerKg')::numeric)::integer,
        it->>'notes', it->'garnishMix', (it->>'isKitchen')::boolean,
        round(coalesce((it->>'price')::numeric, 0) * (it->>'qty')::numeric)::integer);
    end if;
  end loop;

  -- аудит ручной цены (0010): ошибка аудита никогда не мешает записи заказа
  if not p_legacy then
    begin
      perform public._audit_price_overrides(v_id, case when cur.id is null then '[]'::jsonb else coalesce(cur.items, '[]'::jsonb) end, v_items, p_staff.id);
    exception when others then null;
    end;
  end if;

  insert into public.order_events(order_id, type, payload, staff_id)
  values (v_id, case when p_legacy then 'legacy_import' when cur.id is null then 'created' else 'updated' end,
          jsonb_build_object('status', v_status, 'total', p->>'total'), p_staff.id);

  return jsonb_build_object('id', v_id, 'status', v_status);
end $$;

revoke execute on function public._upsert_order(jsonb, public.staff, text, boolean) from public, anon, authenticated;
