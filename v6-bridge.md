# v6 Bridge Guide

Bridge between the Session 1–15 Cursor build guide and Product Spec v6 + `life-dashboard-v6.jsx`.

You are past Session 10. Phases A–F below replace the old “week board as Today” assumption for Sessions 11–15.

## UI reference

- Spec: `life-dashboard-spec-v6.docx`
- Prototype: `life-dashboard-v6.jsx` (design tokens `T`, sheets, nav, category create, Today/Ahead/Log)

## Mode ↔ tracking_type mapping

| v6 `mode` | `tracking_type` | Generation |
|-----------|-----------------|------------|
| `ai` | `ai_plan` | `/api/plan/generate` |
| `seeded` | `random_pick` | `/api/plan/generate-movement` |
| `tracked` | `tracked` | `/api/plan/generate-tracked` |

Helpers: `src/lib/category-mode.ts`, dual-write via `syncedModeFields` in `src/lib/normalize-category.ts`.

## Schema migration

Run [`supabase/v6-additive-schema.sql`](supabase/v6-additive-schema.sql) in the Supabase SQL editor before using new fields.

Adds on `categories`: `mode`, `effort_type`, `sessions_per_week`, `timed_session`, `task_template`, `color_dim`  
Adds on `sessions`: `rpe`, `tasks_done`, `timed_duration_sec`  
Adds on `weeks`: `is_deload`  
Adds on `nutrition_plans`: `meal_prep_summary`  
New table: `goal_events`

## Route IA

| Tab | Route | Notes |
|-----|-------|-------|
| Today | `/today` | Daily cockpit (redirect from `/week/current`) |
| Ahead | `/ahead` | Month + PlanSheet (`/plan` redirects here) |
| Log | `/log` | Trends + close week (`/history` redirects) |
| Settings | `/settings` | Profile, goals, categories, coach |

## Score formula (v6)

Equal weight across categories:

- completion = mean of per-session completion (binary 0/1; tracked = tasks done fraction; ai/seeded = completed flag)
- effort = RPE quality when `effort_type=rpe`, else completion
- category = `0.7 * completion + 0.3 * effort` → 0–100
- overall = mean of category scores

Implemented in `src/lib/week-score.ts`. Persist via `POST /api/weeks/[id]/review`.

## Deferred (do not block)

- Holistic coach / cross-domain load balancing
- AI deload proposals (manual `is_deload` / planning notes only)
- Pace/zone structured session JSON for Running/Swimming/Triathlon (today: generic session fields; paces live in description text)
- Focus-note generation from prior logs
- Strava/Garmin; light mode; movement library admin UI

## Session 12–15 adaptations

- **12:** `checkAndLogAiUsage` in `src/lib/ai-usage.ts` — cap **40** per Monday-aligned calendar week. Wired into `/api/plan/generate`, `/api/nutrition/generate`, and `/api/weeks/[id]/review`. Cap returns `{ error: 'cap_reached', message, used, cap }` with 429. PlanSheet offers copy-from-last-week. Never gate movement or tracked.
- **13:** Two-product deploy — landing copy should mention Today/Ahead/Log/Settings.
- **14:** Admin invites unchanged.
- **15:** PWA polish — test 430px Today sheet stack.

## Keep from original guide

- Deterministic nutrition (`lib/nutrition.ts`)
- Seeded mobility library + `pickWeeklyRoutines`
- Domain coaches (cycling/strength/running/swimming/triathlon) + one week commentary call
- Invites, RLS, Claude only from `/api` after usage check (once Session 12 wired)
