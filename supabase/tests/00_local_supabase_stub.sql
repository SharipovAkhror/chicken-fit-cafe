-- Локальная имитация окружения Supabase (только для тестов на обычном Postgres).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists realtime;
create table if not exists realtime.sent (id bigserial, payload jsonb, event text, topic text, private boolean, at timestamptz default now());
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql as $$ insert into realtime.sent(payload, event, topic, private) values (payload, event, topic, private) $$;
grant usage on schema public to anon, authenticated;
-- Supabase по умолчанию выдаёт anon/authenticated все права на таблицы public
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
