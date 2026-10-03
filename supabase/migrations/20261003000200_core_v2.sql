-- 0002 core v2: только добавления (новые таблицы, новые колонки, индексы).
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── Меню ──────────────────────────────────────────────────────────────
alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.categories add column if not exists updated_at timestamptz not null default now();

alter table public.menu_items add column if not exists is_kitchen boolean;
alter table public.menu_items add column if not exists unit text not null default 'portion';
alter table public.menu_items add column if not exists price_per_kg integer;
alter table public.menu_items add column if not exists is_deleted boolean not null default false;
alter table public.menu_items add column if not exists needs_review boolean not null default false;
alter table public.menu_items add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_menu_items_category on public.menu_items(category_id);

create table if not exists public.menu_item_history (
  id bigint generated always as identity primary key,
  menu_item_id text not null,
  changed_at timestamptz not null default now(),
  changed_by text,
  source text not null default 'pos',
  old_values jsonb,
  new_values jsonb
);
create index if not exists idx_menu_item_history_item on public.menu_item_history(menu_item_id, changed_at desc);

-- ── Столы и персонал ─────────────────────────────────────────────────
create table if not exists public.dining_tables (
  id text primary key,
  name text not null,
  zone text not null,
  capacity integer not null default 4,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('admin','cashier','kitchen')),
  pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_sessions (
  token_hash text primary key,
  staff_id uuid not null references public.staff(id) on delete cascade,
  device_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_staff_sessions_staff on public.staff_sessions(staff_id);

create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  device_id text,
  success boolean not null,
  at timestamptz not null default now()
);
create index if not exists idx_login_attempts_device on public.login_attempts(device_id, at desc);

-- ── Смены ────────────────────────────────────────────────────────────
create table if not exists public.shifts (
  id uuid primary key,
  number integer not null,
  business_date date not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  opened_by uuid references public.staff(id),
  cashier_name text not null,
  initial_cash integer not null default 0,
  counted_cash integer,
  status text not null default 'open' check (status in ('open','closed')),
  notes text,
  z_snapshot jsonb,
  device_id text,
  source text not null default 'pos' check (source in ('pos','legacy_rescue')),
  legacy_id text unique,
  legacy_totals jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create index if not exists idx_shifts_opened on public.shifts(opened_at desc);

-- ── Заказы ───────────────────────────────────────────────────────────
alter table public.orders add column if not exists business_date date;
alter table public.orders add column if not exists shift_id uuid references public.shifts(id);
alter table public.orders add column if not exists table_id text references public.dining_tables(id);
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists subtotal integer;
alter table public.orders add column if not exists discount_percent integer;
alter table public.orders add column if not exists discount_amount integer;
alter table public.orders add column if not exists delivery_fee integer;
alter table public.orders add column if not exists cashier_name text;
alter table public.orders add column if not exists created_by uuid references public.staff(id);
alter table public.orders add column if not exists device_id text;
alter table public.orders add column if not exists source text not null default 'pos';
alter table public.orders add column if not exists data_quality text[] not null default '{}';
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists version integer not null default 1;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists legacy_id text;

-- legacy_id уникален (идемпотентный импорт)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_legacy_id_key') then
    alter table public.orders add constraint orders_legacy_id_key unique (legacy_id);
  end if;
end $$;

-- Статусы v2. Старые 'completed'/'cancelled' остаются допустимыми.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('open','sent','cooking','ready','served','completed','cancelled'));
alter table public.orders alter column status set default 'open';

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid','paid'));

alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders add constraint orders_source_check
  check (source in ('pos','legacy_rescue','dev_test'));

-- Неоплаченный открытый заказ ещё не имеет способа оплаты.
alter table public.orders alter column payment_method drop not null;
alter table public.orders alter column items set default '[]'::jsonb;
alter table public.orders alter column total_amount set default 0;

-- Существующие строки: completed = оплачено.
update public.orders
   set payment_status = 'paid',
       paid_at = coalesce(paid_at, created_at),
       business_date = coalesce(business_date, (created_at at time zone 'Asia/Samarkand')::date)
 where status = 'completed' and payment_status = 'unpaid';
update public.orders
   set business_date = (created_at at time zone 'Asia/Samarkand')::date
 where business_date is null;

create index if not exists idx_orders_business_date on public.orders(business_date);
create index if not exists idx_orders_shift on public.orders(shift_id);
create index if not exists idx_orders_updated on public.orders(updated_at);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_table on public.orders(table_id);
create index if not exists idx_orders_created_by on public.orders(created_by);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  position integer not null default 0,
  menu_item_id text,
  name_snapshot text not null,
  category text,
  unit_price integer not null,
  original_price integer,
  qty numeric(10,3) not null check (qty > 0),
  weight_kg numeric(10,3),
  price_per_kg integer,
  notes text,
  garnish_mix jsonb,
  is_kitchen boolean,
  line_total integer not null
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_menu on public.order_items(menu_item_id);

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null,
  payload jsonb,
  staff_id uuid references public.staff(id),
  at timestamptz not null default now()
);
create index if not exists idx_order_events_order on public.order_events(order_id);
create index if not exists idx_order_events_staff on public.order_events(staff_id);

-- ── Синхронизация и спасение данных ──────────────────────────────────
create table if not exists public.applied_mutations (
  mutation_id uuid primary key,
  kind text not null,
  staff_id uuid,
  applied_at timestamptz not null default now(),
  result jsonb
);

create table if not exists public.legacy_snapshots (
  id uuid primary key default gen_random_uuid(),
  sha256 text not null unique,
  device_id text,
  origin text,
  user_agent text,
  captured_at timestamptz,
  received_at timestamptz not null default now(),
  key_count integer,
  size_bytes integer,
  raw jsonb not null,
  import_report jsonb
);

-- RLS на всех новых таблицах (по умолчанию — запрет; доступ только через RPC)
alter table public.menu_item_history enable row level security;
alter table public.dining_tables enable row level security;
alter table public.staff enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.login_attempts enable row level security;
alter table public.shifts enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.applied_mutations enable row level security;
alter table public.legacy_snapshots enable row level security;
