-- 0012 Фото блюд в Supabase Storage + проверка блюд на сервере (аддитивно, идемпотентно). Closes #11.
--  * Бакет menu-photos: публичное чтение (CDN), 512 КБ на файл, только image/webp|jpeg|png.
--    Клиент сжимает фото сам (webp ≤ 800 px, обычно 40–150 КБ) + миниатюра 240 px (…-t.webp) для кассы.
--  * Запись в бакет — только по «талону» (photo_tickets), который выдаёт RPC по PIN-сессии admin/cashier:
--    имя файла случайное (uuid), талон живёт 10 минут; без талона аноним ничего не загрузит и не удалит.
--    Service role не нужен ни в клиенте, ни на Vercel.
--  * Удаление старого фото при замене/удалении блюда — pos_photo_release: талон на удаление выдаётся,
--    только если файл больше не используется ни одним блюдом.
--  * menu.upsert из кассы проверяется на сервере: название 2–80 символов (обрезка пробелов), цена > 0 у нового
--    блюда и ≤ 50 млн, категория обязательна у нового, нет дубля названия в категории, ссылка на фото — https:// или /.
--    Импорт старой кассы (legacy) не проверяется — исторические данные не теряются.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.photo_tickets (
  object_name text primary key check (object_name ~ '^items/[0-9a-f-]{36}(-t)?\.(webp|jpg)$'),
  op text not null check (op in ('upload', 'delete')),
  staff_id uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists idx_photo_tickets_staff on public.photo_tickets(staff_id, created_at desc);
alter table public.photo_tickets enable row level security;
revoke all on public.photo_tickets from anon, authenticated;

-- проверка в политиках Storage (выполняется от имени anon/authenticated)
create or replace function public._photo_ticket_ok(p_name text, p_op text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.photo_tickets t where t.object_name = p_name and t.op = p_op and t.expires_at > now())
$$;
revoke execute on function public._photo_ticket_ok(text, text) from public;
grant execute on function public._photo_ticket_ok(text, text) to anon, authenticated;

drop policy if exists "menu-photos upload by ticket" on storage.objects;
create policy "menu-photos upload by ticket" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'menu-photos' and public._photo_ticket_ok(name, 'upload'));
drop policy if exists "menu-photos delete by ticket" on storage.objects;
create policy "menu-photos delete by ticket" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'menu-photos' and public._photo_ticket_ok(name, 'delete'));
drop policy if exists "menu-photos select by ticket" on storage.objects;
create policy "menu-photos select by ticket" on storage.objects for select to anon, authenticated
  using (bucket_id = 'menu-photos' and (public._photo_ticket_ok(name, 'upload') or public._photo_ticket_ok(name, 'delete')));

-- талон на загрузку: два имени (фото и миниатюра). Не больше 40 талонов в час на сотрудника.
create or replace function public.pos_photo_ticket(p_token text, p_ext text default 'webp')
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  st public.staff := public._session_staff(p_token);
  v_ext text := case when p_ext = 'jpg' then 'jpg' else 'webp' end;
  v_id text := gen_random_uuid()::text;
  v_exp timestamptz := now() + interval '10 minutes';
begin
  if st.role not in ('admin', 'cashier') or st.is_test then raise exception 'forbidden'; end if;
  if (select count(*) from public.photo_tickets where staff_id = st.id and op = 'upload' and created_at > now() - interval '1 hour') >= 80 then
    return jsonb_build_object('error', 'too_many_uploads');
  end if;
  insert into public.photo_tickets(object_name, op, staff_id, expires_at) values
    ('items/' || v_id || '.' || v_ext, 'upload', st.id, v_exp),
    ('items/' || v_id || '-t.' || v_ext, 'upload', st.id, v_exp);
  return jsonb_build_object('bucket', 'menu-photos', 'path', 'items/' || v_id || '.' || v_ext,
    'thumb', 'items/' || v_id || '-t.' || v_ext, 'expires_at', v_exp);
end $$;

-- талон на удаление старого фото (и его миниатюры), если ни одно блюдо его больше не использует
create or replace function public.pos_photo_release(p_token text, p_url text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  st public.staff := public._session_staff(p_token);
  m text[];
  v_main text; v_thumb text;
begin
  if st.role not in ('admin', 'cashier') or st.is_test then raise exception 'forbidden'; end if;
  m := regexp_match(coalesce(p_url, ''), '/storage/v1/object/public/menu-photos/(items/[0-9a-f-]{36})(?:-t)?\.(webp|jpg)$');
  if m is null then return jsonb_build_object('paths', '[]'::jsonb); end if;
  v_main := m[1] || '.' || m[2];
  v_thumb := m[1] || '-t.' || m[2];
  if exists (select 1 from public.menu_items where not is_deleted and image_url like '%/menu-photos/' || v_main) then
    return jsonb_build_object('paths', '[]'::jsonb, 'in_use', true);
  end if;
  insert into public.photo_tickets(object_name, op, staff_id, expires_at)
  values (v_main, 'delete', st.id, now() + interval '10 minutes'), (v_thumb, 'delete', st.id, now() + interval '10 minutes')
  on conflict (object_name) do update set op = 'delete', staff_id = excluded.staff_id, expires_at = excluded.expires_at;
  return jsonb_build_object('bucket', 'menu-photos', 'paths', jsonb_build_array(v_main, v_thumb));
end $$;

revoke execute on function public.pos_photo_ticket(text, text) from public;
revoke execute on function public.pos_photo_release(text, text) from public;
grant execute on function public.pos_photo_ticket(text, text) to anon, authenticated;
grant execute on function public.pos_photo_release(text, text) to anon, authenticated;

-- menu.upsert: проверки для кассы (p_source = 'pos'); остальное — как в 0009
create or replace function public._upsert_menu_item(p jsonb, p_staff public.staff, p_source text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id text := p->>'id';
  old public.menu_items;
  v_cat text := nullif(btrim(p->>'categoryId'), '');
  v_name text := nullif(regexp_replace(btrim(p->>'nameRu'), '\s+', ' ', 'g'), '');
  v_img text := btrim(p->>'imageUrl');
  v_cat_title text := nullif(btrim(p->>'categoryTitle'), '');
begin
  if v_id is null or char_length(v_id) > 64 then raise exception 'menu id required'; end if;
  select * into old from public.menu_items where id = v_id for update;
  if p_source = 'pos' then
    if p ? 'nameRu' and (v_name is null or char_length(v_name) < 2 or char_length(v_name) > 80) then
      raise exception 'invalid_name' using errcode = '22023';
    end if;
    if old.id is null and (v_name is null or v_cat is null) then raise exception 'name_and_category_required' using errcode = '22023'; end if;
    if p ? 'price' and ((p->>'price')::numeric > 50000000 or (p->>'price')::numeric < 0
        or (old.id is null and (p->>'price')::numeric <= 0 and coalesce((p->>'pricePerKg')::numeric, 0) <= 0)) then
      raise exception 'invalid_price' using errcode = '22023';
    end if;
    if v_img is not null and v_img <> '' and (char_length(v_img) > 500 or v_img !~ '^(https://|/)') then
      raise exception 'invalid_image_url' using errcode = '22023';
    end if;
    if v_cat_title is not null and char_length(v_cat_title) > 60 then raise exception 'invalid_category' using errcode = '22023'; end if;
    -- дубль названия в категории (без учёта регистра); не мешает править уже существующие дубли
    if v_name is not null and (old.id is null or lower(v_name) <> lower(btrim(old.name_ru)) or coalesce(v_cat, old.category_id) is distinct from old.category_id)
       and exists (select 1 from public.menu_items x where x.id <> v_id and not x.is_deleted
                   and x.category_id is not distinct from coalesce(v_cat, old.category_id) and lower(btrim(x.name_ru)) = lower(v_name)) then
      raise exception 'duplicate_name' using errcode = '23505';
    end if;
  else
    v_name := coalesce(v_name, p->>'nameRu');
  end if;
  if v_cat is not null and not exists (select 1 from public.categories where id = v_cat) then
    insert into public.categories(id, title_ru, sort_order) values (v_cat, left(coalesce(v_cat_title, v_cat), 60), 99)
    on conflict (id) do nothing;
  end if;
  if old.id is not null then
    update public.menu_items set
      category_id = coalesce(v_cat, category_id),
      name_ru = coalesce(v_name, name_ru),
      name_uz = coalesce(p->>'nameUz', name_uz),
      name_en = coalesce(p->>'nameEn', name_en),
      description_ru = coalesce(p->>'descriptionRu', description_ru),
      price = coalesce((p->>'price')::integer, price),
      image_url = coalesce(v_img, image_url),
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
    values (v_id, v_cat, coalesce(v_name, v_id), p->>'nameUz', p->>'nameEn', p->>'descriptionRu',
      coalesce((p->>'price')::integer, 0), coalesce(v_img, ''), coalesce((p->>'available')::boolean, true),
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
