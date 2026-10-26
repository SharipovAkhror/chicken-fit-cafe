-- 0016: смена PIN админом завершает все сессии этого сотрудника; «выйти везде» для админа.
-- Только аддитивно: сигнатуры прежние, новая функция pos_admin_logout_everywhere.

create or replace function public.pos_admin_set_pin(p_token text, p_staff_id uuid, p_new_pin text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
        pin text := coalesce(p_new_pin, '');
        n integer;
begin
  if st.role <> 'admin' then return jsonb_build_object('error', 'forbidden'); end if;
  if pin !~ '^[0-9]{4,8}$' then return jsonb_build_object('error', 'bad_pin'); end if;
  if pin ~ '^(.)\1+$' or pin in ('1234', '12345', '123456', '0000', '4321') then return jsonb_build_object('error', 'weak_pin'); end if;
  if not exists (select 1 from public.staff where id = p_staff_id and is_active) then return jsonb_build_object('error', 'not_found'); end if;
  if exists (select 1 from public.staff where is_active and id <> p_staff_id and pin_hash = extensions.crypt(pin, pin_hash)) then
    return jsonb_build_object('error', 'pin_taken');
  end if;
  update public.staff set pin_hash = extensions.crypt(pin, extensions.gen_salt('bf', 10)), pin_changed_at = now() where id = p_staff_id;
  -- старый PIN мог быть известен на чужих телефонах: закрываем все сессии сотрудника (кроме текущей сессии админа)
  delete from public.staff_sessions
   where staff_id = p_staff_id and token_hash <> public._hash_token(p_token);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'sessions_revoked', n);
end $$;
revoke execute on function public.pos_admin_set_pin(text, uuid, text) from public;
grant execute on function public.pos_admin_set_pin(text, uuid, text) to anon, authenticated;

create or replace function public.pos_admin_logout_everywhere(p_token text, p_staff_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare st public.staff := public._session_staff(p_token);
        n integer;
begin
  if st.role <> 'admin' then return jsonb_build_object('error', 'forbidden'); end if;
  if not exists (select 1 from public.staff where id = p_staff_id) then return jsonb_build_object('error', 'not_found'); end if;
  delete from public.staff_sessions
   where staff_id = p_staff_id and token_hash <> public._hash_token(p_token);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'sessions_revoked', n);
end $$;
revoke execute on function public.pos_admin_logout_everywhere(text, uuid) from public;
grant execute on function public.pos_admin_logout_everywhere(text, uuid) to anon, authenticated;
