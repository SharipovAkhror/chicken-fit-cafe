-- Воспроизводит текущее состояние прода chickenfit (03.10.2026): 3 таблицы, открытые политики, тестовые данные.
create schema if not exists extensions; create extension if not exists pgcrypto with schema extensions; -- как в проде
create table public.categories (id text primary key, title_ru text not null, title_uz text, title_en text,
  sort_order integer default 0, created_at timestamptz not null default timezone('utc'::text, now()));
create table public.menu_items (id text primary key, category_id text references public.categories(id) on delete set null,
  name_ru text not null, name_uz text, name_en text, description_ru text, description_uz text, description_en text,
  price integer not null check (price >= 0), image_url text default ''::text, available boolean not null default true,
  weight integer, kcal integer, sort_order integer default 0, created_at timestamptz not null default timezone('utc'::text, now()));
create table public.orders (id uuid primary key default gen_random_uuid(), order_number text not null,
  order_type text not null check (order_type = any (array['dine_in','takeaway','delivery'])), table_number text,
  customer_phone text, delivery_address text, items jsonb not null, total_amount integer not null,
  payment_method text not null check (payment_method = any (array['cash','click_payme'])), cash_received integer,
  change_amount integer, status text default 'completed' check (status = any (array['completed','cancelled'])),
  created_at timestamptz not null default timezone('utc'::text, now()));
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
create policy "Allow public read categories" on public.categories for select using (true);
create policy "Allow public insert categories" on public.categories for insert with check (true);
create policy "Allow public update categories" on public.categories for update using (true);
create policy "Allow public delete categories" on public.categories for delete using (true);
create policy "Allow public read menu_items" on public.menu_items for select using (true);
create policy "Allow public insert menu_items" on public.menu_items for insert with check (true);
create policy "Allow public update menu_items" on public.menu_items for update using (true);
create policy "Allow public delete menu_items" on public.menu_items for delete using (true);
create policy "Allow public read orders" on public.orders for select using (true);
create policy "Allow public insert orders" on public.orders for insert with check (true);
create policy "Allow public update orders" on public.orders for update using (true);
insert into public.categories(id, title_ru) values ('chicken','Курица'),('drinks','Напитки');
insert into public.menu_items(id, category_id, name_ru, price) values ('strips-5','chicken','Стрипсы, 5 шт',38000),('tea','drinks','Чай',8000);
insert into public.orders(order_number, order_type, items, total_amount, payment_method, status, created_at)
select '#00'||g, 'dine_in', '[]', 10000*g, 'cash', case when g = 6 then 'cancelled' else 'completed' end,
       '2026-08-14 07:00+00'::timestamptz + (g || ' days')::interval
  from generate_series(1,7) g;
