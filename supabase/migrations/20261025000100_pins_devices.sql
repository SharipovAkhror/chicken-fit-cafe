-- 0015: смена PIN админом, защита от перебора PIN по всем устройствам, «кто и с какого устройства» на заказах.
-- Только аддитивно: новые nullable-колонки, новая таблица, новые функции; сигнатуры pos_* не меняются (старые вкладки работают).

-- 1. Названия устройств (задаются на кассе, хранятся на устройстве и отправляются сюда)
create table if not exists public.pos_devices (
  device_id text primary key,
  label text not null check (char_length(label) between 1 and 40),
  updated_by uuid references public.staff(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.pos_devices enable row level security;
revoke all on public.pos_devices from anon, authenticated;

-- 2. Кто и откуда создал / последним изменил заказ
alter table public.staff add column if not exists pin_changed_at timestamptz;
alter table public.orders add column if not exists created_by_name text;
alter table public.orders add column if not exists created_device_label text;
alter table public.orders add column if not exists last_edited_by uuid;
alter table public.orders add column if not exists last_edited_by_name text;
alter table public.orders add column if not exists last_edited_device_id text;
alter table public.orders add column if not exists last_edited_device_label text;
alter table public.orders add column if not exists last_edited_at timestamptz;

-- 3. Сессия запоминает сотрудника и устройство на время транзакции RPC (для триггера ниже)
create or replace function public._session_staff(p_token text)
returns public.staff language plpgsql volatile security definer set search_path = '' as $$
declare s public.staff; dev text;
begin
  select ss.device_id into dev
    from public.staff_sessions ss
    join public.staff st on st.id = ss.staff_id
   where ss.token_hash = public._hash_token(p_token)
     and ss.expires_at > now()
     and st.is_active;
  if not found then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  select st.* into s from public.staff_sessions ss join public.staff st on st.id = ss.staff_id
   where ss.token_hash = public._hash_token(p_token);
  if s.id is null then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  perform set_config('pos.staff_id', s.id::text, true);
  perform set_config('pos.staff_name', s.name, true);
  perform set_config('pos.device_id', coalesce(dev, ''), true);
  return s;
end $$;
revoke execute on function public._session_staff(text) from public, anon, authenticated;

create or replace function public._orders_stamp_editor()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sid text := nullif(current_setting('pos.staff_id', true), '');
        dev text := nullif(current_setting('pos.device_id', true), '');
        lbl text;
begin
  if sid is null then return new; end if; -- не из кассы (импорт, админ-SQL) — не трогаем
  if dev is not null then select label into lbl from public.pos_devices where device_id = dev; end if;
  new.last_edited_by := sid::uuid;
  new.last_edited_by_name := current_setting('pos.staff_name', true);
  new.last_edited_device_id := dev;
  new.last_edited_device_label := lbl;
  new.last_edited_at := now();
  if tg_op = 'INSERT' then
    new.created_by_name := coalesce(new.created_by_name, new.last_edited_by_name);
    new.created_device_label := coalesce(new.created_device_label, lbl);
  end if;
  return new;
end $$;
revoke execute on function public._orders_stamp_editor() from public, anon, authenticated;
drop trigger if exists trg_orders_stamp_editor on public.orders;
create trigger trg_orders_stamp_editor before insert or update on public.orders
  for each row execute function public._orders_stamp_editor();

-- 4. Название устройства (любой вошедший сотрудник, для своего устройства)
create or replace function public.pos_set_device_label(p_token text, p_label text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
        dev text := nullif(current_setting('pos.device_id', true), '');
        lbl text := left(btrim(coalesce(p_label, '')), 40);
begin
  if dev is null or lbl = '' then return jsonb_build_object('error', 'bad_request'); end if;
  insert into public.pos_devices(device_id, label, updated_by, updated_at) values (dev, lbl, st.id, now())
  on conflict (device_id) do update set label = excluded.label, updated_by = excluded.updated_by, updated_at = now();
  return jsonb_build_object('ok', true, 'label', lbl);
end $$;
revoke execute on function public.pos_set_device_label(text, text) from public;
grant execute on function public.pos_set_device_label(text, text) to anon, authenticated;

-- 5. Админ: список сотрудников и смена PIN (bcrypt, открытый PIN нигде не хранится)
create or replace function public.pos_admin_staff(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
begin
  if st.role <> 'admin' then return jsonb_build_object('error', 'forbidden'); end if;
  return jsonb_build_object('staff', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'role', s.role,
      'is_active', s.is_active, 'pin_changed_at', s.pin_changed_at) order by s.role, s.name)
    from public.staff s where s.is_active and not coalesce(s.is_test, false)), '[]'::jsonb));
end $$;
revoke execute on function public.pos_admin_staff(text) from public;
grant execute on function public.pos_admin_staff(text) to anon, authenticated;

create or replace function public.pos_admin_set_pin(p_token text, p_staff_id uuid, p_new_pin text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
        pin text := coalesce(p_new_pin, '');
begin
  if st.role <> 'admin' then return jsonb_build_object('error', 'forbidden'); end if;
  if pin !~ '^[0-9]{4,8}$' then return jsonb_build_object('error', 'bad_pin'); end if;
  if pin ~ '^(.)\1+$' or pin in ('1234', '12345', '123456', '0000', '4321') then return jsonb_build_object('error', 'weak_pin'); end if;
  if not exists (select 1 from public.staff where id = p_staff_id and is_active) then return jsonb_build_object('error', 'not_found'); end if;
  -- PIN определяет сотрудника при входе, поэтому у двух активных сотрудников он не может совпадать
  if exists (select 1 from public.staff where is_active and id <> p_staff_id and pin_hash = extensions.crypt(pin, pin_hash)) then
    return jsonb_build_object('error', 'pin_taken');
  end if;
  update public.staff set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf', 10)), pin_changed_at = now() where id = p_staff_id;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.pos_admin_set_pin(text, uuid, text) from public;
grant execute on function public.pos_admin_set_pin(text, uuid, text) to anon, authenticated;

-- 6. Вход: прежний лимит 5 ошибок за 5 минут на устройство + общий лимит 30 ошибок за 5 минут на все устройства
--    (перебор с подменой device_id). Сигнатура и ответы прежние.
create or replace function public.pos_login(p_pin text, p_device_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  s public.staff;
  fails integer;
  all_fails integer;
  tok text;
  exp timestamptz := now() + interval '16 hours';
begin
  select count(*) into fails from public.login_attempts
   where device_id is not distinct from p_device_id and not success and at > now() - interval '5 minutes';
  select count(*) into all_fails from public.login_attempts
   where not success and at > now() - interval '5 minutes';
  if fails >= 5 or all_fails >= 30 then
    return jsonb_build_object('error', 'too_many_attempts');
  end if;

  select * into s from public.staff
   where is_active and pin_hash = extensions.crypt(coalesce(p_pin, ''), pin_hash)
   limit 1;

  insert into public.login_attempts(device_id, success) values (left(p_device_id, 64), found);
  if s.id is null then
    return jsonb_build_object('error', 'invalid_pin');
  end if;

  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.staff_sessions(token_hash, staff_id, device_id, expires_at)
  values (public._hash_token(tok), s.id, p_device_id, exp);
  delete from public.staff_sessions where expires_at < now() - interval '1 day';
  delete from public.login_attempts where at < now() - interval '7 days';

  return jsonb_build_object('token', tok, 'expires_at', exp,
    'staff', jsonb_build_object('id', s.id, 'name', s.name, 'role', s.role));
end $$;
create index if not exists idx_login_attempts_fail_at on public.login_attempts(at desc) where not success;
