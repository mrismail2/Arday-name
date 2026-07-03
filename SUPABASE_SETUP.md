# Kobciye — Supabase Setup Guide (Phase 2)

Step-by-step guide to stand up the backend foundation. When you finish this
page the database schema, security policies, storage buckets and environment
variables are all in place; the app itself keeps running on its local demo
store until Phase 3 flips modules over.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**.
2. Name: `kobciye` (any region close to your users, e.g. `eu-central-1`).
3. Save the **database password** you choose — the CLI needs it later.
4. When the project is ready, open **Settings → API** and copy:
   - **Project URL** — `https://<project-ref>.supabase.co`
   - **anon public** key

> Never copy the `service_role` key into the mobile app or the repo. It is
> for servers only and bypasses every security policy.

## 2. Environment variables

```bash
cd mobile
cp .env.example .env        # then edit .env
```

`.env` (placeholders — fill with your values):

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Notes:

- Expo only exposes variables prefixed `EXPO_PUBLIC_` to the app — that is
  the correct format for this project (Expo SDK 52).
- `mobile/.env` is listed in `.gitignore`; only `.env.example` is committed.
- Restart `npx expo start` after changing `.env` (values are inlined at
  bundle time).

## 3. Run the SQL migrations

With the Supabase CLI (recommended — repeatable):

```bash
npm i -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF     # asks for the db password
supabase db push                                 # applies supabase/migrations/*.sql in order
```

Without the CLI: open **SQL Editor** in the dashboard and paste each file in
`supabase/migrations/` **in filename order** (0001 → 0006), running each one.

The migrations are:

| # | File | What it creates |
|---|------|-----------------|
| 1 | `20260702000001_initial_schema.sql` | Core tables, enums, `HID-…` id generator, signup trigger |
| 2 | `20260702000002_rls_policies.sql` | Row Level Security for every table |
| 3 | `20260702000003_storage.sql` | `school-logos` + `student-photos` buckets and policies |
| 4 | `20260702000004_seed.sql` | Two demo schools, subjects, terms, grading rules |
| 5 | `20260702000005_saas_foundation.sql` | academic_years, school_members, subscriptions, audit_logs, parents, staff |
| 6 | `20260702000006_security_hardening.sql` | Blocks self-privilege-escalation on `profiles`; adds `provision_school()` / `assign_role()`; cross-school relationship guards |

## 3b. How anyone gets a real role (read this before inviting users)

Every signup lands as `role = 'pending'` with no `school_id` — a signup can
**never** choose its own role or school, even by tampering with the client.
There are exactly two sanctioned ways to become something else:

- **`select provision_school('My School', 'my-school-slug');`** (called by
  the signed-in user) — creates a brand-new school and makes the caller its
  first `school_admin`. Works once per account; can never attach to an
  *existing* school.
- **`select assign_role('<profile-id>', 'teacher', '<school-id>');`** —
  called by an existing `school_admin` (for their own school) or
  `super_admin`. Only a `super_admin` may grant `super_admin`.

To bootstrap your own first `super_admin` (there is no user yet who can
grant it), run this once in the SQL Editor as the project owner:

```sql
update profiles set role = 'super_admin' where id = '<your-auth-user-id>';
```

(This works from the SQL Editor because it runs without a client JWT; the
same statement is rejected if attempted through the app.)

## 4. Enable email/password authentication

1. Dashboard → **Authentication → Providers → Email**: make sure **Email** is
   enabled (it is by default).
2. While testing, you may turn **Confirm email** off so accounts work
   immediately; turn it back on before going live.
3. **Authentication → URL Configuration**:
   - Site URL: your web URL (or `http://localhost:8081` during development).
   - **Additional Redirect URLs** — add the mobile deep link used by password
     reset: `kobciye://reset` (and `exp://127.0.0.1:8081` while using Expo Go).

## 5. Storage

Migration 0003 already created the buckets — verify under **Storage**:

- `school-logos` — public read; only that school's admins can write.
  Path convention: `school-logos/<school_id>/logo.png`
- `student-photos` — private; school staff write, parents/students read only
  their own child/self. Path: `student-photos/<school_id>/<student_id>.jpg`

## 6. Manual dashboard checklist

- [ ] Project created, database password saved
- [ ] `mobile/.env` filled from Settings → API
- [ ] Migrations 0001–0006 applied (CLI `supabase db push` or SQL Editor)
- [ ] Email provider enabled; confirm-email set the way you want
- [ ] Redirect URLs added (`kobciye://reset`, dev URLs)
- [ ] Buckets `school-logos` and `student-photos` visible under Storage
- [ ] (Optional) Invite your own admin user under Authentication → Users,
      then set their row in `profiles` to `role = 'school_admin'` and the
      right `school_id`

## 7. What this does NOT change yet

Phase 2 is the foundation only. The app still uses its local demo store and
the preview login. Phase 3 wires real sign-in/sign-up to `mobile/src/services/supabase.js`
and migrates modules through `mobile/src/services/dataProvider.js` one by one.
