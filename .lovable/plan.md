# Cross-device sync with Lovable Cloud

Goal: a user's settings, staff list, reservations, and table layout follow them across devices when they sign in to the same account. App updates won't wipe their data because it lives in the backend, not localStorage.

## 1. Enable Lovable Cloud
Provision the backend (database + auth + storage). No user action needed beyond approving the prompt.

## 2. Authentication
- Email/password signup + login
- Google sign-in (via Lovable's managed broker)
- Replace the current local `LoginScreen` (which just sets a name string) with real auth.
- Route gating: move the app shell under `_authenticated/` so unauthenticated users land on `/auth`.
- Sign-out button in Sidebar.

## 3. Database schema (per-user, RLS-protected)
All tables keyed by `user_id = auth.uid()` with RLS policies so each user only sees their own rows.

```text
profiles         (id=auth.uid, display_name, created_at)
user_settings    (user_id PK, settings jsonb)        -- app prefs, sync config, app name override
staff            (id, user_id, name, role, ...)
tables           (id, user_id, name, seats, x, y, ...)
guests           (id, user_id, name, party_size, date, time, status,
                  table_name, phone, notes, ...)
```
RLS: `user_id = auth.uid()` for select/insert/update/delete on each table. `profiles` auto-created via trigger on signup.

## 4. Data layer refactor
- Add server functions in `src/lib/`:
  - `guests.functions.ts` — list / upsert / delete
  - `staff.functions.ts` — list / upsert / delete
  - `tables.functions.ts` — list / upsert / delete
  - `settings.functions.ts` — get / save
- All use `requireSupabaseAuth` so they run as the signed-in user.
- Replace `localStorage` reads/writes in `App.tsx` with TanStack Query (`useSuspenseQuery` + mutations that invalidate).
- Keep an optimistic-update pattern so the UI still feels instant.

## 5. Migration of existing local data
On first login, detect any existing `localStorage` guest/staff/table data and offer a one-click "Import local data to your account" action in `SyncConfigPanel`. After import, clear local copies.

## 6. Update existing UI
- `LoginScreen` → real auth form (email/password + Google button) or replace with redirect to `/auth`.
- `SyncConfigPanel` — export/import still works, but now reads from the cloud; add an "Account" section showing the signed-in email and a sign-out button.
- `EntryModal`, `ReservationsView`, `TableMapView`, `StaffManagerModal`, `DashboardView` — swap their props/state sources from local arrays to query hooks. The occupied-table logic added previously stays the same.

## 7. What this guarantees
- App updates (new features, layout changes, bug fixes) never touch user data — it lives in the database, not the deployed bundle.
- Signing into the same account on phone + desktop + another browser shows the exact same guests, staff, tables, and preferences.
- Signing out leaves no personal data on the device.

## Technical notes
- Use the integration-managed `_authenticated/route.tsx` gate (don't author it).
- `attachSupabaseAuth` must be wired in `src/start.ts` (verify after Cloud is on).
- Google provider requires `supabase--configure_social_auth` in the same turn it's added.
- Settings stored as a single `jsonb` blob keeps schema simple and forward-compatible with future preference keys.
- No service-role usage on the client; all writes via authenticated server fns.

Approve to proceed and I'll enable Cloud, run the schema migration, wire auth, and refactor the data layer in that order.