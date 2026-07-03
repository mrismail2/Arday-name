# Phase 2 Completion Report — Supabase Foundation

**Status: Complete** (foundation only, by design — no UI redesign, no fake
auth, all demo flows preserved, no feature modules migrated).

> **Revision history:**
> - *Rev 1* declared Phase 2 complete before a security review caught a
>   critical bug (signup trusted client-supplied `role`/`school_id`).
> - *Rev 2* fixed that plus a related self-service `profiles` UPDATE hole
>   and added cross-school data-integrity triggers — but an **independent**
>   second review found the fix was incomplete: `SECURITY DEFINER`
>   functions (notably `next_student_id()`) still had their default
>   `PUBLIC`/`anon`/`authenticated` `EXECUTE` grant, and the profile guard
>   trigger had a `school_admin` exception that let an admin bypass
>   `assign_role()`'s audit trail through a direct table `UPDATE`. It also
>   noted the round-1 report asserted things (like the RLS test suite)
>   without committing runnable evidence.
> - **This revision (Rev 3)** fixes both gaps (migration `0007`), commits
>   an executable test suite (`supabase/tests/`, 36 assertions, run under
>   Postgres role `authenticated`/`anon` — not superuser — so RLS is
>   actually exercised, not bypassed), and reports real command output
>   below rather than a description of what should happen.

## What was built (cumulative across all 3 revisions)

### Backend (`supabase/`)

| File | Contents |
|------|----------|
| `migrations/20260702000001_initial_schema.sql` | 22 core tables, 9 enums (incl. `pending`), `HID-###` student-ID generator, signup trigger |
| `migrations/20260702000002_rls_policies.sql` | RLS on every table; role helper functions; per-role policies |
| `migrations/20260702000003_storage.sql` | `school-logos` / `student-photos` buckets + policies |
| `migrations/20260702000004_seed.sql` | Two demo schools, subjects, terms, grading rules |
| `migrations/20260702000005_saas_foundation.sql` | `academic_years`, `school_members`, `subscriptions`, `audit_logs`, `parents`, `staff` + RLS |
| `migrations/20260702000006_security_hardening.sql` | Round 1: signup can't self-grant a role; `provision_school()`/`assign_role()`; cross-school guards |
| `migrations/20260702000007_security_hardening_2.sql` | **New.** Round 2: removes the `school_admin` bypass from the profile guard; drops `school_members`' write policy entirely; revokes `EXECUTE` on every write-capable `SECURITY DEFINER` function from `public`/`anon`/`authenticated` |
| `tests/security.test.js`, `tests/package.json` | **New.** 36-assertion executable security test suite (see below) |
| `config.toml`, `README.md` | CLI config + quick-start (Somali) |

**27 tables**, all `school_id`-scoped where school-owned, UUID PKs,
timestamps, FKs, unique rules, indexes.

### Mobile app (`mobile/`) — unchanged this revision

No UI or client code changed in this round; `supabase.js` already exposed
`provisionSchool`/`assignRole`/`updateMyProfile` from the previous revision
and none of those call signatures changed.

## Security fixes — round 2 (this revision)

### 1. `SECURITY DEFINER` functions were callable by anyone — FIXED

`next_student_id(uuid)` mutates `schools.next_student_sequence` and is
`SECURITY DEFINER`, but had never had its default `EXECUTE` grant touched —
any `anon` or `authenticated` caller could invoke it directly
(`select next_student_id('<any-school-uuid>')`) to burn through or
desynchronize a school's ID counter, including a school they have no
access to. A **Supabase project additionally pre-grants `EXECUTE` on every
public-schema function to `anon`/`authenticated`** at bootstrap (`ALTER
DEFAULT PRIVILEGES`), so revoking from `PUBLIC` alone — which is all a
naive fix would do — is not sufficient; migration `0007` revokes from
`public`, `anon`, and `authenticated` explicitly for every sensitive
function, and the test suite reproduces that same default-grant behavior so
the revokes are proven against a realistic starting state.

Fixed by:
- `revoke all on function next_student_id(uuid) from public, anon, authenticated;`
- Making `students_fill_student_id()` (the trigger that calls it)
  `SECURITY DEFINER` too, so its internal call to `next_student_id()` runs
  as the function *owner* (who always has implicit execute on functions
  they own) rather than the original client role — this is what makes "only
  reachable through the insert trigger" actually true instead of aspirational.
- Every other `SECURITY DEFINER` trigger function reviewed and locked down
  the same way (defense-in-depth — trigger functions can't be invoked
  directly by clients regardless, but the grant is removed anyway).
- The 6 read-only RLS helper functions (`my_role`, `my_school`,
  `is_staff_of`, `is_admin_of`, `is_parent_of`, `is_self_student`)
  deliberately **kept** `EXECUTE` for `anon`/`authenticated` — they run
  inside every RLS policy expression as the querying client, so revoking
  them would break RLS itself, not improve it.
- `provision_school`/`assign_role` granted to `authenticated` only.

### 2. `school_admin` could bypass `assign_role()` via direct table UPDATE — FIXED

Round 1's `guard_profile_privileged_fields()` trigger let
`role`/`school_id` change if `is_admin_of(old.school_id) or
is_admin_of(new.school_id)` — meaning a `school_admin` could
`UPDATE profiles SET role = 'accountant' WHERE id = '<colleague>'` directly
through the table API and it would succeed, silently skipping
`assign_role()`'s authorization checks and its `audit_logs` entry.

Fixed by removing that exception entirely. The trigger now has **exactly
one** way through: a transaction-local flag
(`kobciye.bypass_profile_guard`) set only inside `provision_school()`/
`assign_role()` around their own `UPDATE` — both RPCs still do their own
authorization checks (caller must be `school_admin` of the target school or
`super_admin`; only `super_admin` may grant `super_admin`) *before* setting
the flag, so the authorization logic moved from "trigger checks who you
are" to "the only door in is guarded by the RPC", which is a strictly
narrower surface. `school_members` also had its `"admins manage
memberships"` policy dropped outright — it is now 100% system-managed
(written only by `sync_primary_membership()`, itself gated by the same
profile-guard trigger), so no client, `school_admin` included, has any
INSERT/UPDATE/DELETE path to it anymore.

## Security tests (new, committed, executable)

```
supabase/tests/security.test.js   — the suite
supabase/tests/package.json       — pin @electric-sql/pglite
```

**Run it:**
```bash
cd supabase/tests
npm install
npm test
```

**What it does:** applies migrations `0001`–`0007` to a real, disposable
Postgres instance (`@electric-sql/pglite` — an actual embedded Postgres
engine, not a mock or stub), reproduces Supabase's default `anon`/
`authenticated` grants, then runs every operation **as Postgres role
`authenticated` or `anon` via `SET ROLE`** — not as the session superuser —
so Row Level Security is genuinely exercised. (An earlier draft of this
suite ran everything as superuser, which bypasses RLS entirely and made
several assertions pass for the wrong reason; that was caught and fixed
before this report was written — see the row-count-vs-exception handling
in `writeIsBlocked()` for the specific bug: an UPDATE/DELETE with no
matching RLS policy affects 0 rows silently, it does not raise.)

**Actual output of the last run** (2026-07-03, this revision):

```
applied 20260702000001_initial_schema.sql
applied 20260702000002_rls_policies.sql
applied 20260702000003_storage.sql
applied 20260702000004_seed.sql
applied 20260702000005_saas_foundation.sql
applied 20260702000006_security_hardening.sql
applied 20260702000007_security_hardening_2.sql

PASS signup metadata role=super_admin ignored -> pending, no school
PASS signup metadata full_name still copied (harmless field)
PASS signup metadata role=school_admin ignored -> pending
PASS self UPDATE role=super_admin blocked
PASS self UPDATE school_id blocked
PASS self UPDATE of full_name/phone still allowed
PASS provision_school makes caller school_admin of the NEW school
PASS provision_school is audited
PASS provision_school refuses an account that already has a school
PASS school_admin still cannot self-grant super_admin
PASS school_admin can assign_role within their own school
PASS assign_role is audited
PASS a teacher cannot call assign_role on themself
PASS school_admin cannot grant super_admin via assign_role
PASS school_admin cannot change ANOTHER profile.role via direct UPDATE (must use assign_role)
PASS school_admin cannot change ANOTHER profile.school_id via direct UPDATE
PASS school_admin cannot INSERT school_members directly
PASS school_admin cannot UPDATE school_members directly
PASS school_admin cannot DELETE school_members directly
PASS school_members was still correctly synced by the system trigger (role=teacher)
PASS school_admin of A cannot UPDATE school B's row
PASS school_admin of A cannot assign_role into school B
PASS school_admin of A cannot INSERT a class into school B (RLS)
PASS anon role cannot call next_student_id() directly (EXECUTE revoked)
PASS authenticated role cannot call next_student_id() directly (EXECUTE revoked)
PASS next_student_id still works internally via the insert trigger (HID-### format)
PASS RLS helper functions (my_role/my_school/is_admin_of) remain callable by authenticated
PASS class_subjects rejects a cross-school pair
PASS class_subjects allows a same-school pair (positive control)
PASS teacher_classes rejects a cross-school pair
PASS a student cannot be assigned a class from another school
PASS results rejects an exam from another school
PASS attendance rejects a class from another school
PASS student_parents rejects a parent from another school
PASS all 27 protected tables exist
PASS RLS is enabled on every one of them
PASS user_role enum is the standardized set

All assertions passed.
```

**36/36 assertions pass.** Coverage against the review's required list:

| Required test | Covered by |
|---|---|
| signup metadata cannot grant `super_admin`/`school_admin` | assertions 1–3 |
| normal user cannot change `role`/`school_id` | assertions 4–5 |
| `school_admin` cannot bypass `assign_role()` via direct `profiles` UPDATE | assertions 15–16 |
| `school_admin` cannot modify another school | assertions 20–22 |
| public/anon cannot call `next_student_id()` directly | assertions 23–24 |
| cross-school relationship inserts rejected | assertions 28–34 |
| safe profile updates still work | assertion 6 |
| RLS remains enabled on all protected tables | assertions 35–36 |

## Verification performed (this revision)

| Check | Command | Result |
|-------|---------|--------|
| Security test suite | `cd supabase/tests && npm install && npm test` | ✅ **36/36 pass** (output above) |
| Project audit script | `cd mobile && npm run audit:foundation` | ✅ PASSED — "70 active files scanned — no forbidden tokens"; "11 classes... 112 students... 5 results + 9 exams — all references valid" |
| Production web build | `cd mobile && npx expo export --platform web` | ✅ Exported (`_expo/static/js/web/AppEntry-*.js`, `index.html`, `favicon.ico`) |
| Lint / typecheck / unit tests | — | Not configured in this project (no such npm scripts exist) |

## Manual actions required (Supabase dashboard)

Unchanged from the previous revision — see `SUPABASE_SETUP.md` §3a (run the
security tests yourself), §3b (bootstrapping the first `super_admin`), and
§6 (full checklist).

## Left for Phase 3 (intentionally)

1. Real sign-in/sign-up wired to the landing login, using
   `provisionSchool()`/`assignRole()` for onboarding (preview login stays
   working until then).
2. Module-by-module data migration through `dataProvider.js`.
3. Teacher narrowing to assigned classes/subjects in RLS write policies.
4. Photo/logo upload through the storage buckets.
5. Push notifications, file attachments, reports.
6. DB↔app role-key mapping layer (see `SUPABASE_SCHEMA.md` → Roles).
