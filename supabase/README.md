# Kobciye — Phase 2: Supabase Backend

Backend foundation-ka Kobciye: database schema, migrations, row-level
security (RLS), storage buckets, iyo environment setup.

## Waxa ku jira

```
supabase/
├── config.toml                                # supabase CLI project config
└── migrations/
    ├── 20260702000001_initial_schema.sql      # tables, enums, triggers, id generator
    ├── 20260702000002_rls_policies.sql        # amniga door kasta (RLS)
    ├── 20260702000003_storage.sql             # buckets: school-logos, student-photos
    └── 20260702000004_seed.sql                # 2 dugsi, maadooyinka, terms, grading
```

## 1. Samee Supabase project

1. Aad [supabase.com](https://supabase.com) → **New Project** (magac: `kobciye`).
2. Kaydi **Database Password**-ka aad dooratay.
3. **Settings → API** ka qaado:
   - `Project URL` (https://xxxx.supabase.co)
   - `anon public` key

## 2. Ku shub migrations-ka (Supabase CLI)

```bash
npm i -g supabase             # hal mar
supabase login
supabase link --project-ref <PROJECT-REF>   # ref-ka URL-kaaga
supabase db push              # waxay ku shubtaa 4-ta migration isku xigxiga
```

**Ama CLI la'aan:** Dashboard → **SQL Editor** → migration kasta koobi geli
oo socodsii isku xigxiga (0001 → 0002 → 0003 → 0004).

## 3. Environment setup (mobile app)

```bash
cd mobile
cp .env.example .env
# .env geli URL-ka iyo anon key-ga project-kaaga:
#   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
#   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
npm install                   # @supabase/supabase-js horey ayuu ugu jiraa package.json
npm run web                   # ama: npx expo start
```

Client-ka: `mobile/src/services/supabase.js` — `.env` la'aan app-ku wuxuu sii
isticmaalaa keydka local-ka ah (prototype), marka `.env` la buuxiyo
`isSupabaseConfigured()` waa `true` oo backend-ka la isticmaali karaa.

`.env` waa **secret** — `.gitignore` ayuu ku jiraa, ha commit-garayn.

## 4. Qaab-dhismeedka database-ka

| Miis | Waxa uu hayo |
|---|---|
| `schools` | dugsiyada + prefix-ka ID ardayda (HID, NUR…) iyo sequence-ka |
| `profiles` | isticmaale kasta (auth) + `role` + dugsiga uu ka tirsan yahay |
| `subjects`, `classes`, `class_subjects` | maadooyinka iyo fasallada dugsi kasta |
| `teachers`, `teacher_classes`, `teacher_subjects` | macalimiinta iyo xilkooda |
| `students`, `parent_students` | ardayda + xiriirka waalidka ↔ ilmaha |
| `terms`, `exam_windows`, `exams`, `results` | imtixaannada (admin ayaa fura windows) |
| `attendance` | xaadiriska (hal diiwaan arday/maalin) |
| `payments`, `billing_records` | maaliyadda |
| `incidents`, `messages`, `notices` | kiisaska, fariimaha, ogeysiisyada |
| `grading_rules` | heerarka darajooyinka dugsi kasta |

**Otomaatig:**
- Arday cusub oo aan `student_id` lahayn → trigger ayaa siiya ID-ga xiga
  ee dugsigiisa (`HID-000142` …) isaga oo sequence-ka si ammaan ah u kordhinaya.
- Auth signup kasta → row `profiles` ah ayaa toos loogu abuuraa
  (`full_name` iyo `role` waxaa laga akhriyaa user metadata).

## 5. Amniga (RLS) — sida app-ka oo kale

Doorka wuxuu ka imanayaa login-ka (landing): **Dugsiga** (maamule &
macalin), **Waalid**, **Arday**.

| Door | Waxa uu arki/qori karaa |
|---|---|
| `superadmin` | wax walba |
| `schooladmin` | wax walba dugsigiisa gudihiisa |
| `teacher` | xogta dugsiga; wuxuu qoraa xaadiris, imtixaanno, natiijooyin, kiisas |
| `accountant` | maaliyadda dugsigiisa |
| `parent` | kaliya xogta caruurtiisa (natiijooyin la daabacay, xaadiris, lacago) |
| `student` | kaliya xogtiisa |

## 6. Storage

| Bucket | Access | Path |
|---|---|---|
| `school-logos` | public read; admin-ka dugsiga ayaa qori kara | `<school_id>/logo.png` |
| `student-photos` | private; staff-ka dugsiga + waalid/arday (kooda) | `<school_id>/<student_uuid>.jpg` |

Helpers: `schoolLogoUrl()` iyo `studentPhotoUrl()` — `mobile/src/services/supabase.js`.

## 7. Local development (ikhtiyaari)

```bash
supabase start        # Docker ku socodsii Postgres + Auth + Storage local ahaan
supabase db reset     # migrations + seed dib u shub
# Studio: http://localhost:54323
```

---
**Phase-ka xiga (Phase 3):** screens-ka app-ka in laga beddelo keydka
local-ka ah (AsyncStorage) loona wareejiyo Supabase queries + auth dhab ah.
