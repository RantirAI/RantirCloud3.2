-- Security hardening for user_integrations secrets
-- 1) Revoke column-level SELECT on sensitive fields so they are never returned over PostgREST
--    (RLS already restricts rows to the owning user; these revocations prevent exfiltration even if the account is compromised)

-- Ensure table exists (no-op if it already exists in this project)
-- and RLS remains as configured.

-- Revoke SELECT on secret columns for both anon and authenticated roles
REVOKE SELECT (api_key, auth_token) ON TABLE public.user_integrations FROM anon;
REVOKE SELECT (api_key, auth_token) ON TABLE public.user_integrations FROM authenticated;

-- Optional safety: also revoke SELECT on these columns from public role if any inherited grants exist
REVOKE SELECT (api_key, auth_token) ON TABLE public.user_integrations FROM PUBLIC;

-- Keep ability to INSERT/UPDATE these columns (users still need to save their keys),
-- but they can no longer read them back via the API.
-- No GRANTs needed here if already present; we intentionally only revoke SELECT.
