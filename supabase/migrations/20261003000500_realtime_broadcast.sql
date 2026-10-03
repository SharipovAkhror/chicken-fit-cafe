-- 0005 Realtime: триггеры шлют короткий сигнал без персональных данных в публичный топик 'cf-sync'.
-- Клиент по сигналу делает pos_pull. Ошибка отправки сигнала никогда не блокирует запись.

create or replace function public._broadcast_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('entity', tg_table_name, 'id', (to_jsonb(coalesce(new, old))->>'id'), 'op', tg_op),
      'change', 'cf-sync', false);
  exception when others then
    null;
  end;
  return null;
end $$;

drop trigger if exists trg_broadcast_orders on public.orders;
create trigger trg_broadcast_orders after insert or update or delete on public.orders
  for each row execute function public._broadcast_change();

drop trigger if exists trg_broadcast_shifts on public.shifts;
create trigger trg_broadcast_shifts after insert or update or delete on public.shifts
  for each row execute function public._broadcast_change();

drop trigger if exists trg_broadcast_menu on public.menu_items;
create trigger trg_broadcast_menu after insert or update or delete on public.menu_items
  for each row execute function public._broadcast_change();

drop trigger if exists trg_broadcast_categories on public.categories;
create trigger trg_broadcast_categories after insert or update or delete on public.categories
  for each row execute function public._broadcast_change();
