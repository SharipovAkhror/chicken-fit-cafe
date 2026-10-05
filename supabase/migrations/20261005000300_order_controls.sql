-- 0013 Управление столами и заказами (аддитивно, идемпотентно). Closes #10, #12, часть #9.
--  * orders.precheck_at — «Счёт выдан» синхронизируется между устройствами (#12). Старые клиенты поле не шлют — значение не трогается.
--  * Отмена заказа — мутация order.cancel с причиной и аудитом (order_events 'cancelled'/'merged').
--    Кассир сам отменяет только заказ, который не уходил на кухню и по которому не печатали счёт;
--    иначе нужен администратор (вход админа или подтверждение PIN-кодом админа — pos_manager_approve).
--    Та же проверка — в order.upsert (старый путь отмены), кроме импорта старой кассы.
--  * Объединение столов (#9): order.cancel с mergedInto — исходный заказ отменяется с причиной, позиции уже в целевом.
--  * Возобновление оплаченного заказа (#10) — pos_reopen_order, только онлайн:
--      - только админ или кассир с подтверждением PIN админа; только пока открыта смена этого заказа;
--      - оплата сторнируется: заказ снова «не оплачен», прежние сумма/способ сохраняются в reopen_paid_*
--        и в событии 'reopened' (аудит); при повторной оплате касса просит только разницу;
--      - защита от двойной оплаты: у заказа всегда одна действующая оплата; обычная запись (order.upsert)
--        не может снять оплату и не может применить «запоздалую» оплату, сделанную до возобновления.

alter table public.orders add column if not exists precheck_at timestamptz;
alter table public.orders add column if not exists reopened_at timestamptz;
alter table public.orders add column if not exists reopen_paid_amount integer;
alter table public.orders add column if not exists reopen_paid_method text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_reopen_paid') then
    alter table public.orders add constraint orders_reopen_paid check ((reopen_paid_amount is null or reopen_paid_amount >= 0)
      and (reopen_paid_method is null or reopen_paid_method in ('cash', 'click_payme')));
  end if;
end $$;

create table if not exists public.manager_approvals (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('cancel', 'reopen')),
  order_id uuid not null,
  approver_id uuid not null references public.staff(id) on delete cascade,
  requested_by uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.manager_approvals enable row level security;
revoke all on public.manager_approvals from anon, authenticated;

-- подтверждение действия PIN-кодом администратора (кассир просит админа ввести PIN на своём экране)
create or replace function public.pos_manager_approve(p_token text, p_pin text, p_action text, p_order_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  st public.staff := public._session_staff(p_token);
  a public.staff;
  fails integer;
  v_id uuid;
  v_dev text := 'approve:' || st.id::text;
begin
  if p_action not in ('cancel', 'reopen') or p_order_id is null then raise exception 'invalid action' using errcode = '22023'; end if;
  select count(*) into fails from public.login_attempts where device_id = v_dev and not success and at > now() - interval '5 minutes';
  if fails >= 5 then return jsonb_build_object('error', 'too_many_attempts'); end if;
  select * into a from public.staff
   where is_active and role = 'admin' and (not is_test or st.is_test) and pin_hash = extensions.crypt(coalesce(p_pin, ''), pin_hash) limit 1;
  insert into public.login_attempts(device_id, success) values (v_dev, a.id is not null);
  if a.id is null then return jsonb_build_object('error', 'invalid_pin'); end if;
  insert into public.manager_approvals(action, order_id, approver_id, requested_by) values (p_action, p_order_id, a.id, st.id) returning id into v_id;
  return jsonb_build_object('approval_id', v_id, 'approver', a.name);
end $$;

create or replace function public._use_approval(p_id uuid, p_action text, p_order uuid)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare v uuid;
begin
  if p_id is null then return null; end if;
  update public.manager_approvals set used_at = now()
   where id = p_id and action = p_action and order_id = p_order and used_at is null and created_at > now() - interval '15 minutes'
  returning approver_id into v;
  return v;
end $$;

-- запись заказа (как 0010) + precheck_at, защита оплаты и проверка права на отмену
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
  v_pay text := coalesce(p->>'paymentStatus', 'unpaid');
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
    -- оплату нельзя снять обычной записью (только pos_reopen_order): устаревшая копия с другого устройства игнорируется
    if cur.payment_status = 'paid' and v_pay <> 'paid' then
      return jsonb_build_object('id', v_id, 'ignored', 'paid', 'status', cur.status);
    end if;
    -- оплата, сделанная до возобновления заказа, повторно не применяется: клиент, который видел возобновление,
    -- возвращает reopenedAt (без сравнения часов устройства и сервера)
    if cur.payment_status = 'unpaid' and v_pay = 'paid' and cur.reopened_at is not null
       and nullif(p->>'reopenedAt', '')::timestamptz is distinct from cur.reopened_at then
      return jsonb_build_object('id', v_id, 'ignored', 'stale_payment', 'status', cur.status);
    end if;
    if cur.status = 'cancelled' and v_status <> 'cancelled' then
      v_status := 'cancelled';
    elsif v_status <> 'cancelled' and not coalesce((p->>'resend')::boolean, false)
          and public._status_rank(cur.status) > public._status_rank(v_status) then
      v_status := cur.status;
    end if;
    -- отмена отправленного на кухню или по счёту — только админ (кассир — через order.cancel с подтверждением)
    if v_status = 'cancelled' and cur.status <> 'cancelled' and p_staff.role <> 'admin'
       and (cur.status <> 'open' or cur.precheck_at is not null) then
      raise exception 'manager_required' using errcode = '42501';
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
      paid_at = coalesce((p->>'paidAt')::timestamptz, paid_at, case when coalesce(p->>'paymentStatus', payment_status) = 'paid' then now() end),
      cash_received = (p->>'cashReceived')::integer,
      change_amount = (p->>'changeAmount')::integer,
      status = v_status,
      shift_id = coalesce(v_shift, shift_id),
      business_date = case when v_shift is not null then v_bd else business_date end,
      cashier_name = coalesce(p->>'cashierName', cashier_name),
      notes = p->>'notes',
      precheck_at = case when p ? 'precheckAt' then nullif(p->>'precheckAt', '')::timestamptz else precheck_at end,
      version = version + 1,
      updated_at = now()
    where id = v_id;
  else
    insert into public.orders(id, order_number, order_type, table_id, table_number, customer_phone, delivery_address,
      items, subtotal, discount_percent, discount_amount, delivery_fee, total_amount, payment_status, payment_method,
      paid_at, cash_received, change_amount, status, shift_id, business_date, cashier_name, created_by, device_id,
      source, data_quality, notes, legacy_id, precheck_at, created_at, updated_at)
    values (v_id, coalesce(p->>'number', '?'), coalesce(p->>'type', 'dine_in'), v_table, coalesce(v_table, p->>'tableNumber'),
      p->>'customerPhone', p->>'deliveryAddress', v_items, (p->>'subtotal')::integer, (p->>'discountPercent')::integer,
      (p->>'discountAmount')::integer, (p->>'deliveryFee')::integer, coalesce((p->>'total')::integer, 0),
      coalesce(p->>'paymentStatus', 'unpaid'), p->>'paymentMethod',
      coalesce((p->>'paidAt')::timestamptz, case when p->>'paymentStatus' = 'paid' then v_created end), -- 0011: paid ⇒ paid_at
      (p->>'cashReceived')::integer, (p->>'changeAmount')::integer, v_status, v_shift, v_bd,
      p->>'cashierName', p_staff.id, p->>'deviceId', p_source,
      coalesce(array(select jsonb_array_elements_text(p->'dataQuality')), '{}'),
      p->>'notes', p->>'legacyId', nullif(p->>'precheckAt', '')::timestamptz, v_created, now());
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

-- отмена / объединение
create or replace function public._cancel_order(p jsonb, p_staff public.staff)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  cur public.orders;
  v_reason text := left(btrim(coalesce(p->>'reason', '')), 200);
  v_into uuid := nullif(p->>'mergedInto', '')::uuid;
  v_appr uuid;
begin
  if v_reason = '' then raise exception 'reason_required' using errcode = '22023'; end if;
  select * into cur from public.orders where id = (p->>'id')::uuid for update;
  if not found then raise exception 'order_not_found' using errcode = '22023'; end if;
  if p_staff.is_test and cur.source <> 'dev_test' then raise exception 'forbidden' using errcode = '42501'; end if;
  if cur.status = 'cancelled' then return jsonb_build_object('id', cur.id, 'status', 'cancelled', 'already', true); end if;
  if cur.payment_status = 'paid' then raise exception 'paid_order' using errcode = '22023'; end if;
  if v_into is not null then
    if not exists (select 1 from public.orders where id = v_into and id <> cur.id and status <> 'cancelled' and payment_status = 'unpaid') then
      raise exception 'merge_target_invalid' using errcode = '22023';
    end if;
  elsif p_staff.role <> 'admin' and (cur.status <> 'open' or cur.precheck_at is not null) then
    v_appr := public._use_approval(nullif(p->>'approvalId', '')::uuid, 'cancel', cur.id);
    if v_appr is null then raise exception 'manager_required' using errcode = '42501'; end if;
  end if;
  update public.orders set status = 'cancelled',
    notes = left(concat_ws(E'\n', nullif(notes, ''), case when v_into is null then 'Отмена: ' else 'Объединён: ' end || v_reason), 2000),
    version = version + 1, updated_at = now()
  where id = cur.id;
  insert into public.order_events(order_id, type, payload, staff_id)
  values (cur.id, case when v_into is null then 'cancelled' else 'merged' end,
    jsonb_strip_nulls(jsonb_build_object('reason', v_reason, 'from_status', cur.status, 'total', cur.total_amount,
      'approved_by', v_appr, 'merged_into', v_into)), p_staff.id);
  return jsonb_build_object('id', cur.id, 'status', 'cancelled');
end $$;

-- возобновление оплаченного заказа (только онлайн, сразу возвращает строку заказа)
create or replace function public.pos_reopen_order(p_token text, p_order_id uuid, p_reason text, p_approval uuid default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  st public.staff := public._session_staff(p_token);
  cur public.orders;
  v_reason text := left(btrim(coalesce(p_reason, '')), 200);
  v_appr uuid;
  res public.orders;
begin
  if v_reason = '' then return jsonb_build_object('error', 'reason_required'); end if;
  select * into cur from public.orders where id = p_order_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if st.is_test and cur.source <> 'dev_test' then return jsonb_build_object('error', 'forbidden'); end if;
  if cur.payment_status <> 'paid' or cur.status = 'cancelled' then return jsonb_build_object('error', 'not_paid'); end if;
  if cur.shift_id is null or not exists (select 1 from public.shifts where id = cur.shift_id and status = 'open') then
    return jsonb_build_object('error', 'shift_closed');
  end if;
  if st.role not in ('admin', 'cashier') then return jsonb_build_object('error', 'forbidden'); end if;
  if st.role <> 'admin' then
    v_appr := public._use_approval(p_approval, 'reopen', cur.id);
    if v_appr is null then return jsonb_build_object('error', 'manager_required'); end if;
  end if;
  update public.orders set payment_status = 'unpaid', paid_at = null, payment_method = null, cash_received = null, change_amount = null,
    status = 'open', precheck_at = null, reopened_at = now(), reopen_paid_amount = cur.total_amount, reopen_paid_method = cur.payment_method,
    version = version + 1, updated_at = now()
  where id = cur.id returning * into res;
  insert into public.order_events(order_id, type, payload, staff_id)
  values (cur.id, 'reopened', jsonb_strip_nulls(jsonb_build_object('reason', v_reason, 'amount', cur.total_amount, 'method', cur.payment_method,
    'paid_at', cur.paid_at, 'approved_by', v_appr)), st.id);
  return jsonb_build_object('order', to_jsonb(res));
end $$;

-- pos_apply_mutation (как 0008) + order.cancel
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

  if st.is_test and p_kind not in ('order.upsert', 'order.set_status', 'order.cancel', 'shift.upsert') then
    raise exception 'forbidden for test staff';
  end if;

  case p_kind
    when 'order.upsert' then
      res := public._upsert_order(p_payload, st, case when st.is_test then 'dev_test' else 'pos' end, false);
    when 'order.cancel' then
      res := public._cancel_order(p_payload, st);
    when 'order.set_status' then
      update public.orders set status = p_payload->>'status', version = version + 1, updated_at = now()
       where id = (p_payload->>'id')::uuid and status <> 'cancelled' and (not st.is_test or source = 'dev_test')
         and p_payload->>'status' <> 'cancelled';
      insert into public.order_events(order_id, type, payload, staff_id)
      select (p_payload->>'id')::uuid, 'status', p_payload, st.id
       where exists (select 1 from public.orders where id = (p_payload->>'id')::uuid);
      res := jsonb_build_object('id', p_payload->>'id');
    when 'shift.upsert' then
      res := public._upsert_shift(p_payload, st, false);
      if st.is_test then
        update public.shifts set source = 'dev_test' where id = (p_payload->>'id')::uuid and source = 'pos';
      end if;
    when 'table.upsert' then
      if st.role <> 'admin' then raise exception 'forbidden'; end if;
      res := public._upsert_table(p_payload);
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

revoke execute on function public._upsert_order(jsonb, public.staff, text, boolean) from public, anon, authenticated;
revoke execute on function public._cancel_order(jsonb, public.staff) from public, anon, authenticated;
revoke execute on function public._use_approval(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.pos_manager_approve(text, text, text, uuid) from public;
revoke execute on function public.pos_reopen_order(text, uuid, text, uuid) from public;
grant execute on function public.pos_manager_approve(text, text, text, uuid) to anon, authenticated;
grant execute on function public.pos_reopen_order(text, uuid, text, uuid) to anon, authenticated;
grant execute on function public.pos_apply_mutation(text, uuid, text, jsonb) to anon, authenticated;
