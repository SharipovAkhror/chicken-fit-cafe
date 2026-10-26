\set ON_ERROR_STOP 1
-- Проверки 0015: смена PIN админом, общий лимит попыток входа, отметка «кто/какое устройство» на заказе.
delete from public.login_attempts;
insert into public.staff(id, name, role, pin_hash) values
  ('00000000-0000-0000-0000-0000000015a1', 'Админ15', 'admin', extensions.crypt('918273', extensions.gen_salt('bf', 4))),
  ('00000000-0000-0000-0000-0000000015c1', 'Кассир15', 'cashier', extensions.crypt('564738', extensions.gen_salt('bf', 4)))
on conflict (id) do nothing;

set role anon;
do $$ declare a jsonb; c jsonb; r jsonb; o uuid := gen_random_uuid(); row record; begin
  a := public.pos_login('918273', 'dev-admin-15');
  c := public.pos_login('564738', 'dev-cash-15');
  if a->>'token' is null or c->>'token' is null then raise exception 'FAIL: login % %', a, c; end if;

  -- кассир не может менять PIN и видеть список
  if public.pos_admin_set_pin(c->>'token', '00000000-0000-0000-0000-0000000015c1', '777111')->>'error' <> 'forbidden' then raise exception 'FAIL: cashier set pin'; end if;
  if public.pos_admin_staff(c->>'token')->>'error' <> 'forbidden' then raise exception 'FAIL: cashier list'; end if;
  if jsonb_array_length(public.pos_admin_staff(a->>'token')->'staff') < 2 then raise exception 'FAIL: admin list'; end if;
  if public.pos_admin_staff(a->>'token')::text ~ 'pin_hash' then raise exception 'FAIL: hash leaked'; end if;
  -- проверки PIN
  if public.pos_admin_set_pin(a->>'token', '00000000-0000-0000-0000-0000000015c1', '12a4')->>'error' <> 'bad_pin' then raise exception 'FAIL: bad pin'; end if;
  if public.pos_admin_set_pin(a->>'token', '00000000-0000-0000-0000-0000000015c1', '1111')->>'error' <> 'weak_pin' then raise exception 'FAIL: weak pin'; end if;
  if public.pos_admin_set_pin(a->>'token', '00000000-0000-0000-0000-0000000015c1', '918273')->>'error' <> 'pin_taken' then raise exception 'FAIL: dup pin'; end if;
  r := public.pos_admin_set_pin(a->>'token', '00000000-0000-0000-0000-0000000015c1', '730264');
  if r->>'ok' <> 'true' then raise exception 'FAIL: set pin %', r; end if;
  if public.pos_login('564738', 'dev-x')->>'error' <> 'invalid_pin' then raise exception 'FAIL: old pin still works'; end if;
  -- с 0016 смена PIN закрывает старые сеансы: входим заново новым PIN
  c := public.pos_login('730264', 'dev-cash-15');
  if c->>'token' is null then raise exception 'FAIL: new pin'; end if;

  -- устройство + отметка на заказе
  if public.pos_set_device_label(c->>'token', '  iPhone Кассир 15 ')->>'label' <> 'iPhone Кассир 15' then raise exception 'FAIL: label'; end if;
  perform public.pos_apply_mutation(c->>'token', gen_random_uuid(), 'order.upsert',
    jsonb_build_object('id', o, 'number', '015', 'type', 'takeaway', 'items', '[]'::jsonb, 'total', 0, 'cashierName', 'Кассир15', 'deviceId', 'dev-cash-15'));
  perform public.pos_apply_mutation(a->>'token', gen_random_uuid(), 'order.set_status', jsonb_build_object('id', o, 'status', 'sent'));
  raise notice 'OK v15 pins/devices %', o;
  perform set_config('t.o', o::text, false);
end $$;
reset role;
do $$ declare row record; begin
  select * into row from public.orders where id = current_setting('t.o')::uuid;
  if row.created_by_name <> 'Кассир15' or row.created_device_label <> 'iPhone Кассир 15' then raise exception 'FAIL: created stamp %/%', row.created_by_name, row.created_device_label; end if;
  if row.last_edited_by_name <> 'Админ15' or row.last_edited_device_id <> 'dev-admin-15' or row.last_edited_device_label is not null then raise exception 'FAIL: edit stamp %', row.last_edited_by_name; end if;
  -- правка не из кассы не трогает отметку
  update public.orders set notes = 'sql' where id = row.id;
  if (select last_edited_by_name from public.orders where id = row.id) <> 'Админ15' then raise exception 'FAIL: non-pos edit stamped'; end if;
  raise notice 'OK v15 stamps';
end $$;

-- общий лимит: 30 неудач с разных «устройств» → вход закрыт на 5 минут даже с нового устройства
set role anon;
do $$ declare i int; begin
  for i in 1..30 loop perform public.pos_login('000000', 'rnd-' || i); end loop;
  if public.pos_login('918273', 'fresh-dev')->>'error' <> 'too_many_attempts' then raise exception 'FAIL: global limit'; end if;
  raise notice 'OK v15 global rate limit';
end $$;
reset role;
delete from public.login_attempts;
