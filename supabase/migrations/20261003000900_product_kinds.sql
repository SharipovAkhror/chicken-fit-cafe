-- 0009: типы товаров (аддитивно). Старые клиенты v2 эти поля не шлют и не читают — поведение для них не меняется.
--   kind: portion | weighted | with_side | side_mix (null = определить по старым признакам: unit/имя/id);
--   options: {"variants": [...], "extras": [...]} — модификаторы без доплаты (как в v1: Микс/Крылья/Стрипсы, Острый).
alter table public.menu_items add column if not exists kind text;
alter table public.menu_items add column if not exists options jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'menu_items_kind_check') then
    alter table public.menu_items add constraint menu_items_kind_check check (kind is null or kind in ('portion','weighted','with_side','side_mix'));
  end if;
end $$;

create or replace function public._upsert_menu_item(p jsonb, p_staff public.staff, p_source text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id text := p->>'id';
  old public.menu_items;
  v_cat text := nullif(p->>'categoryId', '');
begin
  if v_id is null then raise exception 'menu id required'; end if;
  if v_cat is not null and not exists (select 1 from public.categories where id = v_cat) then
    insert into public.categories(id, title_ru, sort_order) values (v_cat, coalesce(p->>'categoryTitle', v_cat), 99)
    on conflict (id) do nothing;
  end if;
  select * into old from public.menu_items where id = v_id for update;
  if found then
    update public.menu_items set
      category_id = coalesce(v_cat, category_id),
      name_ru = coalesce(p->>'nameRu', name_ru),
      name_uz = coalesce(p->>'nameUz', name_uz),
      name_en = coalesce(p->>'nameEn', name_en),
      description_ru = coalesce(p->>'descriptionRu', description_ru),
      price = coalesce((p->>'price')::integer, price),
      image_url = coalesce(p->>'imageUrl', image_url),
      available = coalesce((p->>'available')::boolean, available),
      weight = coalesce((p->>'weight')::integer, weight),
      kcal = coalesce((p->>'kcal')::integer, kcal),
      sort_order = coalesce((p->>'sortOrder')::integer, sort_order),
      is_kitchen = coalesce((p->>'isKitchen')::boolean, is_kitchen),
      unit = coalesce(p->>'unit', unit),
      price_per_kg = coalesce((p->>'pricePerKg')::integer, price_per_kg),
      is_deleted = coalesce((p->>'isDeleted')::boolean, is_deleted),
      needs_review = coalesce((p->>'needsReview')::boolean, needs_review),
      kind = case when p ? 'kind' then nullif(p->>'kind', '') else kind end,
      options = case when p ? 'options' then case when jsonb_typeof(p->'options') = 'object' then p->'options' else null end else options end,
      updated_at = now()
    where id = v_id;
  else
    insert into public.menu_items(id, category_id, name_ru, name_uz, name_en, description_ru, price, image_url, available,
      weight, kcal, sort_order, is_kitchen, unit, price_per_kg, is_deleted, needs_review, kind, options)
    values (v_id, v_cat, coalesce(p->>'nameRu', v_id), p->>'nameUz', p->>'nameEn', p->>'descriptionRu',
      coalesce((p->>'price')::integer, 0), coalesce(p->>'imageUrl', ''), coalesce((p->>'available')::boolean, true),
      (p->>'weight')::integer, (p->>'kcal')::integer, coalesce((p->>'sortOrder')::integer, 0), (p->>'isKitchen')::boolean,
      coalesce(p->>'unit', 'portion'), (p->>'pricePerKg')::integer, coalesce((p->>'isDeleted')::boolean, false),
      coalesce((p->>'needsReview')::boolean, false), nullif(p->>'kind', ''),
      case when jsonb_typeof(p->'options') = 'object' then p->'options' else null end);
  end if;
  insert into public.menu_item_history(menu_item_id, changed_by, source, old_values, new_values)
  values (v_id, p_staff.name, p_source, case when old.id is null then null else to_jsonb(old) end, p);
  return jsonb_build_object('id', v_id);
end $$;

revoke execute on function public._upsert_menu_item(jsonb, public.staff, text) from public, anon, authenticated;
