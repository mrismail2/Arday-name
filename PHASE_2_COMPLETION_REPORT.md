# Phase 2 Completion Report — Supabase Foundation

**Status: Complete** (foundation only, by design — no UI redesign, no fake
auth, all demo flows preserved).

## What was built

### Backend (`supabase/`)

| File | Contents |
|------|----------|
| `migrations/20260702000001_initial_schema.sql` | 21 core tables (schools, profiles, subjects, classes, class_subjects, teachers, teacher_classes, teacher_subjects, students, student_parents, terms, exam_windows, exams, results, attendance, payments, billing_records, incidents, messages, notices, grading_rules), 9 enums, `updated_at` triggers, per-school `HID-…` student-ID generator, `handle_new_user()` signup trigger |
| `migrations/20260702000002_rls_policies.sql` | RLS enabled on every table; role helper functions; per-role policies with comments |
| `migrations/20260702000003_storage.sql` | `school-logos` (public read) + `student-photos` (private) buckets with school/role-scoped object policies |
| `migrations/20260702000004_seed.sql` | Two demo schools, subjects, terms, grading rules |
| `migrations/20260702000005_saas_foundation.sql` | `academic_years`, `school_members`, `subscriptions`, `audit_logs`, `parents`, `staff` + their RLS |
| `config.toml`, `README.md` | CLI config + quick-start (Somali) |

**27 tables total**, all with `school_id` scoping where school-owned, UUID
PKs, timestamps, status fields, FKs, unique rules and indexes.

### Mobile app (`mobile/`)

- `@supabase/supabase-js` + `react-native-url-polyfill` added;
  sessions persist via the existing `@react-native-async-storage/async-storage`.
- `src/services/supabase.js` — single reusable client (env-vars only) +
  helpers Phase 3 will call: `signUpWithEmail`, `signInWithEmail`, `signOut`,
  `restoreSession`, `onAuthStateChange`, `resetPassword`, `updatePassword`,
  `getMyProfile`, storage URL helpers, `isSupabaseConfigured`.
- `src/services/dataProvider.js` — the migration seam: screens import data
  functions from one place; per-module `BACKENDS` switch flips local →
  Supabase in Phase 3 without screen rewrites. Today everything is served by
  the untouched AsyncStorage store.
- `.env.example` (placeholders only), `.env` git-ignored. No secrets in code;
  the service-role key is never used in the app.

### Documentation

- `SUPABASE_SETUP.md` — project creation, env vars, running migrations,
  enabling email/password auth, redirect URLs, dashboard checklist.
- `SUPABASE_SCHEMA.md` — every table, roles, RLS model, ID generation, ERD.
- This report.

## Security / RLS summary

- RLS on **all 27 tables** + storage objects; **no allow-all policies**.
- Helpers: `my_role()`, `my_school()`, `is_staff_of()`, `is_admin_of()`,
  `is_parent_of()`, `is_self_student()` (all `security definer`, fixed
  `search_path`).
- School isolation: every policy checks the row's `school_id` against the
  caller's school; superadmin passes everything.
- Parents: only rows about linked children (`student_parents`); students:
  only themselves; teachers: school reads + attendance/exams/results/incident
  writes (per-class narrowing lands in Phase 3 on `teacher_classes`);
  accountants: finance. `audit_logs` is insert-only.
- Roles live in the DB (`profiles.role`, `school_members`) — the app's role
  state is never trusted server-side.

## Verification performed

| Check | Result |
|-------|--------|
| All 5 migrations executed on real Postgres (pglite) in order | ✅ pass |
| Student-ID generator smoke test | ✅ `HID-000001` generated |
| One-current-academic-year rule | ✅ duplicate blocked |
| `npm run audit:foundation` (project's own QC script) | ✅ PASSED |
| `npx expo export --platform web` (production build) | ✅ exported |
| Browser smoke test (landing renders, login → dashboard, 0 JS errors) | ✅ pass |
| Lint / typecheck / unit tests | not configured in this project (no such scripts) |

## Manual actions required (Supabase dashboard)

See the checklist in `SUPABASE_SETUP.md` §6 — create project, fill
`mobile/.env`, `supabase db push`, enable Email provider, add redirect URLs.

## Left for Phase 3 (intentionally)

1. Real sign-in/sign-up wired to the landing login (preview login stays
   working until then — it is presentation-only, not fake auth).
2. Module-by-module data migration through `dataProvider.js`
   (students → attendance → exams/results → finance → messages).
3. Teacher narrowing to assigned classes/subjects in RLS write policies.
4. Photo/logo upload through the storage buckets.
5. Push notifications, file attachments, reports (schema is ready).
