import { format, startOfWeek } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category, Profile, Session, Week } from '@/types';

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('getProfile error:', error);
    return null;
  }

  return data as Profile | null;
}

export async function getWeek(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string
): Promise<Week | null> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) {
    console.error('getWeek error:', error);
    return null;
  }

  return data as Week | null;
}

export async function getCurrentWeek(
  supabase: SupabaseClient,
  userId: string
): Promise<Week | null> {
  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  );
  return getWeek(supabase, userId, weekStart);
}

export async function getCategories(
  supabase: SupabaseClient,
  userId: string,
  status?: 'active' | 'archived'
): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getCategories error:', error);
    return [];
  }

  return (data ?? []) as Category[];
}

export async function getSessions(
  supabase: SupabaseClient,
  weekId: string
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('week_id', weekId)
    .order('day_of_week')
    .order('sort_order');

  if (error) {
    console.error('getSessions error:', error);
    return [];
  }

  return (data ?? []) as Session[];
}
