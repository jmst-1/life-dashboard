-- Fix: invite_redemptions.user_id references profiles(id), so the profile
-- row must be inserted BEFORE invite_redemptions. The original Session 2
-- trigger inserted redemptions first, which caused FK 23503 and rolled back
-- the whole signup (use_count stayed 0, client saw error "{}").

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
