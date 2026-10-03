-- 0001 baseline: фиксирует схему, которая уже существует в проекте chickenfit
-- (создавалась вручную через SQL Editor). На живой БД ничего не меняет.

create table if not exists public.categories (
  id text primary key,
  title_ru text not null,
  title_uz text,
  title_en text,
  sort_order integer default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.menu_items (
  id text primary key,
  category_id text references public.categories(id) on delete set null,
  name_ru text not null,
  name_uz text,
  name_en text,
  description_ru text,
  description_uz text,
  description_en text,
  price integer not null check (price >= 0),
  image_url text default ''::text,
  available boolean not null default true,
  weight integer,
  kcal integer,
  sort_order integer default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  order_type text not null check (order_type = any (array['dine_in','takeaway','delivery'])),
  table_number text,
  customer_phone text,
  delivery_address text,
  items jsonb not null,
  total_amount integer not null,
  payment_method text not null check (payment_method = any (array['cash','click_payme'])),
  cash_received integer,
  change_amount integer,
  status text default 'completed' constraint orders_status_check check (status = any (array['completed','cancelled'])),
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
