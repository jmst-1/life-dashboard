**Ask mode:** I can’t write `DOCUMENTATION.md` to disk. Switch to Agent mode and ask me to save it, or copy the markdown below.

---

# Life Dashboard — Technical Documentation

## 1. Product Overview

**Life Dashboard** is a weekly operating system for training, habits, and nutrition. Users plan a Monday-start week, execute day-by-day on **Today**, glance forward on **Ahead**, and close/review weeks on **Log**. Claude (`claude-sonnet-4-6`) generates AI coaching plans and meal-prep briefs; calorie/macro math and mobility picks stay deterministic TypeScript.

### Two deployment modes

Controlled by `NEXT_PUBLIC_PRODUCT_MODE` in `src/lib/product-config.ts` (default: `dashboard`):

|                    | **Life Dashboard** (`dashboard`)                                                                   | **Fitness Coach** (`fitness`)                       |
| ------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| App name / tagline | Life Dashboard — “Your weekly operating system”                                                    | Fitness Coach — “AI-coached training and nutrition” |
| Custom categories  | Allowed (`allowCustomCategories: true`)                                                            | Hidden                                              |
| Starter templates  | Cycling, Strength, Mobility, Morning Stretch, Running, Swimming, Triathlon, Korean, Piano, Finance | Fitness templates only (no Korean/Piano/Finance)    |
| Data               | Own Supabase project                                                                               | Own Supabase project (isolated)                     |

Same GitHub repo → two Vercel projects with different env vars.

### Users & access

- Invite-gated signup: invite code in `auth.users.raw_user_meta_data.invite_code`, enforced by security-definer trigger `public.handle_new_user()` (see `supabase/baseline-schema.sql` / `fix-handle-new-user-order.sql`).
- Intended users: invited individuals tracking training + life categories (or fitness-only in Fitness mode).
- Admins (`profiles.is_admin = true`, locked against client escalation in `production-hardening.sql`) manage invites at `/admin/invites`.
- Middleware (`src/middleware.ts`): no session → `/login`; incomplete profile (missing `current_weight_kg` / `height_cm` / `age`) → `/onboarding`; non-admin → blocked from `/admin`.

---

## 2. Architecture Diagram

```
┌─────────────┐     App Router + RSC      ┌──────────────────┐
│   Browser   │ ─────────────────────────▶│  Next.js 14      │
│  (PWA/SW)   │◀──── JSON / HTML ─────────│  (Vercel)        │
└─────────────┘                           └────────┬─────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
           ┌────────────────┐            ┌─────────────────┐            ┌─────────────────┐
           │ Supabase Auth  │            │ Supabase        │            │ Anthropic API   │
           │ + Postgres RLS │            │ (service role   │            │ callClaude()    │
           │ anon via SSR   │            │ for ai_usage    │            │ lib/claude.ts   │
           └────────────────┘            │ inserts only)   │            └─────────────────┘
                                         └─────────────────┘
```

**No Supabase Edge Functions** exist in this repo. All server logic is Next.js App Router pages + `src/app/api/**` route handlers. There is no `src/actions` folder (no Server Actions).

### Directory map

| Path                  | Role                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `src/app/(app)/`      | Authenticated UI: `/today`, `/ahead`, `/log`, `/settings/**`, legacy redirects            |
| `src/app/(auth)/`     | `/login`, `/callback`                                                                     |
| `src/app/onboarding/` | Profile + starter categories                                                              |
| `src/app/admin/`      | Invite admin UI                                                                           |
| `src/app/api/`        | All mutations & Claude calls                                                              |
| `src/components/`     | Client UI (today/ahead/log/settings/plan/week/categories/ui)                              |
| `src/lib/`            | Domain logic: db, nutrition, movement, week-score, prompts, validations, supabase clients |
| `src/hooks/`          | e.g. `use-timer.ts`                                                                       |
| `src/types/`          | Shared TypeScript types                                                                   |
| `supabase/*.sql`      | Schema scripts (run in SQL editor; not CLI migrations)                                    |
| `public/`             | PWA: `manifest.json`, `sw.js`, icons, `offline.html`                                      |

### Claude call sites (API only, after `checkAndLogAiUsage`)

- `POST /api/plan/generate` — category plans
- `POST /api/nutrition/generate` — meal-prep brief only (math in `lib/nutrition.ts`)
- `POST /api/weeks/[id]/review` — week commentary (scores always persist)

Not gated: `generate-movement`, `generate-tracked`, `copy-from-last-week`, `reroll-movement`.

---

## 3. Data Model

Source of truth: `supabase/baseline-schema.sql` + `v6-additive-schema.sql` + `production-hardening.sql`. Types mirror `src/types/index.ts`.

### `profiles`

| Column                                             | Type             | Notes                                                    |
| -------------------------------------------------- | ---------------- | -------------------------------------------------------- |
| `id`                                               | uuid PK          | → `auth.users(id)`                                       |
| `display_name`                                     | text             |                                                          |
| `current_weight_kg`, `goal_weight_kg`, `height_cm` | numeric          |                                                          |
| `age`                                              | integer          |                                                          |
| `biological_sex`                                   | text             | `male` \| `female` \| null                               |
| `activity_level`                                   | text NOT NULL    | `sedentary` \| `moderate` \| `active` (default moderate) |
| `target_rate_kg_per_week`                          | numeric NOT NULL | default 0.5                                              |
| `deficit_strategy`                                 | text NOT NULL    | `cycling` \| `uniform`                                   |
| `tdee_override`                                    | numeric          |                                                          |
| `dietary_notes`                                    | text             |                                                          |
| `is_admin`                                         | boolean NOT NULL | default false; locked by trigger                         |
| `created_at`, `updated_at`                         | timestamptz      |                                                          |

**RLS:** `profiles_select_own` / `profiles_update_own` (`auth.uid() = id`). Inserts only via `handle_new_user` (security definer). No client insert policy.

### `weight_logs`

`id`, `user_id` → profiles, `weight_kg`, `logged_date`, `notes`, `created_at`  
**RLS:** own data ALL. **Rel:** many → profiles.

### `categories`

| Column                                                               | Type          | Notes                                    |
| -------------------------------------------------------------------- | ------------- | ---------------------------------------- |
| `id`                                                                 | uuid PK       |                                          |
| `user_id`                                                            | uuid NOT NULL | → profiles                               |
| `name`                                                               | text          | UNIQUE(user_id, name)                    |
| `icon`, `color`, `color_dim`                                         | text          |                                          |
| `tracking_type`                                                      | text          | dual-write with `mode`                   |
| `mode`                                                               | text NOT NULL | `ai` \| `seeded` \| `tracked`            |
| `effort_type`                                                        | text          | `rpe` \| `duration` \| `binary`          |
| `sessions_per_week`                                                  | int           |                                          |
| `timed_session`                                                      | boolean       |                                          |
| `task_template`                                                      | jsonb         | tracked checklists                       |
| `ai_enabled`, `status`                                               |               | status: `active` \| `archived`           |
| `coach_context`                                                      | jsonb         | FTP, phase, equipment, etc.              |
| `affects_nutrition`, `nutrition_met`, `nutrition_hard_threshold_min` |               | calorie classification                   |
| `goal_event_name/date/notes`                                         |               | per-category race target (coach prompts) |
| timestamps                                                           |               |                                          |

Constraint `categories_mode_tracking_align`: `ai`↔`ai_plan`, `seeded`↔`random_pick`, `tracked`↔`tracked|session|log_only|count`.  
**RLS:** own data ALL.

### `weeks`

`id`, `user_id`, `week_start`, `week_end`, UNIQUE(user_id, week_start), `planning_notes`, `status` (`planning`\|`active`\|`complete`), `score_overall`, `score_breakdown` jsonb, `time_summary` jsonb, `weight_kg_snapshot`, `coach_commentary`, `is_deload`, `created_at`  
**RLS:** own data ALL.

### `sessions`

`id`, `week_id`, `user_id`, `category_id`, `day_of_week` 0–6 (Mon=0), `planned_date`, `title`, `description`, `planned_duration_min`, `zones` (cycling), `blocks` (strength), `routine_steps` (mobility snapshot), `exercise_log` (strength log-time only), `session_type`, `sort_order`, `completed`/`skipped`/`skip_reason`, actuals, `library_entry_id` → movement_library, `rpe` 1–10, `tasks_done` jsonb, `timed_duration_sec`, `created_at`  
**RLS:** own data ALL.

### `movement_library`

Global (`user_id` null) or user-owned; `library_type` `mobility`\|`stretch`; `steps` jsonb; `active`.  
**RLS:** SELECT global OR own; INSERT/UPDATE/DELETE own only (hardening).

### `week_reviews`

Per (week_id, category_id) unique: scores, planned/actual min, session counts, completion_rate.  
**RLS:** own data ALL.

### `nutrition_plans`

UNIQUE(week_id, user_id): TDEE, deficit, `training_calories_map`, `macro_guide`, `meal_prep_brief`, `meal_prep_summary`, `race_week`, etc.  
**RLS:** own data ALL.

### `invites` / `invite_redemptions`

Invites: `code` unique, `max_uses`, `use_count`, `revoked`, `expires_at`, `created_by`.  
**RLS invites:** admin only (`profiles.is_admin`).  
**RLS redemptions:** SELECT own rows. Writes via trigger.

### `ai_usage_log`

`user_id`, optional `week_id`, `call_type`, `estimated_cost_usd`, `created_at`.  
**RLS:** SELECT own only. Inserts via `createServiceClient()` (`SUPABASE_SERVICE_ROLE_KEY`) in `checkAndLogAiUsage`.

### `goal_events`

Standalone races/targets: `label`, `event_date`, `event_type` (`cycling`\|`duathlon`\|`triathlon`\|`run`\|`other`), `distances` jsonb.  
**RLS:** own ALL with CHECK.

### Relationships (summary)

```
auth.users ──1:1── profiles
profiles ──< weight_logs, categories, weeks, goal_events, ai_usage_log, invites.created_by
weeks ──< sessions, week_reviews, nutrition_plans
categories ──< sessions, week_reviews
movement_library ──< sessions.library_entry_id
invites ──< invite_redemptions ──> profiles
```

---

## 4. Feature Map

| Feature                                       | Entry                                                     | Key files                                                                      | Tables                                                           | AI?                                                                                                |
| --------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Invite signup / login                         | `/login`                                                  | `login-form.tsx`, `handle_new_user`                                            | invites, profiles, invite_redemptions                            | No                                                                                                 |
| Onboarding                                    | `/onboarding`                                             | `onboarding-flow.tsx`, `POST /api/profile`, `POST /api/categories`             | profiles, categories                                             | No                                                                                                 |
| Today cockpit                                 | `/today`                                                  | `today/page.tsx`, `today-view.tsx`, sheets                                     | weeks, sessions, categories, nutrition_plans                     | No (logging only)                                                                                  |
| Ahead / month + plan                          | `/ahead`                                                  | `ahead-view.tsx`, `plan-sheet.tsx`                                             | weeks, sessions, goal_events, categories                         | Via plan APIs                                                                                      |
| Weekly plan generate                          | PlanSheet Confirm                                         | `plan-sheet.tsx` → generate / generate-movement / generate-tracked / nutrition | weeks, sessions, nutrition_plans, movement_library, ai_usage_log | Yes: `lib/prompts/{cycling,strength,running,swimming,triathlon,generic,nutrition}.ts` via registry |
| Copy last week                                | PlanSheet (cap fallback)                                  | `POST /api/plan/copy-from-last-week`                                           | sessions                                                         | No                                                                                                 |
| Seeded mobility/stretch                       | PlanSheet / generate-movement                             | `lib/movement.ts` `pickWeeklyRoutines`                                         | movement_library, sessions                                       | No at runtime                                                                                      |
| Tracked slots                                 | generate-tracked                                          | `lib/tracked-slots.ts`                                                         | sessions                                                         | No                                                                                                 |
| Session complete (AI/RPE/binary/tracked/move) | Today sheets                                              | `POST /api/sessions/[id]/complete`                                             | sessions                                                         | No                                                                                                 |
| Strength log UI                               | `/week/[sessionId]/strength`                              | `strength-session-form.tsx`                                                    | sessions.exercise_log                                            | No                                                                                                 |
| Nutrition plan display                        | Today card                                                | `nutrition-today-card.tsx`                                                     | nutrition_plans                                                  | Brief via Claude; math TS                                                                          |
| Close week + score                            | `/log`                                                    | `log-view.tsx`, `POST /api/weeks/[id]/review`, `week-score.ts`                 | weeks, week_reviews, ai_usage_log                                | Commentary only                                                                                    |
| Weight log / trend                            | `/settings/weight`, Log chart                             | `weight-log-form.tsx`, `POST /api/weight`                                      | weight_logs, profiles                                            | No                                                                                                 |
| Goal events (global)                          | `/settings/goals`                                         | `goal-events-manager.tsx`, `/api/goal-events`                                  | goal_events                                                      | No                                                                                                 |
| Category coach context                        | `/settings/coach/*`                                       | `*-coach-form.tsx`                                                             | categories.coach*context, goal_event*\*                          | No (feeds later plans)                                                                             |
| Categories CRUD                               | `/settings/categories`                                    | `category-create-sheet.tsx`, `/api/categories`                                 | categories                                                       | No                                                                                                 |
| Custom category (dashboard)                   | Create sheet + onboarding                                 | `PRODUCT_CONFIG.allowCustomCategories`                                         | categories                                                       | Plans via generic prompt                                                                           |
| AI usage meter                                | `/settings`                                               | `getAiUsageCount`                                                              | ai_usage_log                                                     | Cap enforcement                                                                                    |
| Admin invites                                 | `/admin/invites`                                          | `admin-invites-client.tsx`, `/api/admin/invites`                               | invites                                                          | No                                                                                                 |
| PWA                                           | root layout SW register                                   | `public/sw.js`, `manifest.json`                                                | —                                                                | No                                                                                                 |
| Legacy redirects                              | `/`, `/week/current`→today; `/plan`→ahead; `/history`→log | redirect pages                                                                 | —                                                                | —                                                                                                  |

**Category registry** (`src/lib/category-registry.ts`): name-matched Cycling/Strength/Running/Swimming/Triathlon → domain prompts; seeded → movement (null prompt); tracked → null; else `buildGenericPrompt`.

---

## 5. Environment Variables

| Name                            | Purpose                                                           | Required | Where                      |
| ------------------------------- | ----------------------------------------------------------------- | -------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                              | Yes      | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/SSR anon key                                              | Yes      | same                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only inserts to `ai_usage_log` (`lib/supabase/service.ts`) | Yes      | same (never client)        |
| `ANTHROPIC_API_KEY`             | Claude API (`lib/claude.ts`)                                      | Yes      | console.anthropic.com      |
| `NEXT_PUBLIC_PRODUCT_MODE`      | `dashboard` (default) or `fitness`                                | Optional | set per Vercel project     |

Documented in `.env.example` / README. Never commit `.env.local`.

---

## 6. Key Workflows

### 6.1 Signup / invite-gated onboarding

1. User enters invite on `/login` (`LoginForm`); signup passes `options.data.invite_code`.
2. Supabase creates `auth.users` → trigger `on_auth_user_created` → `handle_new_user()`: validates invite (not revoked, under max_uses, not expired), inserts `profiles`, increments `use_count`, inserts `invite_redemptions` **after** profile (FK order fix).
3. Session required (disable “Confirm email” or user sees error in login-form).
4. Middleware sends incomplete profile → `/onboarding`.
5. Onboarding saves body metrics via `PATCH /api/profile`, adds categories via `POST /api/categories` / `AddCategoryFlow`.
6. Complete profile → `/today`.

### 6.2 Weekly AI coaching session generation

1. Open `/ahead?plan=1` → `PlanSheet` (`plan-sheet.tsx`).
2. Context (notes, optional weigh-in → `/api/weight`), Scope (toggle categories), Confirm.
3. `PATCH /api/weeks/[id]` saves notes + `weight_kg_snapshot`.
4. Ordered AI cats (Cycling → Strength → others): `POST /api/plan/generate` → registry prompt → `checkAndLogAiUsage` → `callClaude` → Zod validate → `insertGeneratedSessions`.
5. Seeded: `POST /api/plan/generate-movement` → `pickWeeklyRoutines` + snapshot `routine_steps`.
6. Tracked: `POST /api/plan/generate-tracked` → `buildTrackedSlots`.
7. If any `affects_nutrition`: `POST /api/nutrition/generate`.
8. Week status → `active`. Cap hits offer `copy-from-last-week`.

### 6.3 Nutrition “plan” & deterministic scoring

**Not meal logging.** Flow:

1. After sessions exist, nutrition route loads profile + sessions for `affects_nutrition` categories.
2. Deterministic (`lib/nutrition.ts`): `baselineTDEE` / BMR, `weeklyDeficitTarget`, `estimateCalories`, `classifyDayType`, `buildCalorieTargets`, `buildMacroGuide`.
3. Claude only writes `meal_prep_brief` (+ optional `meal_prep_summary`) via `buildMealPrepPrompt` (`lib/prompts/nutrition.ts`), after usage check.
4. Upsert `nutrition_plans`. Today shows targets + brief (`nutrition-today-card.tsx`).

**Week scoring** (separate): `computeWeekScore` in `lib/week-score.ts` — equal weight categories; completion × effort (RPE quality when `effort_type=rpe`); overall = mean. Persisted on close week via review API.

### 6.4 Goal / race events

**Two parallel concepts:**

1. **`goal_events` table** — Settings → Goals; CRUD `/api/goal-events`; shown on Ahead month.
2. **`categories.goal_event_*`** — Coach forms; used in `formatGoalEventSummary` / `derivePhase` for plan prompts and race-week nutrition detection.

### 6.5 Custom category + weekly check-in

1. Dashboard mode: create via `CategoryCreateSheet` (`mode` ai/seeded/tracked, effort, `task_template`, sessions/week).
2. Fitness mode: custom create hidden; curated templates only.
3. Planning: ai → generate; seeded → movement (if library_type maps); tracked → slot sessions.
4. Today: tracked → `TrackedSessionSheet` (tasks_done); binary → `BinarySheet`; AI → `AiSessionSheet`; move → `MoveSheet`. Complete via `PATCH /api/sessions/[id]/complete`.

### 6.6 AI usage cap

1. Cap = **40** / Monday-aligned week (`WEEKLY_AI_CAP`, `aiUsageWeekStart` in `lib/ai-usage.ts`).
2. Before Claude: `checkAndLogAiUsage` counts rows since Monday; if ≥40 → deny; else service-role insert then allow.
3. Plan/nutrition return 429 `{ error: 'cap_reached', used, cap }`. Review still saves scores if commentary blocked.
4. Settings shows `used / cap`. PlanSheet copy-from-last-week bypasses AI.

---

## 7. Deployment

### Vercel

1. Import repo; set all env vars above.
2. For Fitness: second project, `NEXT_PUBLIC_PRODUCT_MODE=fitness`, **separate** Supabase keys.
3. Build: `next build` (Next 14.2.x).

### Supabase (greenfield)

1. `baseline-schema.sql`
2. `v6-additive-schema.sql`
3. `production-hardening.sql` (required)
4. Optionally re-apply `fix-handle-new-user-order.sql` if only updating trigger body
5. Seed `movement_library` (`user_id` null) for Mobility / Morning Stretch
6. `insert into invites (code, max_uses) values ('YOURCODE123', 5);`
7. Auth: prefer email+password without confirm-email for invite flow
8. Promote admin: SQL as service_role / editor: `update profiles set is_admin = true where id = '…'`

Existing projects: hardening (+ v6 if missing).

### PRODUCT_MODE switch

Set `NEXT_PUBLIC_PRODUCT_MODE` and redeploy. Does not migrate DB; use separate Supabase for Fitness isolation. See README smoke checklist.

### Local

```bash
npm install
cp .env.example .env.local   # fill values
npm run dev                  # http://localhost:3000
```

---

## 8. Known Gaps & Tech Debt

### Explicit deferred (`v6-bridge.md`)

- Holistic cross-domain coach; AI deload proposals
- Structured pace/zone JSON for Running/Swimming/Triathlon (paces in description text today)
- Focus-note generation; Strava/Garmin; light mode; movement library admin UI

### Unused / orphaned code & columns

- **`weeks.time_summary`** — typed only; never read/written
- **`weeks.is_deload`** — schema + type only; no UI/API
- **Legacy plan UI unused by routes:** `PlanningWizard`, `PlanGenerationStep`, `ConfirmStep`, `NutritionStep`, `CurrentWeekView`, `WeekBoard` — PlanSheet replaced them; still in tree (reroll still used from Today/`ai-session-sheet`)
- **Empty** `src/app/api/debug-log/` directory
- **Dual goals:** `goal_events` vs `categories.goal_event_*` not unified
- **`AiCallType`:** running/swimming/triathlon plans log as `custom_category_plan` (not domain-specific)

### No source `TODO`/`FIXME` comments

Gaps are documented in `v6-bridge.md` / README rather than inline TODOs.

### Shortcuts / constraints in code

- Strength after Cycling in PlanSheet for hard-day coordination
- Cap: nutrition brief / commentary can fail soft; scores still close
- Movement/tracked never count against AI cap
- Registry still special-cases category **names** (`Cycling`, `Strength`, …) despite “no special-case outside registry” rule — special-casing lives inside the registry
- Baseline schema is reconstructed, not a live `pg_dump`

---

## 9. Session Handoff Block

```
Life Dashboard: Next.js 14 App Router + TS + Tailwind + Supabase RLS + Claude (claude-sonnet-4-6) on Vercel. Dual product via NEXT_PUBLIC_PRODUCT_MODE (dashboard|fitness). Tabs: /today, /ahead (PlanSheet), /log, /settings. Modes: ai→/api/plan/generate (+prompts via category-registry), seeded→generate-movement (pickWeeklyRoutines, no Claude), tracked→generate-tracked. Nutrition calories/macros in lib/nutrition.ts; Claude only meal_prep_brief. Week score lib/week-score.ts; close week POST /api/weeks/[id]/review. AI cap 40/Mon week (checkAndLogAiUsage → service role ai_usage_log); movement/tracked ungated. Invite gate: handle_new_user trigger. Schema: baseline → v6-additive → production-hardening. Done: v6 IA, PlanSheet, coaches (incl. run/swim/tri), goals, PWA, admin invites, usage cap. Deferred: deload AI, structured pace JSON, Strava, library admin. Respect .cursorrules: no service key client-side; Claude only from /api after usage check; dual-write mode↔tracking_type; week starts Monday.
```

---

**To save as `DOCUMENTATION.md`:** switch to Agent mode and ask me to write this file to the project root.
