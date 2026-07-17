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
  status?: 'active' | 'archived',
  orderBy: 'name' | 'created_at' = 'name'
): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order(orderBy, { ascending: true });

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

export async function getCategoryById(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('getCategoryById error:', error);
    return null;
  }

  return data as Category | null;
}

export type CreateCategoryInput = {
  name: string;
  icon: string;
  color: string;
  tracking_type: Category['tracking_type'];
  ai_enabled: boolean;
  affects_nutrition: boolean;
  nutrition_met: number;
  nutrition_hard_threshold_min: number;
  coach_context?: Record<string, unknown>;
};

export async function createCategory(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCategoryInput
): Promise<{ category: Category | null; error: string | null }> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      tracking_type: input.tracking_type,
      ai_enabled: input.ai_enabled,
      affects_nutrition: input.affects_nutrition,
      nutrition_met: input.nutrition_met,
      nutrition_hard_threshold_min: input.nutrition_hard_threshold_min,
      coach_context: input.coach_context ?? {},
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    console.error('createCategory error:', error);
    if (error.code === '23505') {
      return { category: null, error: 'Category name already exists' };
    }
    return { category: null, error: error.message };
  }

  return { category: data as Category, error: null };
}

export type UpdateCategoryInput = {
  name?: string;
  icon?: string;
  color?: string;
  ai_enabled?: boolean;
  affects_nutrition?: boolean;
  nutrition_met?: number;
  nutrition_hard_threshold_min?: number;
  coach_context?: Record<string, unknown>;
};

export async function updateCategory(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: UpdateCategoryInput
): Promise<{ category: Category | null; error: string | null }> {
  const { data, error } = await supabase
    .from('categories')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('updateCategory error:', error);
    if (error.code === '23505') {
      return { category: null, error: 'Category name already exists' };
    }
    return { category: null, error: error.message };
  }

  return { category: data as Category, error: null };
}

export async function archiveCategory(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<{ category: Category | null; error: string | null }> {
  const { data, error } = await supabase
    .from('categories')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('archiveCategory error:', error);
    return { category: null, error: error.message };
  }

  return { category: data as Category, error: null };
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
