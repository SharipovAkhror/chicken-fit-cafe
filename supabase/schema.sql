-- ========================================================================
-- ChickenFit: База данных Supabase (PostgreSQL)
-- Для создания таблиц: скопируйте этот код и запустите в Supabase -> SQL Editor
-- ========================================================================

-- 1. Таблица категорий меню
create table if not exists public.categories (
  id text primary key,
  title_ru text not null,
  title_uz text,
  title_en text,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Таблица блюд меню
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
  image_url text default '',
  available boolean default true not null,
  weight integer,
  kcal integer,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Таблица заказов (касса / POS / KDS)
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number text not null,
  order_type text not null check (order_type in ('dine_in', 'takeaway', 'delivery')),
  table_number text,
  customer_phone text,
  delivery_address text,
  items jsonb not null,
  subtotal integer,
  discount_percent integer,
  discount_amount integer,
  delivery_fee integer,
  total_amount integer not null,
  payment_method text not null check (payment_method in ('cash', 'click_payme')),
  cash_received integer,
  change_amount integer,
  shift_id text,
  cashier_name text,
  status text default 'pending' check (status in ('pending', 'cooking', 'ready', 'completed', 'cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Таблица кассовых смен (X/Z-отчеты)
create table if not exists public.shifts (
  id text primary key,
  shift_number integer not null,
  cashier_id text,
  cashier_name text not null,
  cashier_role text default 'cashier',
  opened_at timestamp with time zone default timezone('utc'::text, now()) not null,
  closed_at timestamp with time zone,
  initial_cash integer default 0,
  final_cash integer,
  total_revenue integer default 0,
  cash_revenue integer default 0,
  card_revenue integer default 0,
  discount_total integer default 0,
  orders_count integer default 0,
  status text default 'open' check (status in ('open', 'closed')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Индексы для быстрой фильтрации
create index if not exists idx_menu_items_category on public.menu_items(category_id);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_shift on public.orders(shift_id);
create index if not exists idx_shifts_opened_at on public.shifts(opened_at desc);

-- 6. Включение Row Level Security (RLS) и политики публичного доступа
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.shifts enable row level security;

-- Политики: чтение доступно всем, запись доступна анонимному ключу (для MVP кассы)
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
create policy "Allow public delete orders" on public.orders for delete using (true);

create policy "Allow public read shifts" on public.shifts for select using (true);
create policy "Allow public insert shifts" on public.shifts for insert with check (true);
create policy "Allow public update shifts" on public.shifts for update using (true);
create policy "Allow public delete shifts" on public.shifts for delete using (true);

-- 7. Realtime публикация для синхронизации KDS и кассы
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.shifts;

-- 8. Начальные данные (базовое меню)
insert into public.categories (id, title_ru, title_uz, title_en, sort_order)
values
  ('chicken', 'Курица', 'Tovuq', 'Chicken', 1),
  ('combo', 'Комбо-наборы', 'Kombo to''plamlar', 'Combos', 2),
  ('pastry', 'Выпечка', 'Pishiriqlar', 'Pastries & Pies', 3),
  ('soups', 'Супы', 'Sho''rvalar', 'Soups', 4),
  ('sides', 'Гарниры', 'Garnirlar', 'Sides', 5),
  ('sauces', 'Соусы', 'Souslar', 'Sauces', 6),
  ('drinks', 'Напитки', 'Ichimliklar', 'Drinks', 7)
on conflict (id) do nothing;

insert into public.menu_items (id, category_id, name_ru, name_uz, name_en, description_ru, price, available, sort_order)
values
  ('strips-5', 'chicken', 'Стрипсы, 5 шт', 'Striplar, 5 dona', 'Chicken Strips, 5 pcs', 'Куриное филе в хрустящей панировке', 38000, true, 1),
  ('wings-6', 'chicken', 'Крылья, 6 шт', 'Qanotchalar, 6 dona', 'Chicken Wings, 6 pcs', 'Сочные куриные крылья в панировке', 42000, true, 2),
  ('combo-strips', 'combo', 'Комбо со стрипсами', 'Stripli kombo', 'Strips Combo', 'Стрипсы 5 шт, картофель фри, соус, напиток 0.5л', 55000, true, 3),
  ('combo-wings', 'combo', 'Комбо с крыльями', 'Qanotchali kombo', 'Wings Combo', 'Крылья 6 шт, картофель фри, соус, напиток 0.5л', 58000, true, 4),
  ('pirozhki', 'pastry', 'Пирожки', 'Pirojkilar', 'Pirozhki', 'Свежая домашняя выпечка с начинкой', 8000, true, 5),
  ('belyashi', 'pastry', 'Беляши', 'Belyashlar', 'Belyashi', 'Сочный беляш с мясной начинкой', 12000, true, 6),
  ('cheburek', 'pastry', 'Чебуреки', 'Chebureklar', 'Cheburek', 'Хрустящий чебурек с сочной начинкой', 15000, true, 7),
  ('blinchiki', 'pastry', 'Блинчики', 'Blinchiklar', 'Pancakes / Blini', 'Нежные блинчики с начинкой', 12000, true, 8),
  ('chicken-soup', 'soups', 'Куриный суп', 'Tovuq sho''rva', 'Chicken Soup', 'Наваристый куриный бульон с домашней лапшой и зеленью', 25000, true, 9),
  ('lentil-soup', 'soups', 'Чечевичный суп', 'Yasmiq sho''rva', 'Lentil Soup', 'Крем-суп из чечевицы с сухариками и лимоном', 22000, true, 10),
  ('fries', 'sides', 'Картофель фри', 'Fri kartoshka', 'French Fries', 'Хрустящий картофель с солью', 18000, true, 11),
  ('house-sauce', 'sauces', 'Фирменный соус', 'Firma sousi', 'House Sauce', 'Сливочный соус с паприкой', 5000, true, 12),
  ('garlic-sauce', 'sauces', 'Чесночный соус', 'Sarimsoqli sous', 'Garlic Sauce', 'Чеснок, зелень, йогурт', 5000, true, 13),
  ('tea', 'drinks', 'Чай', 'Choy', 'Tea', 'Зелёный или чёрный, чайник', 8000, true, 14),
  ('coca-cola', 'drinks', 'Coca-Cola 0,5', 'Coca-Cola 0,5', 'Coca-Cola 0.5L', 'Освежающий напиток 0.5л', 12000, true, 15)
on conflict (id) do update set price = excluded.price, name_ru = excluded.name_ru;
