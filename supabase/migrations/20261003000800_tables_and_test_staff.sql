-- 0008 Управление столами (table.upsert, только admin) и тестовый персонал (staff.is_test):
-- всё, что создаёт тестовый сотрудник, получает source='dev_test' и не попадает в отчёты, в pull реальных
-- сессий и в итоги реальных смен. Аддитивно и идемпотентно.

alter table public.staff add column if not exists is_test boolean not null default false;

alter table public.shifts drop constraint if exists shifts_source_check;
alter table public.shifts add constraint shifts_source_check check (source in ('pos','legacy_rescue','dev_test'));

create or replace function public._upsert_table(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_id text := nullif(trim(p->>'id'), '');
begin
  if v_id is null then raise exception 'table id required'; end if;
  insert into public.dining_tables(id, name, zone, capacity, sort_order, is_active)
  values (v_id, coalesce(nullif(trim(p->>'name'), ''), 'Стол ' || v_id), coalesce(nullif(trim(p->>'zone'), ''), '1 этаж'),
          coalesce((p->>'capacity')::integer, 4), coalesce((p->>'sortOrder')::integer, 99), coalesce((p->>'isActive')::boolean, true))
  on conflict (id) do update set
    name = coalesce(nullif(trim(p->>'name'), ''), public.dining_tables.name),
    zone = coalesce(nullif(trim(p->>'zone'), ''), public.dining_tables.zone),
    capacity = coalesce((p->>'capacity')::integer, public.dining_tables.capacity),
    sort_order = coalesce((p->>'sortOrder')::integer, public.dining_tables.sort_order),
    is_active = coalesce((p->>'isActive')::boolean, public.dining_tables.is_active);
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public._shift_summary(p_shift uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with s as (select * from public.shifts where id = p_shift),
  o as (
    select o.* from public.orders o, s
     where (o.source <> 'dev_test' or s.source = 'dev_test')
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

  if st.is_test and p_kind not in ('order.upsert', 'order.set_status', 'shift.upsert') then
    raise exception 'forbidden for test staff';
  end if;

  case p_kind
    when 'order.upsert' then
      res := public._upsert_order(p_payload, st, case when st.is_test then 'dev_test' else 'pos' end, false);
    when 'order.set_status' then
      update public.orders set status = p_payload->>'status', version = version + 1, updated_at = now()
       where id = (p_payload->>'id')::uuid and status <> 'cancelled' and (not st.is_test or source = 'dev_test');
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
        where o.updated_at > since and (o.source <> 'dev_test' or st.is_test)
          and (o.business_date >= horizon or (o.payment_status = 'unpaid' and o.status not in ('cancelled')))), '[]'::jsonb),
    'shifts', coalesce((select jsonb_agg(to_jsonb(s) order by s.opened_at) from public.shifts s
        where s.updated_at > since and (s.source <> 'dev_test' or st.is_test)
          and (s.business_date >= horizon - 30 or s.status = 'open')), '[]'::jsonb),
    'menu', coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order) from public.menu_items m
        where m.updated_at > since), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order) from public.categories c
        where c.updated_at > since), '[]'::jsonb),
    'tables', coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order) from public.dining_tables t where t.is_active), '[]'::jsonb)
  );
end $$;

revoke execute on function public._upsert_table(jsonb) from public, anon, authenticated;
revoke execute on function public._shift_summary(uuid) from public, anon, authenticated;
grant execute on function public.pos_apply_mutation(text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.pos_pull(text, timestamptz) to anon, authenticated;
