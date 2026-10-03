-- 0004 Отчёты: считаются только на сервере, с флагами качества данных.

create or replace function public.report_shift(p_token text, p_shift_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
begin
  return public._shift_summary(p_shift_id);
end $$;

create or replace function public.report_sales(p_token text, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
begin
  return (
    with o as (
      select * from public.orders
       where source <> 'dev_test' and business_date between p_from and p_to
    ),
    paid as (select * from o where payment_status = 'paid' and status <> 'cancelled'),
    lines as (
      select oi.*, paid.total_amount, coalesce(paid.delivery_fee, 0) as delivery_fee,
             sum(oi.line_total) over (partition by oi.order_id) as order_lines
        from public.order_items oi join paid on paid.id = oi.order_id
    ),
    by_item as (
      select name_snapshot as name, sum(qty) as qty, sum(line_total) as gross,
             sum(case when order_lines > 0
                      then round(line_total::numeric * (total_amount - delivery_fee) / order_lines)
                      else 0 end)::bigint as net
        from lines group by name_snapshot
    )
    select jsonb_build_object(
      'from', p_from, 'to', p_to,
      'totals', jsonb_build_object(
        'orders', (select count(*) from paid),
        'revenue', (select coalesce(sum(total_amount), 0) from paid),
        'cash', (select coalesce(sum(total_amount), 0) from paid where payment_method = 'cash'),
        'click', (select coalesce(sum(total_amount), 0) from paid where payment_method = 'click_payme'),
        'discounts', (select coalesce(sum(coalesce(discount_amount, 0)), 0) from paid),
        'cancelled', (select count(*) from o where status = 'cancelled'),
        'unpaid_open', (select count(*) from o where payment_status = 'unpaid' and status <> 'cancelled')),
      'by_day', coalesce((select jsonb_agg(x order by x.day) from (
          select business_date as day, count(*) as orders, sum(total_amount) as revenue,
                 sum(total_amount) filter (where payment_method = 'cash') as cash,
                 sum(total_amount) filter (where payment_method = 'click_payme') as click,
                 count(*) filter (where source = 'legacy_rescue') as legacy_orders,
                 count(*) filter (where cardinality(data_quality) > 0) as flagged_orders
            from paid group by business_date) x), '[]'::jsonb),
      'by_item', coalesce((select jsonb_agg(i order by i.net desc) from by_item i), '[]'::jsonb),
      'by_cashier', coalesce((select jsonb_agg(c order by c.revenue desc) from (
          select coalesce(cashier_name, 'неизвестен') as cashier, count(*) as orders, sum(total_amount) as revenue
            from paid group by coalesce(cashier_name, 'неизвестен')) c), '[]'::jsonb),
      'quality', jsonb_build_object(
        'legacy_orders', (select count(*) from paid where source = 'legacy_rescue'),
        'flagged_orders', (select count(*) from paid where cardinality(data_quality) > 0),
        'flags', coalesce((select jsonb_object_agg(f, n) from (
            select unnest(data_quality) f, count(*) n from paid group by 1) q), '{}'::jsonb),
        'unknown_cashier', (select count(*) from paid where cashier_name is null),
        'earliest_legacy_day', (select min(business_date) from public.orders where source = 'legacy_rescue'),
        'earliest_any_day', (select min(business_date) from public.orders where source <> 'dev_test')))
  );
end $$;
