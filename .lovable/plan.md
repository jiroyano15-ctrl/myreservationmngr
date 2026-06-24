# Roles, ownership transfer, and sub-account staff

## What you'll get
- **Three roles**: `admin`, `sub_account`, `staff`. Stored server-side, not in localStorage.
- **Admin** can promote any of their sub-accounts to **co-admin** (full admin rights, original admin keeps theirs).
- **Sub-accounts** get a new "My Staff" panel to create/delete staff users scoped to them.
- **Staff** sign in and only see the Ordering view — no catalog editor, no DB hub, no admin panel. Their orders are recorded under the parent sub-account's catalog.
- Cross-device: sign in on any browser and your accounts/staff/catalog follow you.

## User-facing changes
1. **Admin → Sub-Accounts panel** gains a "Promote to co-admin" button per sub-account (with confirm dialog). Promoted sub-accounts get an "Admin" badge.
2. **New Sub-Account "My Staff" tab** (visible only when role = `sub_account`): create staff (username + password), list them, delete them.
3. **Staff login**: existing staff login form keeps working; staff session is locked to the Ordering view.
4. **Login**: still email/password + Google. First Google sign-in on an empty system becomes the founding admin.

## Technical details

### Database (one migration)
- `app_role` enum: `admin | sub_account | staff`.
- `user_roles(user_id, role, parent_user_id)` — `parent_user_id` links sub-accounts to their admin and staff to their sub-account. RLS + `has_role(uuid, app_role)` security-definer function (per project rules).
- `staff_accounts(id, parent_user_id, username, password_hash, created_at)` — staff credentials managed by sub-accounts; passwords hashed server-side.
- `profiles` already exists; reused for display info.
- GRANTs to `authenticated` + `service_role` on every new public table; RLS policies use `has_role` and `auth.uid()`.

### Server functions (`src/lib/accounts.functions.ts`)
- `listSubAccounts` (admin only) — returns sub-accounts + co-admin flag.
- `promoteSubAccount({ subUserId })` (admin only) — inserts `admin` role for the sub-account; keeps existing `sub_account` row.
- `createSubAccount({ email, displayName, password })` (admin only) — uses `supabaseAdmin.auth.admin.createUser`, inserts `sub_account` role with `parent_user_id = caller`.
- `listMyStaff` / `createStaff({ username, password })` / `deleteStaff({ id })` (sub_account or co-admin only) — manages rows in `staff_accounts`.
- `staffLogin({ username, password })` — public server fn that validates credentials, returns a short-lived session token + parent sub-account id. Staff don't use Supabase Auth.

### Client wiring
- `App.tsx` reads role + parent id from a `useQuery(['me'])` server fn, replaces today's localStorage role checks.
- New `SubAccountStaffPanel.tsx` component; Admin panel grows the promote button.
- When the signed-in user is `staff`, force `activeGlobalTab = "ordering"` and hide other tabs.
- Staff orders write to the parent sub-account's catalog/history (already keyed by user — switch the key to `parent_user_id` when role = `staff`).

### Migration strategy for existing localStorage data
- Keep the current sandbox/local fallback for offline demo, but prefer cloud data whenever a Supabase session exists. No automatic import — clean slate in the cloud.

## Out of scope (ask if you want these)
- Email invitations for sub-accounts (we'll set passwords directly).
- Audit log of who promoted whom.
- Per-staff permission tuning beyond "ordering only".
