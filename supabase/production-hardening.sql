-- Production hardening (idempotent). Run AFTER baseline + v6-additive-schema.
-- Required on every Supabase project (Life Dashboard and Fitness Coach).

-- ---------------------------------------------------------------------------
-- 1. Lock profiles.is_admin (clients cannot self-escalate)
-- ---------------------------------------------------------------------------
create or replace function public.profiles_lock_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Lock for JWT clients (anon/authenticated). Allow service_role and
  -- direct SQL editor / migrations (no JWT) to grant admin.
  if auth.jwt() is not null and auth.role() is distinct from 'service_role' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_is_admin on public.profiles;
create trigger profiles_lock_is_admin
  before update on public.profiles
  for each row
  execute function public.profiles_lock_is_admin();

-- Prefer split policies over a single FOR ALL that can update is_admin.
drop policy if exists "own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. movement_library: globals readable, not writable by authenticated users
-- ---------------------------------------------------------------------------
drop policy if exists "own data or global" on public.movement_library;
drop policy if exists "movement_library_select" on public.movement_library;
drop policy if exists "movement_library_insert" on public.movement_library;
drop policy if exists "movement_library_update" on public.movement_library;
drop policy if exists "movement_library_delete" on public.movement_library;

create policy "movement_library_select" on public.movement_library
  for select using (user_id is null or auth.uid() = user_id);

create policy "movement_library_insert" on public.movement_library
  for insert with check (auth.uid() = user_id);

create policy "movement_library_update" on public.movement_library
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "movement_library_delete" on public.movement_library
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. goal_events: explicit WITH CHECK
-- ---------------------------------------------------------------------------
drop policy if exists "own data" on public.goal_events;
create policy "own data" on public.goal_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Ownership FKs NOT NULL (skip intentional nullables)
-- ---------------------------------------------------------------------------
-- Null out any orphans first so SET NOT NULL can succeed.
delete from public.sessions where user_id is null or week_id is null or category_id is null;
delete from public.week_reviews where user_id is null or week_id is null or category_id is null;
delete from public.weight_logs where user_id is null;
delete from public.categories where user_id is null;
delete from public.weeks where user_id is null;

alter table public.categories alter column user_id set not null;
alter table public.weeks alter column user_id set not null;
alter table public.sessions alter column user_id set not null;
alter table public.sessions alter column week_id set not null;
alter table public.sessions alter column category_id set not null;
alter table public.weight_logs alter column user_id set not null;
alter table public.week_reviews alter column user_id set not null;
alter table public.week_reviews alter column week_id set not null;
alter table public.week_reviews alter column category_id set not null;

-- ---------------------------------------------------------------------------
-- 5. week_reviews unique (dedupe then constrain)
-- ---------------------------------------------------------------------------
delete from public.week_reviews wr
using public.week_reviews keep
where wr.week_id = keep.week_id
  and wr.category_id = keep.category_id
  and wr.ctid < keep.ctid;

alter table public.week_reviews
  drop constraint if exists week_reviews_week_category_unique;
alter table public.week_reviews
  add constraint week_reviews_week_category_unique
  unique (week_id, category_id);

-- ---------------------------------------------------------------------------
-- 6. categories.mode NOT NULL + mode ↔ tracking_type alignment
-- ---------------------------------------------------------------------------
update public.categories
set mode = case
  when tracking_type = 'random_pick' then 'seeded'
  when tracking_type in ('session', 'log_only', 'count', 'tracked') then 'tracked'
  else 'ai'
end
where mode is null;

alter table public.categories alter column mode set not null;

alter table public.categories
  drop constraint if exists categories_mode_tracking_align;
alter table public.categories
  add constraint categories_mode_tracking_align
  check (
    (mode = 'ai' and tracking_type = 'ai_plan')
    or (mode = 'seeded' and tracking_type = 'random_pick')
    or (
      mode = 'tracked'
      and tracking_type in ('tracked', 'session', 'log_only', 'count')
    )
  );

-- ---------------------------------------------------------------------------
-- 7. sessions.day_of_week CHECK (0–6)
--    App swap/reorder no longer stages day_of_week outside 0–6.
-- ---------------------------------------------------------------------------
-- Clear any leftover staging values from older swap/reorder code.
update public.sessions
set day_of_week = greatest(0, least(6, day_of_week))
where day_of_week < 0 or day_of_week > 6;

alter table public.sessions
  drop constraint if exists sessions_day_of_week_check;
alter table public.sessions
  add constraint sessions_day_of_week_check
  check (day_of_week between 0 and 6);

-- ---------------------------------------------------------------------------
-- 8. Invite signup trigger (attach if missing)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
