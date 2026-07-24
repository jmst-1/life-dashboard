# Life Dashboard

Weekly operating system for training, habits, and nutrition. Plan the week ahead, execute day-by-day on Today, and review scores on Log.

One codebase powers two products via `NEXT_PUBLIC_PRODUCT_MODE`: **Life Dashboard** (`dashboard`, custom categories allowed) and **Fitness Coach** (`fitness`, curated templates only).

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth, Postgres, RLS)
- Claude API (`claude-sonnet-4-6`) for plan generation, meal-prep briefs, and week commentary
- Vercel for deploy

## Tabs

| Tab | Route | Role |
|-----|-------|------|
| Today | `/today` | Daily cockpit + session logging |
| Ahead | `/ahead` | Month view + PlanSheet |
| Log | `/log` | Scores, commentary, weight trend |
| Settings | `/settings` | Profile, goals, categories, coaches |

See [`v6-bridge.md`](v6-bridge.md) for mode ↔ `tracking_type` mapping and scoring.

## Local setup

```bash
npm install
cp .env.example .env.local   # or create .env.local manually
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Name | Required | Description |
|------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role (server only — AI usage inserts) |
| `ANTHROPIC_API_KEY` | yes | Claude API key |
| `NEXT_PUBLIC_PRODUCT_MODE` | no | `dashboard` (default) or `fitness` |

Never commit `.env.local` or put the service role / Anthropic keys in client code.

### Database

**Greenfield (new Supabase project):**

1. [`supabase/baseline-schema.sql`](supabase/baseline-schema.sql)
2. [`supabase/v6-additive-schema.sql`](supabase/v6-additive-schema.sql) (safe if columns already exist)
3. [`supabase/production-hardening.sql`](supabase/production-hardening.sql) — **required** (locks `is_admin`, hardens RLS, FKs, mode alignment)
4. Optionally re-apply [`supabase/fix-handle-new-user-order.sql`](supabase/fix-handle-new-user-order.sql) if you only need the invite trigger function body
5. Seed `movement_library` (global rows with `user_id` null) for Mobility / Morning Stretch
6. Create a first invite:

```sql
insert into invites (code, max_uses) values ('YOURCODE123', 5);
```

**Existing project:** run [`supabase/production-hardening.sql`](supabase/production-hardening.sql) only (after v6 if not yet applied).

Sign up at `/login` with email + invite code.

## Two deployments from one repo

| | Dashboard | Fitness Coach |
|--|-----------|---------------|
| `NEXT_PUBLIC_PRODUCT_MODE` | `dashboard` | `fitness` |
| Custom categories | visible | hidden |
| App name | Life Dashboard | Fitness Coach |
| Supabase | own project | own project (isolated data) |

### Manual ops checklist (Fitness)

1. Create a second Supabase project (`fitness-coach`).
2. Run [`supabase/baseline-schema.sql`](supabase/baseline-schema.sql) → v6 → [`supabase/production-hardening.sql`](supabase/production-hardening.sql).
3. Seed movement library + an invite.
4. Create a second Vercel project from the same GitHub repo.
5. Set Fitness env vars (`NEXT_PUBLIC_PRODUCT_MODE=fitness` + that project’s Supabase keys).
6. Smoke test: templates visible, “Build your own” hidden, signup with Fitness invite works, data isolated.

## AI usage

Claude calls are capped at **40 per Monday-aligned calendar week** via `checkAndLogAiUsage`. Movement / tracked generation is not gated. Cap state appears under Settings; PlanSheet offers copy-from-last-week when capped.

## Scripts

```bash
npm run dev    # development
npm run build  # production build
npm run start  # serve build
```

## PWA

`public/manifest.json` + `public/sw.js` enable Add to Home Screen. Start URL is `/today`. API routes are never cached (network-first). Offline fallback: `/offline.html`.
