-- 0007 Справочные данные: 8 столов, 4 учётки (текущие PIN, хранятся только хешем), тестовые заказы.

insert into public.dining_tables(id, name, zone, capacity, sort_order) values
  ('1','Стол 1','1 этаж',4,1), ('2','Стол 2','1 этаж',4,2), ('3','Стол 3','1 этаж',4,3),
  ('4','Стол 4','1 этаж',4,4), ('5','Стол 5','1 этаж',6,5), ('6','Стол 6','1 этаж',6,6),
  ('7','Стол 7','Антресоль',4,7), ('8','Стол 8','Антресоль',4,8)
on conflict (id) do nothing;

insert into public.staff(name, role, pin_hash)
select v.name, v.role, extensions.crypt(v.pin, extensions.gen_salt('bf', 10))
  from (values ('Кассир 1','cashier','1234'), ('Кассир 2','cashier','5678'),
               ('Шеф-повар','kitchen','0000'), ('Администратор','admin','12345678')) as v(name, role, pin)
 where not exists (select 1 from public.staff s where s.name = v.name);

-- 7 заказов, созданных при разработке (14.08–12.09), в отчёты не попадают.
update public.orders set source = 'dev_test'
 where source = 'pos' and legacy_id is null and created_at < '2026-10-03'::timestamptz
   and order_number is not null and shift_id is null and device_id is null;
