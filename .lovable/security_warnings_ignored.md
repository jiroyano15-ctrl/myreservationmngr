# Acknowledged Supabase Linter Warnings

## WARN 0029 — Signed-In Users Can Execute SECURITY DEFINER Function `public.has_role`

This is the prescribed Lovable RBAC pattern: `has_role(uuid, app_role)` is a
SECURITY DEFINER helper used inside RLS policies. RLS policies that call it
require the calling role (`authenticated`) to have EXECUTE permission, so the
warning cannot be removed without breaking the pattern. EXECUTE has already
been revoked from `PUBLIC` and `anon`; only `authenticated` and `service_role`
retain it. The function only returns a boolean for the exact `(user_id, role)`
pair provided and reads from the RLS-protected `user_roles` table.
