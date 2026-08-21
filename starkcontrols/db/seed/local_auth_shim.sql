-- =============================================================================
-- LOCAL / CI ONLY — never applied to Supabase.
--
-- Supabase ships an `auth` schema whose auth.jwt() returns the verified JWT
-- claims of the current request as jsonb.  Plain Postgres (local dev,
-- testcontainers, CI) has no such schema, so migration 0001's RLS policies
-- would fail to parse.  This shim provides a compatible stand-in that reads
-- the claims from the `request.jwt.claims` GUC, exactly as Supabase does.
--
-- Usage:
--   psql "$DATABASE_URL" -f db/seed/local_auth_shim.sql
--   psql "$DATABASE_URL" -f db/migrations/0001_core.sql
--
-- To act as a tenant in a local session:
--   set local role authenticated;
--   set local "request.jwt.claims" = '{"org_id":"<uuid>"}';
-- =============================================================================

create schema if not exists auth;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb;
$$;

-- Supabase's two client-facing roles, used by RLS tests.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
