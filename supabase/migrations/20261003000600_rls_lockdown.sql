-- 0006 Закрываем прямой доступ. Публично читается только меню и столы.
-- Вся запись и чтение заказов/смен — только через RPC (security definer + токен сессии).

drop policy if exists "Allow public read categories" on public.categories;
drop policy if exists "Allow public insert categories" on public.categories;
drop policy if exists "Allow public update categories" on public.categories;
drop policy if exists "Allow public delete categories" on public.categories;
drop policy if exists "Allow public read menu_items" on public.menu_items;
drop policy if exists "Allow public insert menu_items" on public.menu_items;
drop policy if exists "Allow public update menu_items" on public.menu_items;
drop policy if exists "Allow public delete menu_items" on public.menu_items;
drop policy if exists "Allow public read orders" on public.orders;
drop policy if exists "Allow public insert orders" on public.orders;
drop policy if exists "Allow public update orders" on public.orders;

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select to anon, authenticated using (is_active);
drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items for select to anon, authenticated using (not is_deleted);
drop policy if exists dining_tables_public_read on public.dining_tables;
create policy dining_tables_public_read on public.dining_tables for select to anon, authenticated using (is_active);

revoke insert, update, delete, truncate on public.categories, public.menu_items, public.dining_tables from anon, authenticated;
revoke all on public.orders, public.order_items, public.order_events, public.shifts, public.staff, public.staff_sessions,
  public.login_attempts, public.applied_mutations, public.legacy_snapshots, public.menu_item_history from anon, authenticated;
grant select on public.categories, public.menu_items, public.dining_tables to anon, authenticated;

-- Внутренние функции — недоступны извне.
revoke execute on function public._hash_token(text) from public, anon, authenticated;
revoke execute on function public._session_staff(text) from public, anon, authenticated;
revoke execute on function public._upsert_order(jsonb, public.staff, text, boolean) from public, anon, authenticated;
revoke execute on function public._upsert_shift(jsonb, public.staff, boolean) from public, anon, authenticated;
revoke execute on function public._upsert_menu_item(jsonb, public.staff, text) from public, anon, authenticated;
revoke execute on function public._shift_summary(uuid) from public, anon, authenticated;
revoke execute on function public._broadcast_change() from public, anon, authenticated;

-- Публичные RPC.
grant execute on function public.pos_login(text, text) to anon, authenticated;
grant execute on function public.pos_logout(text) to anon, authenticated;
grant execute on function public.pos_apply_mutation(text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.pos_pull(text, timestamptz) to anon, authenticated;
grant execute on function public.rescue_store_snapshot(jsonb) to anon, authenticated;
grant execute on function public.rescue_save_report(text, text, jsonb) to anon, authenticated;
grant execute on function public.rescue_verify(text) to anon, authenticated;
grant execute on function public.report_shift(text, uuid) to anon, authenticated;
grant execute on function public.report_sales(text, date, date) to anon, authenticated;
