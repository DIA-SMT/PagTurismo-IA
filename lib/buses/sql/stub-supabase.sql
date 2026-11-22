-- SOLO para desarrollo local y pruebas (PGlite): lo mínimo de Supabase que nombran las migraciones
-- históricas de la base del Bus Turístico (lib/buses/sql/historico). En la VPS esa base ya existe
-- y NO se le aplica nada de esto (ver db/README.md de BotTurismo y docs/PLAN_MIGRACION.md).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create extension if not exists pgcrypto;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, encrypted_password text);
create or replace function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create schema if not exists api;
