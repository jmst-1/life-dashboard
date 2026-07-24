-- v6 additive schema (run in Supabase SQL editor)
-- Dual-writes mode alongside tracking_type for backward compatibility.
-- After this file, run production-hardening.sql (security + integrity).
-- Greenfield: baseline-schema.sql → this file → production-hardening.sql.

alter table categories
  add column if not exists mode text,
  add column if not exists effort_type text not null default 'duration',
  add column if not exists sessions_per_week int not null default 3,
  add column if not exists timed_session boolean not null default false,
  add column if not exists task_template jsonb not null default '[]'::jsonb,
  add column if not exists color_dim text;

alter table categories
  drop constraint if exists categories_mode_check;
alter table categories
  add constraint categories_mode_check
  check (mode is null or mode in ('ai', 'seeded', 'tracked'));

alter table categories
  drop constraint if exists categories_effort_type_check;
alter table categories
  add constraint categories_effort_type_check
  check (effort_type in ('rpe', 'duration', 'binary'));

-- Backfill mode from tracking_type
update categories
set mode = case
  when tracking_type = 'random_pick' then 'seeded'
  when tracking_type in ('session', 'log_only', 'count', 'tracked') then 'tracked'
  else 'ai'
end
where mode is null;

-- Sensible defaults for curated names
update categories
set effort_type = 'rpe',
    timed_session = false,
    sessions_per_week = 3
where lower(name) in ('cycling', 'strength', 'running');

update categories
set effort_type = 'duration',
    timed_session = true,
    sessions_per_week = 4
where lower(name) in ('mobility', 'morning stretch');

alter table sessions
  add column if not exists rpe int,
  add column if not exists tasks_done jsonb not null default '[]'::jsonb,
  add column if not exists timed_duration_sec int;

alter table sessions
  drop constraint if exists sessions_rpe_check;
alter table sessions
  add constraint sessions_rpe_check
  check (rpe is null or (rpe >= 1 and rpe <= 10));

alter table weeks
  add column if not exists is_deload boolean not null default false;

create table if not exists goal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  event_date date not null,
  event_type text not null default 'other'
    check (event_type in ('cycling', 'duathlon', 'triathlon', 'run', 'other')),
  distances jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table goal_events enable row level security;

drop policy if exists "own data" on goal_events;
create policy "own data" on goal_events
  for all using (auth.uid() = user_id);

create index if not exists goal_events_user_date_idx
  on goal_events(user_id, event_date);

alter table nutrition_plans
  add column if not exists meal_prep_summary text;
