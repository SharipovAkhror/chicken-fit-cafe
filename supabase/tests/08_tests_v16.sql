\set ON_ERROR_STOP 1
-- Проверки 0016: смена PIN закрывает сессии сотрудника; «выйти везде».
delete from public.login_attempts;
insert into public.staff(id, name, role, pin_hash) values
  ('00000000-0000-0000-0000-0000000016a1', 'Админ16', 'admin', extensions.crypt('829104', extensions.gen_salt('bf', 4))),
  ('00000000-0000-0000-0000-0000000016c1', 'Кассир16', 'cashier', extensions.crypt('604917', extensions.gen_salt('bf', 4)))
on conflict (id) do nothing;
set role anon;
do $$ declare a jsonb; c1 jsonb; c2 jsonb; r jsonb; begin
  a := public.pos_login('829104', 'dev-a16');
  c1 := public.pos_login('604917', 'dev-c16-1');
  c2 := public.pos_login('604917', 'dev-c16-2');
  if public.pos_admin_logout_everywhere(c1->>'token', '00000000-0000-0000-0000-0000000016a1')->>'error' <> 'forbidden' then raise exception 'FAIL: cashier logout all'; end if;
  r := public.pos_admin_set_pin(a->>'token', '00000000-0000-0000-0000-0000000016c1', '385061');
  if (r->>'sessions_revoked')::int <> 2 then raise exception 'FAIL: revoke on set pin %', r; end if;
  begin perform public.pos_admin_staff(c1->>'token'); raise exception 'FAIL: old session alive';
  exception when sqlstate '28000' then null; end;
  -- админ меняет свой PIN — его текущая сессия остаётся
  r := public.pos_admin_set_pin(a->>'token', '00000000-0000-0000-0000-0000000016a1', '829105');
  if r->>'ok' <> 'true' or public.pos_admin_staff(a->>'token') ? 'error' then raise exception 'FAIL: own session %', r; end if;
  c1 := public.pos_login('385061', 'dev-c16-3');
  r := public.pos_admin_logout_everywhere(a->>'token', '00000000-0000-0000-0000-0000000016c1');
  if (r->>'sessions_revoked')::int <> 1 then raise exception 'FAIL: logout everywhere %', r; end if;
  raise notice 'OK 0016';
end $$;
reset role;
