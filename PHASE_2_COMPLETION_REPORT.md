# Phase 2 Completion Report — Supabase Foundation

**Status: Complete** (foundation only, by design — no UI redesign, no fake
auth, all demo flows preserved).

> **Revision note:** an initial version of this report was marked Complete
> before a security review caught a critical privilege-escalation bug (the
> signup trigger trusted client-supplied `role`/`school_id`) plus a related
> hole (RLS let a user rewrite their own `role`/`school_id` via a normal
> profile UPDATE) and missing cross-school data-integrity checks. Both are
> fixed below (migration `0006`), re-verified with a dedicated security test
> suite, and this report has been rewritten to describe the fixed state
> honestly — see "Security fixes" for exactly what was wrong and what
> changed.

## What was built

### Backend (`supabase/`)

| File | Contents |
|------|----------|
| `migrations/20260702000001_initial_schema.sql` | 22 core tables, 9 enums (incl. `pending` role), `updated_at` triggers, per-school `HID-###` student-ID generator, signup trigger (now safe — see below) |
| `migrations/20260702000002_rls_policies.sql` | RLS enabled on every table; role helper functions; per-role policies with comments |
| `migrations/20260702000003_storage.sql` | `school-logos` (public read) + `student-photos` (private) buckets with school/role-scoped object policies |
| `migrations/20260702000004_seed.sql` | Two demo schools, subjects, terms, grading rules |
| `migrations/20260702000005_saas_foundation.sql` | `academic_years`, `school_members`, `subscriptions`, `audit_logs`, `parents`, `staff` + their RLS |
| `migrations/20260702000006_security_hardening.sql` | **New.** Privilege-escalation fixes, `provision_school()`/`assign_role()`, cross-school relationship guards |
| `config.toml`, `README.md` | CLI config + quick-start (Somali) |

**27 tables total**, all with `school_id` scoping where school-owned, UUID
PKs, timestamps, status fields, FKs, unique rules and indexes.

### Mobile app (`mobile/`)

- `@supabase/supabase-js` + `react-native-url-polyfill`; sessions persist via
  `@react-native-async-storage/async-storage`.
- `src/services/supabase.js` — client + helpers: `signUpWithEmail` (only
  sends `full_name`, never role/school_id), `signInWithEmail`, `signOut`,
  `restoreSession`, `onAuthStateChange`, `resetPassword`, `updatePassword`,
  `getMyProfile`, `updateMyProfile` (safe fields only), **`provisionSchool`**,
  **`assignRole`** (new — thin wrappers over the secure RPCs), storage URL
  helpers, `isSupabaseConfigured`.
- `src/services/dataProvider.js` — the migration seam for Phase 3.
- `.env.example` (placeholders only), `.env` git-ignored. No secrets in code;
  the service-role key is never used in the app.

### Documentation

- `SUPABASE_SETUP.md` — setup steps + **new**: how anyone gets a real role,
  how to bootstrap the first `super_admin`.
- `SUPABASE_SCHEMA.md` — tables, roles (DB↔app key mapping), **new**:
  "Privilege escalation defenses" and "Cross-school data integrity" sections.
- This report.

## Security fixes (this revision)

### 1. CRITICAL — signup could self-grant `super_admin` — FIXED

`handle_new_user()` used to do
`coalesce((raw_user_meta_data ->> 'role')::user_role, 'student')` —
`raw_user_meta_data` is supplied by the client at signup, so any caller
could send `{"role":"super_admin"}` and get it. Fixed: the trigger now
**always** inserts `role = 'pending'`, `school_id = null`, and reads nothing
but `full_name` from metadata. Verified with a signup that sends
`{"role":"super_admin","school_id":"..."}` and asserts the resulting profile
is `pending`/`null`.

Role/school assignment now only happens through two audited
`security definer` RPCs:
- **`provision_school(name, slug, location)`** — a `pending` account creates
  a brand-new school and becomes its first `school_admin`. Works once per
  account; can never attach to an *existing* school (verified).
- **`assign_role(profile_id, role, school_id)`** — an existing `school_admin`
  (within their own school) or `super_admin` assigns a role. Only
  `super_admin` may grant `super_admin` (verified both directions).

### 2. CRITICAL — a user could rewrite their own `role`/`school_id` — FIXED

The `"update own profile"` RLS policy (`using (id = auth.uid())`) correctly
scoped *rows*, but RLS cannot scope *columns* — nothing stopped
`UPDATE profiles SET role = 'super_admin' WHERE id = auth.uid()` from
passing that same policy. Fixed with a `BEFORE UPDATE` trigger,
`guard_profile_privileged_fields()`, that inspects the column-level diff and
rejects any `role`/`school_id` change unless the caller is already an admin
of the relevant school (or `super_admin`), with an extra check that only
`super_admin` may grant `super_admin`. `full_name`/`phone`/`avatar_url`
remain freely self-editable. Verified: self-escalation blocked; safe-field
self-update still works; a `school_admin` still cannot self-grant
`super_admin`.

`school_members` and `subscriptions` were already default-deny for normal
users (no self-service write policy exists) — confirmed, no change needed
there.

### 3. Role values standardized — DONE

Enum renamed `superadmin`/`schooladmin` → `super_admin`/`school_admin`
(snake_case) everywhere: the enum, every RLS policy/helper function, the
`staff` role check, migration 0005, and both schema docs. `pending` was
added as the seventh (default, zero-access) role. The mobile app's internal
preview-only role *keys* (`superadmin`/`schooladmin`, no underscore) were
**not** renamed — that would touch 100+ UI call sites for no functional
gain before Phase 3 exists to consume them. `SUPABASE_SCHEMA.md` now
documents the DB↔app key mapping explicitly so Phase 3 does it in one place.

### 4. Student IDs — DONE

Default prefix changed `KOB` → `HID`; format changed from 6-digit
(`HID-000001`) to the requested 3-digit (`HID-001`, `HID-002`, `HID-003`).
Uniqueness stays scoped per school (`unique (school_id, student_id)` +
row-locked sequence — verified no duplicates possible under the same
generator logic, only the padding width changed).

### 5. Cross-school data integrity — DONE

`BEFORE INSERT OR UPDATE` guard triggers (independent of RLS — hold even for
an admin or a future buggy screen) now reject any row that connects records
from two different schools: `class_subjects`, `teacher_classes`,
`teacher_subjects`, `students.class_id`, `exam_windows`, `exams`, `results`,
`attendance`, `student_parents`. Each was tested with both a rejected
cross-school pair and a positive-control same-school pair.

## Verification performed

| Check | Result |
|-------|--------|
| All 6 migrations executed on real Postgres (pglite) in order | ✅ pass |
| **Security suite (22 assertions, dedicated script)** | ✅ **all 22 pass** |
| — signup metadata cannot set role/school_id | ✅ |
| — self UPDATE of role/school_id blocked; safe fields still work | ✅ |
| — `provision_school` one-time-only, new-school-only, audited | ✅ |
| — `assign_role` scoped to caller's own school; super_admin-only grant of super_admin | ✅ |
| — cross-school rejected for all 7 relationship tables + positive control | ✅ |
| — `user_role` enum is the standardized 7-value set | ✅ |
| Student-ID format `HID-###` | ✅ `HID-001` generated |
| One-current-academic-year rule | ✅ duplicate blocked |
| `npm run audit:foundation` (project's own QC script) | ✅ PASSED |
| `npx expo export --platform web` (production build) | ✅ exported |
| Browser smoke test (landing renders, login → dashboard, 0 JS errors) | ✅ pass |
| Lint / typecheck / unit tests | not configured in this project (no such scripts) |

## Manual actions required (Supabase dashboard)

See `SUPABASE_SETUP.md` §3b for bootstrapping the first `super_admin`, and
§6 for the full checklist (create project, fill `mobile/.env`,
`supabase db push`, enable Email provider, add redirect URLs).

## Left for Phase 3 (intentionally)

1. Real sign-in/sign-up wired to the landing login, using
   `provisionSchool()`/`assignRole()` for onboarding (preview login stays
   working until then — it is presentation-only, not fake auth).
2. Module-by-module data migration through `dataProvider.js`
   (students → attendance → exams/results → finance → messages).
3. Teacher narrowing to assigned classes/subjects in RLS write policies
   (the assignment tables already exist and are now cross-school-safe).
4. Photo/logo upload through the storage buckets.
5. Push notifications, file attachments, reports (schema is ready).
6. DB↔app role-key mapping layer (see `SUPABASE_SCHEMA.md` → Roles).
