-- Baseline schema (reconstructed from app types + Session 2 patterns).
-- For greenfield projects: run this, then v6-additive-schema.sql, then production-hardening.sql.
-- Existing projects: skip this file; run production-hardening.sql only.
-- Not a live pg_dump — column defaults may differ slightly from production.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  current_weight_kg numeric,
  goal_weight_kg numeric,
  height_cm numeric,
  age integer,
  biological_sex text check (biological_sex is null or biological_sex in ('male', 'female')),
  activity_level text not null default 'moderate'
    check (activity_level in ('sedentary', 'moderate', 'active')),
  target_rate_kg_per_week numeric not null default 0.5,
  deficit_strategy text not null default 'cycling'
    check (deficit_strategy in ('cycling', 'uniform')),
  tdee_override numeric,
  dietary_notes text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- weight_logs
-- ---------------------------------------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric not null,
  logged_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.weight_logs enable row level security;
drop policy if exists "own data" on public.weight_logs;
create policy "own data" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null default 'activity',
  color text not null default '#6366f1',
  color_dim text,
  tracking_type text not null default 'ai_plan',
  mode text not null default 'ai',
  effort_type text not null default 'duration',
  sessions_per_week integer not null default 3,
  timed_session boolean not null default false,
  task_template jsonb not null default '[]'::jsonb,
  ai_enabled boolean not null default true,
  status text not null default 'active' check (status in ('active', 'archived')),
  coach_context jsonb not null default '{}'::jsonb,
  affects_nutrition boolean not null default false,
  nutrition_met numeric not null default 0,
  nutrition_hard_threshold_min integer not null default 0,
  goal_event_name text,
  goal_event_date date,
  goal_event_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;
drop policy if exists "own data" on public.categories;
create policy "own data" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- weeks
-- ---------------------------------------------------------------------------
create table if not exists public.weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  planning_notes text,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'complete')),
  score_overall numeric,
  score_breakdown jsonb,
  time_summary jsonb,
  weight_kg_snapshot numeric,
  coach_commentary text,
  is_deload boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weeks enable row level security;
drop policy if exists "own data" on public.weeks;
create policy "own data" on public.weeks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- movement_library
-- ---------------------------------------------------------------------------
create table if not exists public.movement_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  library_type text not null check (library_type in ('mobility', 'stretch')),
  name text not null,
  target_area text not null,
  duration_min integer not null default 10,
  equipment text not null default 'none',
  steps jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.movement_library enable row level security;
-- Policies replaced by production-hardening.sql

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  planned_date date,
  title text not null,
  description text,
  planned_duration_min integer,
  zones jsonb,
  blocks jsonb,
  routine_steps jsonb,
  exercise_log jsonb,
  session_type text not null default 'ai_generated',
  sort_order integer not null default 0,
  completed boolean not null default false,
  skipped boolean not null default false,
  skip_reason text,
  actual_duration_min integer,
  actual_calories_kcal integer,
  execution_notes text,
  completed_at timestamptz,
  library_entry_id uuid references public.movement_library(id),
  rpe integer check (rpe is null or (rpe >= 1 and rpe <= 10)),
  tasks_done jsonb not null default '[]'::jsonb,
  timed_duration_sec integer,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;
drop policy if exists "own data" on public.sessions;
create policy "own data" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- week_reviews
-- ---------------------------------------------------------------------------
create table if not exists public.week_reviews (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  score numeric,
  planned_min integer,
  actual_min integer,
  planned_sessions integer,
  completed_sessions integer,
  skipped_sessions integer,
  missed_sessions integer,
  completion_rate numeric,
  created_at timestamptz not null default now(),
  unique (week_id, category_id)
);

alter table public.week_reviews enable row level security;
drop policy if exists "own data" on public.week_reviews;
create policy "own data" on public.week_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- nutrition_plans
-- ---------------------------------------------------------------------------
create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric not null,
  goal_weight_kg numeric,
  deficit_strategy text not null,
  baseline_tdee numeric not null,
  weekly_deficit_target numeric not null,
  race_week boolean not null default false,
  training_calories_map jsonb not null default '{}'::jsonb,
  macro_guide jsonb not null default '{}'::jsonb,
  meal_prep_brief text not null default '',
  meal_prep_summary text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (week_id, user_id)
);

alter table public.nutrition_plans enable row level security;
drop policy if exists "own data" on public.nutrition_plans;
create policy "own data" on public.nutrition_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- invites + invite_redemptions
-- ---------------------------------------------------------------------------
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  max_uses integer not null default 1,
  use_count integer not null default 0,
  revoked boolean not null default false,
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
drop policy if exists "admin invites" on public.invites;
create policy "admin invites" on public.invites
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create table if not exists public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.invites(id),
  user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (invite_id, user_id)
);

alter table public.invite_redemptions enable row level security;
drop policy if exists "own data" on public.invite_redemptions;
create policy "own data" on public.invite_redemptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_usage_log (select-only for users; inserts via service role)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_id uuid references public.weeks(id),
  call_type text not null,
  estimated_cost_usd numeric,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_log enable row level security;
drop policy if exists "own select" on public.ai_usage_log;
create policy "own select" on public.ai_usage_log
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- goal_events (also in v6-additive; safe IF NOT EXISTS)
-- ---------------------------------------------------------------------------
create table if not exists public.goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  event_date date not null,
  event_type text not null default 'other'
    check (event_type in ('cycling', 'duathlon', 'triathlon', 'run', 'other')),
  distances jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goal_events enable row level security;

-- ---------------------------------------------------------------------------
-- Signup invite gate (function body; trigger attached in production-hardening)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_invite_id uuid;
  v_code text;
begin
  v_code := new.raw_user_meta_data->>'invite_code';

  select id into v_invite_id
  from public.invites
  where code = v_code
    and not revoked
    and use_count < max_uses
    and (expires_at is null or expires_at > now())
  for update;

  if v_invite_id is null then
    raise exception 'Invalid or exhausted invite code';
  end if;

  insert into public.profiles (id, display_name, deficit_strategy, activity_level, target_rate_kg_per_week)
  values (new.id, split_part(new.email, '@', 1), 'cycling', 'moderate', 0.5);

  update public.invites set use_count = use_count + 1 where id = v_invite_id;
  insert into public.invite_redemptions (invite_id, user_id) values (v_invite_id, new.id);

  return new;
end;
$$ language plpgsql security definer set search_path = public;
