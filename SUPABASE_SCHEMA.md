# Kobciye — Database Schema Reference (Phase 2)

Multi-school (multi-tenant) SaaS schema. Every school-owned row carries a
`school_id`; Row Level Security guarantees a school only ever sees its own
rows. UUID primary keys throughout; `created_at`/`updated_at` timestamps and
status fields where useful.

## Tenancy & people

| Table | Purpose |
|-------|---------|
| `schools` | One row per school (tenant). Holds plan, status, logo, and the per-school student-ID generator (`student_id_prefix`, `next_student_sequence`). |
| `profiles` | One row per **auth user** (`id` = `auth.users.id`, created automatically by the `handle_new_user()` trigger on signup). Carries the user's primary `role` and `school_id`. |
| `school_members` | Membership + role per school. Auto-synced from `profiles` for the single-school case; lets one person hold roles in several schools later. |
| `subscriptions` | Per-school plan/billing state (`trialing → active → past_due → canceled`), first-month-free trial field, price per student. One non-canceled row per school. |
| `audit_logs` | Append-only action trail (`actor`, `action`, `entity`, `detail` JSON). Insert-only by design — no update/delete policies exist. |

## Academics

| Table | Purpose |
|-------|---------|
| `academic_years` | School year container (`2026/2027`); only one `is_current` per school (partial unique index). |
| `terms` | Term 1/2/3 per school; optional `academic_year_id`. |
| `classes` | Form 5A … per school, with capacity + status. |
| `subjects` | Xisaab, Sayniska … unique per school. |
| `class_subjects` | Which subjects a class takes (join table). |

## People in a school

| Table | Purpose |
|-------|---------|
| `students` | Core student record. `student_id` is the public display ID (`HID-001`) generated per school by the `next_student_id()` function + trigger — no duplicates possible (unique `(school_id, student_id)` and a row-locked counter). |
| `parents` | Parent directory per school; `profile_id` links to a login once the parent has one. |
| `student_parents` | Parent ↔ child links (by parent login and/or directory row). Drives everything a parent may see. |
| `teachers` | Teacher directory; `teacher_classes` / `teacher_subjects` record assignments — the basis for Phase 3 “teachers only touch their own classes/subjects” rules. |
| `staff` | Non-teaching staff (school admins, accountants). |

## Module tables (ready for Phase 3 features)

`exam_windows` (admin opens marking window for a teacher/subject/term),
`exams`, `results` (score, computed percentage, publish flag), `attendance`,
`payments`, `billing_records`, `incidents`, `messages`, `notices`,
`grading_rules`. All carry `school_id` and already have RLS, so attendance,
finance, exams/results, messaging and notifications modules can be built on
them without schema rework. Files/photos live in the two storage buckets.

## Roles

| DB value (`user_role` enum) | App key (`mobile/src/data/roles.js`) | App label | Scope |
|---|---|---|---|
| `super_admin` | `superadmin` | Super Admin | Platform owner — manages all schools |
| `school_admin` | `schooladmin` | Maamulaha Dugsiga | Everything inside their school |
| `teacher` | `teacher` | Macalin | School data; writes attendance/exams/results/incidents |
| `accountant` | `accountant` | Xisaabiye | Finance inside the school |
| `parent` | `parent` | Waalid | Only rows about their linked children |
| `student` | `student` | Arday | Only rows about themselves |
| `pending` | *(none yet)* | — | No school, no access — the only role a public signup can ever receive |

The DB enum uses `super_admin`/`school_admin` (snake_case, matching the
spec); the frontend's preview-only role keys are `superadmin`/`schooladmin`
(no underscore, unchanged from Phase 1 to avoid touching the UI). Phase 3's
auth wiring is where these two get mapped — do it in one place (e.g. a
`DB_ROLE_TO_APP_ROLE` table next to `dataProvider.js`), not scattered across
screens.

Role data lives in the database (`profiles.role`, `school_members.role`) and
is enforced by RLS — the mobile app's role state is presentation only and is
never trusted by the backend. **A role can only ever change through
`provision_school()` or `assign_role()`** (see "Privilege escalation
defenses" below) — nothing else, including the user themself, may write
`profiles.role` or `profiles.school_id`.

## Privilege escalation defenses (Phase 2 security hardening)

Three independent layers, each closing a different hole:

1. **`handle_new_user()`** (signup trigger) never reads `role` or
   `school_id` from `raw_user_meta_data` — that field is client-supplied and
   trivially forgeable (`{"role":"super_admin"}`). Every signup becomes
   `role = 'pending'`, `school_id = null`, full stop.
2. **`guard_profile_privileged_fields()`** (BEFORE UPDATE trigger on
   `profiles`) — RLS's `"update own profile"` policy lets a user UPDATE
   their own row, but RLS only filters *rows*, not *columns*; without this
   trigger a user could still `UPDATE profiles SET role = 'super_admin'
   WHERE id = auth.uid()`. The trigger inspects the column-level diff and
   rejects any change to `role`/`school_id` unless the caller is already a
   `school_admin` of the relevant school or a `super_admin` — RLS
   structurally cannot express that check.
3. **`provision_school()`** / **`assign_role()`** — the only two
   `security definer` RPCs allowed to move a profile out of `pending`.
   Every call is written to `audit_logs`. `school_members`, `subscriptions`
   and other privileged tables have no self-service write policy at all
   (default-deny — a normal user simply has no INSERT/UPDATE grant on them).

## Cross-school data integrity

Every relationship/join table has a `BEFORE INSERT OR UPDATE` guard trigger
that re-checks the `school_id` of both sides and rejects the write if they
differ — independent of RLS, so it holds even for a school admin acting on
their own school's data or a bug in a future admin screen:
`class_subjects`, `teacher_classes`, `teacher_subjects`, `students.class_id`,
`exam_windows`, `exams`, `results`, `attendance`, `student_parents`.

## Row Level Security (how it works)

RLS is enabled on **every** table; there are no allow-all policies. Policies
are built from four `security definer` helper functions:

- `my_role()` / `my_school()` — the caller's role and school from `profiles`
- `is_staff_of(school)` — admins/teachers/accountants of that school (staff
  enter together through the school section, mirroring the login)
- `is_admin_of(school)` — school admin of that school, or super_admin
- `is_parent_of(student)` / `is_self_student(student)` — parent-link / self checks

Pattern per table: school members **read** school-scoped rows; the owning
role **writes** (admins manage, teachers write attendance/exams/results,
accountants write finance); parents/students get narrow SELECTs tied to
their links. Superadmin passes every check. Each policy carries a SQL
comment in the migration files explaining its intent.

Storage follows the same model: object paths start with the school UUID and
policies parse it (`storage_school(name)`) to apply the same school/role
checks to files.

## ID generation

`students.student_id` display IDs (e.g. `HID-001`) are produced by
`next_student_id(school_id)`: it locks the school row, increments
`next_student_sequence`, and formats `prefix || '-' || lpad(seq, 3, '0')`.
Per-school, gap-free enough, duplicate-proof under concurrency, and the
prefix is configurable per school (`HID`, `NUR`, …) to match the app's
Settings screen.

## Entity relationships (core)

```
schools ─┬─ profiles ─── school_members
         ├─ academic_years ─── terms
         ├─ classes ─┬─ class_subjects ─── subjects
         │           └─ students ─┬─ student_parents ─── parents / profiles(parent)
         │                        ├─ results / attendance / payments / incidents
         │                        └─ profiles(student login)
         ├─ teachers ─┬─ teacher_classes / teacher_subjects
         │            └─ exam_windows ─── exams ─── results
         ├─ subscriptions / audit_logs / staff
         └─ messages / notices / grading_rules / billing_records
```
