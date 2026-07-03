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
| `students` | Core student record. `student_id` is the public display ID (`HID-000001`) generated per school by the `next_student_id()` function + trigger — no duplicates possible (unique `(school_id, student_id)` and a row-locked counter). |
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

Role values match the app's internal codes 1:1 (no mapping layer):

| DB value | App label | Scope |
|----------|-----------|-------|
| `superadmin` | Super Admin | Platform owner — manages all schools |
| `schooladmin` | Maamulaha Dugsiga | Everything inside their school |
| `teacher` | Macalin | School data; writes attendance/exams/results/incidents |
| `accountant` | Xisaabiye | Finance inside the school |
| `parent` | Waalid | Only rows about their linked children |
| `student` | Arday | Only rows about themselves |

Role data lives in the database (`profiles.role`, `school_members.role`) and
is enforced by RLS — the mobile app's role state is presentation only and is
never trusted by the backend.

## Row Level Security (how it works)

RLS is enabled on **every** table; there are no allow-all policies. Policies
are built from four `security definer` helper functions:

- `my_role()` / `my_school()` — the caller's role and school from `profiles`
- `is_staff_of(school)` — admins/teachers/accountants of that school (staff
  enter together through the school section, mirroring the login)
- `is_admin_of(school)` — school admin of that school, or superadmin
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

`students.student_id` display IDs (e.g. `HID-000001`) are produced by
`next_student_id(school_id)`: it locks the school row, increments
`next_student_sequence`, and formats `prefix || '-' || lpad(seq, 6, '0')`.
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
