-- ========================================================================
-- ChickenFit Cafe: Миграция KDS, смен и Realtime в Supabase
-- Запустите этот скрипт в https://supabase.com/dashboard/project/ikvontqurgzopdmsdmla/sql/new
-- ========================================================================

-- 1. Добавляем недостающие поля в существующую таблицу orders:
alter table public.orders add column if not exists subtotal integer;
alter table public.orders add column if not exists discount_percent integer;
alter table public.orders add column if not exists discount_amount integer;
alter table public.orders add column if not exists delivery_fee integer;
alter table public.orders add column if not exists shift_id text;
alter table public.orders add column if not exists cashier_name text;

-- Обновляем ограничение статусов (добавляем pending, cooking, ready для KDS кухни):
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check 
  check (status in ('pending', 'cooking', 'ready', 'completed', 'cancelled'));

-- 2. Создаем таблицу кассовых смен (shifts):
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

-- Индексы
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_shift on public.orders(shift_id);
create index if not exists idx_shifts_opened_at on public.shifts(opened_at desc);

-- RLS для смен
alter table public.shifts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'shifts' and policyname = 'Allow public read shifts') then
    create policy "Allow public read shifts" on public.shifts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'shifts' and policyname = 'Allow public insert shifts') then
    create policy "Allow public insert shifts" on public.shifts for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'shifts' and policyname = 'Allow public update shifts') then
    create policy "Allow public update shifts" on public.shifts for update using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'shifts' and policyname = 'Allow public delete shifts') then
    create policy "Allow public delete shifts" on public.shifts for delete using (true);
  end if;
end $$;

-- 3. Включение Realtime публикаций:
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shifts;
exception when others then null;
end $$;
