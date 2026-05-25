-- Set passwords for internal Supabase roles that the trimmed compose stack uses.
-- The supabase/postgres image creates these roles without passwords; the auth
-- service connects as supabase_auth_admin, so it needs one.
--
-- Demo password only. Never reuse outside local dev.

ALTER ROLE supabase_auth_admin WITH PASSWORD 'postgres';
ALTER ROLE supabase_storage_admin WITH PASSWORD 'postgres';
ALTER ROLE authenticator WITH PASSWORD 'postgres';
