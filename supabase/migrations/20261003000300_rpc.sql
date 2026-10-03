-- 0003 RPC: вся запись идёт через функции security definer с проверкой сессии.
-- PIN проверяется в БД (pgcrypto), клиенту выдаётся случайный токен; в БД хранится только его sha256.

create or replace function public._hash_token(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_token, 'sha256'), 'hex')
$$;

create or replace function public._session_staff(p_token text)
returns public.staff language plpgsql stable security definer set search_path = '' as $$
declare s public.staff;
begin
  select st.* into s
    from public.staff_sessions ss
    join public.staff st on st.id = ss.staff_id
   where ss.token_hash = public._hash_token(p_token)
     and ss.expires_at > now()
     and st.is_active;
  if not found then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  return s;
end $$;

create or replace function public._business_date(p_ts timestamptz)
returns date language sql immutable set search_path = '' as $$
  select (p_ts at time zone 'Asia/Samarkand')::date
$$;

create or replace function public._status_rank(p_status text)
returns integer language sql immutable set search_path = '' as $$
  select case p_status
    when 'open' then 0 when 'sent' then 1 when 'cooking' then 2 when 'ready' then 3
    when 'served' then 4 when 'completed' then 4 when 'cancelled' then 9 else 0 end
$$;

-- ── Вход по PIN ──────────────────────────────────────────────────────
create or replace function public.pos_login(p_pin text, p_device_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  s public.staff;
  fails integer;
  tok text;
  exp timestamptz := now() + interval '16 hours';
begin
  select count(*) into fails from public.login_attempts
   where device_id is not distinct from p_device_id and not success and at > now() - interval '5 minutes';
  if fails >= 5 then
    return jsonb_build_object('error', 'too_many_attempts');
  end if;

  select * into s from public.staff
   where is_active and pin_hash = extensions.crypt(coalesce(p_pin, ''), pin_hash)
   limit 1;

  insert into public.login_attempts(device_id, success) values (p_device_id, found);
  if s.id is null then
    -- не raise: иначе откатится запись о неудачной попытке и защита от перебора не сработает
    return jsonb_build_object('error', 'invalid_pin');
  end if;

  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.staff_sessions(token_hash, staff_id, device_id, expires_at)
  values (public._hash_token(tok), s.id, p_device_id, exp);
  delete from public.staff_sessions where expires_at < now() - interval '1 day';
  delete from public.login_attempts where at < now() - interval '7 days';

  return jsonb_build_object('token', tok, 'expires_at', exp,
    'staff', jsonb_build_object('id', s.id, 'name', s.name, 'role', s.role));
end $$;

create or replace function public.pos_logout(p_token text)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.staff_sessions where token_hash = public._hash_token(p_token)
$$;

-- ── Заказы ───────────────────────────────────────────────────────────
-- Полная запись заказа (заголовок + позиции). Статус кухни не откатывается назад:
-- берётся максимальный по прогрессии, кроме явной отмены или повторной отправки (resend).
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

  insert into public.order_events(order_id, type, payload, staff_id)
  values (v_id, case when p_legacy then 'legacy_import' when cur.id is null then 'created' else 'updated' end,
          jsonb_build_object('status', v_status, 'total', p->>'total'), p_staff.id);

  return jsonb_build_object('id', v_id, 'status', v_status);
end $$;

create or replace function public._upsert_shift(p jsonb, p_staff public.staff, p_legacy boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid := (p->>'id')::uuid;
  v_opened timestamptz := coalesce((p->>'openedAt')::timestamptz, now());
  v_num integer;
  cur public.shifts;
begin
  select * into cur from public.shifts where id = v_id for update;
  if found then
    if p_legacy then return jsonb_build_object('id', v_id, 'skipped', 'exists'); end if;
    if cur.status = 'closed' then return jsonb_build_object('id', v_id, 'status', 'closed'); end if;
    update public.shifts set
      closed_at = (p->>'closedAt')::timestamptz,
      counted_cash = (p->>'countedCash')::integer,
      status = coalesce(p->>'status', status),
      notes = p->>'notes',
      z_snapshot = case when p->>'status' = 'closed' then public._shift_summary(v_id) else z_snapshot end,
      version = version + 1,
      updated_at = now()
    where id = v_id;
  else
    v_num := coalesce((p->>'number')::integer, (select coalesce(max(number), 0) + 1 from public.shifts));
    insert into public.shifts(id, number, business_date, opened_at, closed_at, opened_by, cashier_name, initial_cash,
      counted_cash, status, notes, device_id, source, legacy_id, legacy_totals)
    values (v_id, v_num, public._business_date(v_opened), v_opened, (p->>'closedAt')::timestamptz,
      p_staff.id, coalesce(p->>'cashierName', p_staff.name), coalesce((p->>'initialCash')::integer, 0),
      (p->>'countedCash')::integer, coalesce(p->>'status', 'open'), p->>'notes', p->>'deviceId',
      case when p_legacy then 'legacy_rescue' else 'pos' end, p->>'legacyId', p->'legacyTotals');
    if p->>'status' = 'closed' and not p_legacy then
      update public.shifts set z_snapshot = public._shift_summary(v_id) where id = v_id;
    end if;
  end if;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public._upsert_menu_item(p jsonb, p_staff public.staff, p_source text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id text := p->>'id';
  old public.menu_items;
  v_cat text := nullif(p->>'categoryId', '');
begin
  if v_id is null then raise exception 'menu id required'; end if;
  if v_cat is not null and not exists (select 1 from public.categories where id = v_cat) then
    insert into public.categories(id, title_ru, sort_order) values (v_cat, coalesce(p->>'categoryTitle', v_cat), 99)
    on conflict (id) do nothing;
  end if;
  select * into old from public.menu_items where id = v_id for update;
  if found then
    update public.menu_items set
      category_id = coalesce(v_cat, category_id),
      name_ru = coalesce(p->>'nameRu', name_ru),
      name_uz = coalesce(p->>'nameUz', name_uz),
      name_en = coalesce(p->>'nameEn', name_en),
      description_ru = coalesce(p->>'descriptionRu', description_ru),
      price = coalesce((p->>'price')::integer, price),
      image_url = coalesce(p->>'imageUrl', image_url),
      available = coalesce((p->>'available')::boolean, available),
      weight = coalesce((p->>'weight')::integer, weight),
      kcal = coalesce((p->>'kcal')::integer, kcal),
      sort_order = coalesce((p->>'sortOrder')::integer, sort_order),
      is_kitchen = coalesce((p->>'isKitchen')::boolean, is_kitchen),
      unit = coalesce(p->>'unit', unit),
      price_per_kg = coalesce((p->>'pricePerKg')::integer, price_per_kg),
      is_deleted = coalesce((p->>'isDeleted')::boolean, is_deleted),
      needs_review = coalesce((p->>'needsReview')::boolean, needs_review),
      updated_at = now()
    where id = v_id;
  else
    insert into public.menu_items(id, category_id, name_ru, name_uz, name_en, description_ru, price, image_url, available,
      weight, kcal, sort_order, is_kitchen, unit, price_per_kg, is_deleted, needs_review)
    values (v_id, v_cat, coalesce(p->>'nameRu', v_id), p->>'nameUz', p->>'nameEn', p->>'descriptionRu',
      coalesce((p->>'price')::integer, 0), coalesce(p->>'imageUrl', ''), coalesce((p->>'available')::boolean, true),
      (p->>'weight')::integer, (p->>'kcal')::integer, coalesce((p->>'sortOrder')::integer, 0), (p->>'isKitchen')::boolean,
      coalesce(p->>'unit', 'portion'), (p->>'pricePerKg')::integer, coalesce((p->>'isDeleted')::boolean, false),
      coalesce((p->>'needsReview')::boolean, false));
  end if;
  insert into public.menu_item_history(menu_item_id, changed_by, source, old_values, new_values)
  values (v_id, p_staff.name, p_source, case when old.id is null then null else to_jsonb(old) end, p);
  return jsonb_build_object('id', v_id);
end $$;

-- Итоги смены считаются ТОЛЬКО на сервере из заказов.
create or replace function public._shift_summary(p_shift uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with s as (select * from public.shifts where id = p_shift),
  o as (
    select o.* from public.orders o, s
     where o.source <> 'dev_test'
       and (o.shift_id = s.id
            or (o.shift_id is null and o.created_at >= s.opened_at and o.created_at < coalesce(s.closed_at, now())))
  ),
  paid as (select * from o where payment_status = 'paid' and status <> 'cancelled'),
  items as (
    select oi.name_snapshot as name, sum(oi.qty) as qty, sum(oi.line_total) as revenue
      from public.order_items oi join paid on paid.id = oi.order_id
     group by oi.name_snapshot order by sum(oi.line_total) desc limit 15
  )
  select jsonb_build_object(
    'shift_id', (select id from s),
    'number', (select number from s),
    'cashier_name', (select cashier_name from s),
    'opened_at', (select opened_at from s),
    'closed_at', (select closed_at from s),
    'initial_cash', (select initial_cash from s),
    'counted_cash', (select counted_cash from s),
    'orders_count', (select count(*) from paid),
    'total_revenue', (select coalesce(sum(total_amount), 0) from paid),
    'cash_revenue', (select coalesce(sum(total_amount), 0) from paid where payment_method = 'cash'),
    'click_revenue', (select coalesce(sum(total_amount), 0) from paid where payment_method = 'click_payme'),
    'discount_total', (select coalesce(sum(coalesce(discount_amount, 0)), 0) from paid),
    'expected_cash', (select initial_cash from s) + (select coalesce(sum(total_amount), 0) from paid where payment_method = 'cash'),
    'dine_in', (select count(*) from paid where order_type = 'dine_in'),
    'takeaway', (select count(*) from paid where order_type = 'takeaway'),
    'delivery', (select count(*) from paid where order_type = 'delivery'),
    'cancelled_count', (select count(*) from o where status = 'cancelled'),
    'unpaid_open_count', (select count(*) from o where payment_status = 'unpaid' and status <> 'cancelled'),
    'top_items', coalesce((select jsonb_agg(items) from items), '[]'::jsonb),
    'quality', jsonb_build_object(
      'inferred_shift', (select count(*) from o where shift_id is null),
      'legacy_orders', (select count(*) from o where source = 'legacy_rescue'),
      'flagged_orders', (select count(*) from o where cardinality(data_quality) > 0)),
    'legacy_totals', (select legacy_totals from s),
    'computed_at', now())
$$;

-- ── Применение мутации (идемпотентно по mutation_id) ─────────────────
create or replace function public.pos_apply_mutation(p_token text, p_mutation_id uuid, p_kind text, p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  st public.staff := public._session_staff(p_token);
  prev jsonb;
  res jsonb;
begin
  select result into prev from public.applied_mutations where mutation_id = p_mutation_id;
  if found then
    return jsonb_build_object('duplicate', true, 'result', prev);
  end if;

  case p_kind
    when 'order.upsert' then
      res := public._upsert_order(p_payload, st, 'pos', false);
    when 'order.set_status' then
      update public.orders set status = p_payload->>'status', version = version + 1, updated_at = now()
       where id = (p_payload->>'id')::uuid and status <> 'cancelled';
      insert into public.order_events(order_id, type, payload, staff_id)
      select (p_payload->>'id')::uuid, 'status', p_payload, st.id
       where exists (select 1 from public.orders where id = (p_payload->>'id')::uuid);
      res := jsonb_build_object('id', p_payload->>'id');
    when 'shift.upsert' then
      res := public._upsert_shift(p_payload, st, false);
    when 'menu.upsert' then
      if st.role not in ('admin','cashier') then raise exception 'forbidden'; end if;
      res := public._upsert_menu_item(p_payload, st, 'pos');
    when 'legacy.order' then
      res := public._upsert_order(p_payload, st, 'legacy_rescue', true);
    when 'legacy.shift' then
      res := public._upsert_shift(p_payload, st, true);
    when 'legacy.menu' then
      res := public._upsert_menu_item(p_payload, st, 'legacy_rescue');
    else
      raise exception 'unknown mutation kind: %', p_kind;
  end case;

  insert into public.applied_mutations(mutation_id, kind, staff_id, result)
  values (p_mutation_id, p_kind, st.id, res);
  return jsonb_build_object('duplicate', false, 'result', res);
end $$;

-- ── Загрузка изменений (pull) ────────────────────────────────────────
create or replace function public.pos_pull(p_token text, p_since timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  st public.staff := public._session_staff(p_token);
  since timestamptz := coalesce(p_since, '-infinity'::timestamptz);
  horizon date := public._business_date(now()) - 2;
begin
  return jsonb_build_object(
    'server_time', now(),
    'staff', jsonb_build_object('id', st.id, 'name', st.name, 'role', st.role),
    'orders', coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at) from public.orders o
        where o.updated_at > since and o.source <> 'dev_test'
          and (o.business_date >= horizon or (o.payment_status = 'unpaid' and o.status not in ('cancelled')))), '[]'::jsonb),
    'shifts', coalesce((select jsonb_agg(to_jsonb(s) order by s.opened_at) from public.shifts s
        where s.updated_at > since and (s.business_date >= horizon - 30 or s.status = 'open')), '[]'::jsonb),
    'menu', coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order) from public.menu_items m
        where m.updated_at > since), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order) from public.categories c
        where c.updated_at > since), '[]'::jsonb),
    'tables', coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order) from public.dining_tables t), '[]'::jsonb)
  );
end $$;

-- ── Спасение данных старой версии ────────────────────────────────────
-- Сырой снимок localStorage. Доступно без PIN (чтобы бэкап ушёл как можно раньше),
-- только вставка, дедупликация по sha256, ограничение размера и частоты.
create or replace function public.rescue_store_snapshot(p_snapshot jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_sha text := p_snapshot->>'sha256';
  v_dev text := p_snapshot->>'deviceId';
  v_id uuid;
  v_size integer := octet_length(p_snapshot::text);
begin
  if v_sha is null or length(v_sha) <> 64 then raise exception 'sha256 required'; end if;
  if v_size > 25 * 1024 * 1024 then raise exception 'snapshot too large'; end if;
  select id into v_id from public.legacy_snapshots where sha256 = v_sha;
  if found then
    return jsonb_build_object('id', v_id, 'duplicate', true);
  end if;
  if (select count(*) from public.legacy_snapshots where device_id is not distinct from v_dev
        and received_at > now() - interval '1 day') >= 50 then
    raise exception 'rate_limited';
  end if;
  insert into public.legacy_snapshots(sha256, device_id, origin, user_agent, captured_at, key_count, size_bytes, raw)
  values (v_sha, v_dev, p_snapshot->>'origin', p_snapshot->>'userAgent', (p_snapshot->>'capturedAt')::timestamptz,
          (select count(*) from jsonb_object_keys(coalesce(p_snapshot->'keys', '{}'::jsonb))), v_size, p_snapshot)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'duplicate', false);
end $$;

create or replace function public.rescue_save_report(p_token text, p_sha256 text, p_report jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
begin
  update public.legacy_snapshots set import_report = p_report || jsonb_build_object('by', st.name, 'at', now())
   where sha256 = p_sha256;
end $$;

-- Сверка: что реально лежит на сервере по legacy-заказам, по дням.
create or replace function public.rescue_verify(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
begin
  return jsonb_build_object(
    'orders_by_day', coalesce((select jsonb_object_agg(d, jsonb_build_object('count', c, 'total', t)) from (
        select business_date::text d, count(*) c, sum(total_amount) t
          from public.orders where source = 'legacy_rescue' group by business_date) x), '{}'::jsonb),
    'orders', (select count(*) from public.orders where source = 'legacy_rescue'),
    'shifts', (select count(*) from public.shifts where source = 'legacy_rescue'));
end $$;
