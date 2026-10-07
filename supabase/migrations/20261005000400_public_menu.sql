-- 0014: гостевое меню из БД (#8). У anon нет доступа к таблицам (rls_lockdown), поэтому — одна read-only функция
-- с минимальным набором колонок: только активные категории и блюда без удалённых/непроверенных. Без цен себестоимости,
-- без истории, без служебных полей. Ответ ~20–40 КБ; сайт кэширует его в браузере и откатывается на content/menu.json.
create or replace function public.public_menu()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'title_ru', c.title_ru, 'title_uz', c.title_uz, 'title_en', c.title_en,
        'sort_order', c.sort_order) order by c.sort_order, c.id)
      from public.categories c where c.is_active is not false), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'category_id', m.category_id, 'name_ru', m.name_ru, 'name_uz', m.name_uz,
        'name_en', m.name_en, 'description_ru', m.description_ru, 'price', m.price, 'price_per_kg', m.price_per_kg, 'unit', m.unit,
        'image_url', m.image_url, 'available', m.available, 'weight', m.weight, 'kcal', m.kcal, 'sort_order', m.sort_order)
        order by m.sort_order, m.id)
      from public.menu_items m
      where m.is_deleted is not true and m.needs_review is not true and m.category_id is not null), '[]'::jsonb));
$$;
revoke execute on function public.public_menu() from public;
grant execute on function public.public_menu() to anon, authenticated;
