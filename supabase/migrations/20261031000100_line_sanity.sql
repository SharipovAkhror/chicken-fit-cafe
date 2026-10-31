-- Защита от абсурдных количеств/сумм (заказ №062: 999 999 999 г, 89 999 999 910 сум).
-- NOT VALID: старые строки не проверяются, новые/изменённые — да. Аддитивно, без блокировки таблиц надолго.
alter table public.order_items drop constraint if exists order_items_sane_qty;
alter table public.order_items add constraint order_items_sane_qty
  check (qty is null or (qty > 0 and qty <= 500)) not valid;
alter table public.order_items drop constraint if exists order_items_sane_weight;
alter table public.order_items add constraint order_items_sane_weight
  check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 20)) not valid;
alter table public.order_items drop constraint if exists order_items_sane_line_total;
alter table public.order_items add constraint order_items_sane_line_total
  check (line_total is null or (line_total >= 0 and line_total <= 50000000)) not valid;
alter table public.orders drop constraint if exists orders_sane_total;
alter table public.orders add constraint orders_sane_total
  check (total_amount is null or (total_amount >= 0 and total_amount <= 500000000)) not valid;
