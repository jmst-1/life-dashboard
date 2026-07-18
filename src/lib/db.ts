import { format, startOfWeek } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { plannedDateForDay } from '@/lib/plan-context';
import type {
  Category,
  CyclingZone,
  Profile,
  Session,
  SessionRenderer,
  StrengthBlock,
  Week,
  WeekReview,
  WeightLog,
} from '@/types';
import type { PlanResponse } from '@/lib/validations/plan';

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

export type UpdateProfileInput = {
  display_name?: string | null;
  current_weight_kg?: number | null;
  goal_weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  biological_sex?: 'male' | 'female' | null;
  activity_level?: 'sedentary' | 'moderate' | 'active';
  target_rate_kg_per_week?: number;
  deficit_strategy?: 'cycling' | 'uniform';
  tdee_override?: number | null;
  dietary_notes?: string | null;
};

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateProfileInput
): Promise<{ profile: Profile | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('updateProfile error:', error);
    return { profile: null, error: error.message };
  }

  return { profile: data as Profile, error: null };
}

export async function getWeightLogs(
  supabase: SupabaseClient,
  userId: string
): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getWeightLogs error:', error);
    return [];
  }

  return (data ?? []) as WeightLog[];
}

export type CreateWeightLogInput = {
  weight_kg: number;
  logged_date: string;
  notes?: string | null;
};

export async function createWeightLog(
  supabase: SupabaseClient,
  userId: string,
  input: CreateWeightLogInput
): Promise<{ weightLog: WeightLog | null; error: string | null }> {
  const { data, error } = await supabase
    .from('weight_logs')
    .insert({
      user_id: userId,
      weight_kg: input.weight_kg,
      logged_date: input.logged_date,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('createWeightLog error:', error);
    return { weightLog: null, error: error.message };
  }

  return { weightLog: data as WeightLog, error: null };
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
  goal_event_name?: string | null;
  goal_event_date?: string | null;
  goal_event_notes?: string | null;
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

export async function getWeekById(
  supabase: SupabaseClient,
  userId: string,
  weekId: string
): Promise<Week | null> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('id', weekId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('getWeekById error:', error);
    return null;
  }

  return data as Week | null;
}

export async function getWeekReviewsForCategory(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string,
  beforeWeekStart: string,
  limit = 4
): Promise<{ reviews: WeekReview[]; weeksById: Record<string, Week> }> {
  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('*')
    .eq('user_id', userId)
    .lt('week_start', beforeWeekStart)
    .order('week_start', { ascending: false })
    .limit(12);

  if (weeksError) {
    console.error('getWeekReviewsForCategory weeks error:', weeksError);
    return { reviews: [], weeksById: {} };
  }

  const pastWeeks = (weeks ?? []) as Week[];
  if (pastWeeks.length === 0) {
    return { reviews: [], weeksById: {} };
  }

  const weekIds = pastWeeks.map((w) => w.id);
  const weeksById = Object.fromEntries(pastWeeks.map((w) => [w.id, w]));

  const { data: reviews, error: reviewsError } = await supabase
    .from('week_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .in('week_id', weekIds);

  if (reviewsError) {
    console.error('getWeekReviewsForCategory reviews error:', reviewsError);
    return { reviews: [], weeksById };
  }

  const ordered = ((reviews ?? []) as WeekReview[])
    .sort((a, b) => {
      const aStart = weeksById[a.week_id]?.week_start ?? '';
      const bStart = weeksById[b.week_id]?.week_start ?? '';
      return bStart.localeCompare(aStart);
    })
    .slice(0, limit);

  return { reviews: ordered, weeksById };
}

export async function getSessionsByWeekAndCategory(
  supabase: SupabaseClient,
  weekId: string,
  categoryId: string
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('week_id', weekId)
    .eq('category_id', categoryId)
    .order('day_of_week')
    .order('sort_order');

  if (error) {
    console.error('getSessionsByWeekAndCategory error:', error);
    return [];
  }

  return (data ?? []) as Session[];
}

export async function deleteSessionsForWeekCategory(
  supabase: SupabaseClient,
  userId: string,
  weekId: string,
  categoryId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId)
    .eq('week_id', weekId)
    .eq('category_id', categoryId);

  if (error) {
    console.error('deleteSessionsForWeekCategory error:', error);
    return { error: error.message };
  }

  return { error: null };
}

type GeneratedSessionInput = {
  day: number;
  title: string;
  duration_min: number;
  description?: string;
  coaching_note?: string;
  zones?: CyclingZone[];
  blocks?: StrengthBlock[];
};

export async function insertGeneratedSessions(
  supabase: SupabaseClient,
  userId: string,
  weekId: string,
  categoryId: string,
  weekStart: string,
  parsed: PlanResponse,
  renderer: SessionRenderer
): Promise<{ sessions: Session[]; error: string | null }> {
  const rows = parsed.sessions.map((session: GeneratedSessionInput, index) => {
    const descriptionParts = [
      session.description?.trim(),
      session.coaching_note?.trim(),
    ].filter(Boolean);

    const row: Record<string, unknown> = {
      week_id: weekId,
      user_id: userId,
      category_id: categoryId,
      day_of_week: session.day,
      planned_date: plannedDateForDay(weekStart, session.day),
      title: session.title,
      description: descriptionParts.length
        ? descriptionParts.join('\n\n')
        : null,
      planned_duration_min: session.duration_min,
      session_type: 'ai_generated',
      sort_order: index,
      zones: null,
      blocks: null,
      routine_steps: null,
      exercise_log: null,
    };

    if (renderer === 'cycling' && 'zones' in session) {
      row.zones = session.zones ?? [];
    }
    if (renderer === 'strength' && 'blocks' in session) {
      row.blocks = session.blocks ?? [];
    }

    return row;
  });

  if (rows.length === 0) {
    return { sessions: [], error: null };
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert(rows)
    .select('*');

  if (error) {
    console.error('insertGeneratedSessions error:', error);
    return { sessions: [], error: error.message };
  }

  const sessions = ((data ?? []) as Session[]).sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.sort_order - b.sort_order;
  });

  return { sessions, error: null };
}

export type UpdateSessionInput = {
  title?: string;
  planned_duration_min?: number | null;
};

export async function updateSession(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  fields: UpdateSessionInput
): Promise<{ session: Session | null; error: string | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .update(fields)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('updateSession error:', error);
    return { session: null, error: error.message };
  }

  if (!data) {
    return { session: null, error: 'Session not found' };
  }

  return { session: data as Session, error: null };
}
