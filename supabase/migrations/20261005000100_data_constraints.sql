-- 0011 Гигиена данных под бесплатный план Supabase (500 МБ БД, 1 ГБ Storage): аддитивно и идемпотентно.
--  * CHECK-ограничения на длины текстов, диапазоны сумм и размер JSON — добавляются NOT VALID, затем VALIDATE
--    (данные прода проверены 05.10.2026: нарушений нет). Строки с base64-картинками и «раздутым» JSON в базу не попадут.
--  * orders.status — NOT NULL (null-ов нет).
--  * housekeeping(): ротация служебных журналов (сессии, попытки входа, журнал идемпотентности, история меню),
--    не чаще раза в 6 часов; вызывается из /api/keepalive (GitHub Actions раз в 2 дня) — pg_cron не нужен.
--    Заказы, события заказов (аудит) и снимки старой кассы не удаляются.

do $$
declare c record;
begin
  for c in select * from (values
    -- меню
    ('menu_items', 'menu_items_name_len', 'check (char_length(btrim(name_ru)) between 1 and 80 and coalesce(char_length(name_uz), 0) <= 80 and coalesce(char_length(name_en), 0) <= 80)'),
    ('menu_items', 'menu_items_price_range', 'check (price between 0 and 50000000 and (price_per_kg is null or price_per_kg between 0 and 50000000))'),
    ('menu_items', 'menu_items_image_url', 'check (image_url is null or (char_length(image_url) <= 500 and image_url !~* ''^data:''))'),
    ('menu_items', 'menu_items_desc_len', 'check (coalesce(char_length(description_ru), 0) <= 1000 and coalesce(char_length(description_uz), 0) <= 1000 and coalesce(char_length(description_en), 0) <= 1000)'),
    ('menu_items', 'menu_items_numbers', 'check ((weight is null or weight between 0 and 100000) and (kcal is null or kcal between 0 and 10000))'),
    ('menu_items', 'menu_items_options_size', 'check (options is null or octet_length(options::text) <= 4096)'),
    ('menu_items', 'menu_items_unit', 'check (unit in (''portion'', ''kg''))'),
    ('categories', 'categories_title_len', 'check (char_length(btrim(title_ru)) between 1 and 60 and char_length(id) <= 64 and coalesce(char_length(title_uz), 0) <= 60 and coalesce(char_length(title_en), 0) <= 60)'),
    -- столы
    ('dining_tables', 'dining_tables_text_len', 'check (char_length(id) <= 32 and char_length(btrim(name)) between 1 and 40 and char_length(btrim(zone)) between 1 and 40)'),
    ('dining_tables', 'dining_tables_capacity', 'check (capacity between 1 and 100)'),
    -- заказы
    ('orders', 'orders_amounts', 'check (total_amount between 0 and 1000000000 and coalesce(subtotal, 0) >= 0 and coalesce(discount_amount, 0) >= 0 and coalesce(delivery_fee, 0) >= 0 and coalesce(cash_received, 0) >= 0 and coalesce(change_amount, 0) >= 0)'),
    ('orders', 'orders_discount_pct', 'check (discount_percent is null or discount_percent between 0 and 100)'),
    ('orders', 'orders_text_len', 'check (char_length(order_number) <= 16 and coalesce(char_length(notes), 0) <= 2000 and coalesce(char_length(customer_phone), 0) <= 32 and coalesce(char_length(delivery_address), 0) <= 300 and coalesce(char_length(cashier_name), 0) <= 80)'),
    ('orders', 'orders_items_json', 'check (jsonb_typeof(items) = ''array'' and octet_length(items::text) <= 65536)'),
    ('orders', 'orders_paid_at', 'check (payment_status <> ''paid'' or paid_at is not null)'),
    ('order_items', 'order_items_amounts', 'check (unit_price >= 0 and line_total >= 0 and qty <= 10000 and (weight_kg is null or (weight_kg > 0 and weight_kg <= 100)))'),
    ('order_items', 'order_items_text_len', 'check (char_length(name_snapshot) <= 200 and coalesce(char_length(notes), 0) <= 500)'),
    ('order_events', 'order_events_payload_size', 'check (char_length(type) <= 32 and (payload is null or octet_length(payload::text) <= 16384))'),
    -- смены
    ('shifts', 'shifts_amounts', 'check (initial_cash >= 0 and (counted_cash is null or counted_cash >= 0) and coalesce(char_length(notes), 0) <= 2000)')
  ) v(tbl, name, def) loop
    if not exists (select 1 from pg_constraint where conname = c.name and conrelid = format('public.%I', c.tbl)::regclass) then
      execute format('alter table public.%I add constraint %I %s not valid', c.tbl, c.name, c.def);
    end if;
    execute format('alter table public.%I validate constraint %I', c.tbl, c.name);
  end loop;
end $$;

alter table public.orders alter column status set default 'open';
alter table public.orders alter column status set not null;

-- служебные метки (последний запуск housekeeping и т.п.); клиенту недоступна
create table if not exists public.app_meta (
  key text primary key check (char_length(key) <= 64),
  value jsonb check (value is null or octet_length(value::text) <= 4096),
  updated_at timestamptz not null default now()
);
alter table public.app_meta enable row level security;
revoke all on public.app_meta from anon, authenticated;

create or replace function public.housekeeping()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r jsonb := '{}'::jsonb; n integer;
begin
  if exists (select 1 from public.app_meta where key = 'housekeeping' and updated_at > now() - interval '6 hours') then
    return jsonb_build_object('skipped', true);
  end if;
  delete from public.staff_sessions where expires_at < now() - interval '7 days';
  get diagnostics n = row_count; r := r || jsonb_build_object('sessions', n);
  delete from public.login_attempts where at < now() - interval '30 days';
  get diagnostics n = row_count; r := r || jsonb_build_object('login_attempts', n);
  -- журнал идемпотентности: повтор мутации старше 60 дней невозможен (очередь устройства шлёт за секунды–часы)
  delete from public.applied_mutations where applied_at < now() - interval '60 days';
  get diagnostics n = row_count; r := r || jsonb_build_object('applied_mutations', n);
  delete from public.menu_item_history where changed_at < now() - interval '365 days';
  get diagnostics n = row_count; r := r || jsonb_build_object('menu_item_history', n);
  if to_regclass('public.photo_tickets') is not null then
    execute 'delete from public.photo_tickets where expires_at < now() - interval ''1 day''';
    get diagnostics n = row_count; r := r || jsonb_build_object('photo_tickets', n);
  end if;
  if to_regclass('public.manager_approvals') is not null then
    execute 'delete from public.manager_approvals where created_at < now() - interval ''90 days''';
    get diagnostics n = row_count; r := r || jsonb_build_object('manager_approvals', n);
  end if;
  insert into public.app_meta(key, value, updated_at) values ('housekeeping', r, now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  return r;
end $$;

revoke execute on function public.housekeeping() from public;
grant execute on function public.housekeeping() to anon, authenticated;
