import { format, startOfWeek } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { plannedDateForDay } from '@/lib/plan-context';
import {
  normalizeCategories,
  normalizeCategory,
  syncedModeFields,
} from '@/lib/normalize-category';
import type {
  Category,
  CyclingZone,
  ExerciseLogEntry,
  MovementLibraryEntry,
  NutritionPlan,
  Profile,
  RoutineStep,
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

  return normalizeCategories((data ?? []) as Category[]);
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

  return data ? normalizeCategory(data as Category) : null;
}

export type CreateCategoryInput = {
  name: string;
  icon: string;
  color: string;
  color_dim?: string | null;
  tracking_type: Category['tracking_type'];
  mode?: Category['mode'];
  effort_type?: Category['effort_type'];
  sessions_per_week?: number;
  timed_session?: boolean;
  task_template?: Category['task_template'];
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
  const synced = syncedModeFields({
    mode: input.mode ?? undefined,
    tracking_type: input.tracking_type,
  });

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      color_dim: input.color_dim ?? null,
      tracking_type: synced.tracking_type,
      mode: synced.mode,
      effort_type: input.effort_type ?? 'duration',
      sessions_per_week: input.sessions_per_week ?? 3,
      timed_session: input.timed_session ?? false,
      task_template: input.task_template ?? [],
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

  return {
    category: data ? normalizeCategory(data as Category) : null,
    error: null,
  };
}

export type UpdateCategoryInput = {
  name?: string;
  icon?: string;
  color?: string;
  color_dim?: string | null;
  tracking_type?: Category['tracking_type'];
  mode?: Category['mode'];
  effort_type?: Category['effort_type'];
  sessions_per_week?: number;
  timed_session?: boolean;
  task_template?: Category['task_template'];
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
  const patch: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  if (input.mode !== undefined || input.tracking_type !== undefined) {
    const synced = syncedModeFields({
      mode: input.mode ?? undefined,
      tracking_type: input.tracking_type,
    });
    patch.mode = synced.mode;
    patch.tracking_type = synced.tracking_type;
  }

  const { data, error } = await supabase
    .from('categories')
    .update(patch)
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

  return {
    category: data ? normalizeCategory(data as Category) : null,
    error: null,
  };
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
  userId: string,
  weekId: string
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_id', weekId)
    .order('day_of_week')
    .order('sort_order');

  if (error) {
    console.error('getSessions error:', error);
    return [];
  }

  return ((data ?? []) as Session[]).map((s) => ({
    ...s,
    tasks_done: Array.isArray(s.tasks_done) ? s.tasks_done : [],
    rpe: s.rpe ?? null,
    timed_duration_sec: s.timed_duration_sec ?? null,
  }));
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
  userId: string,
  weekId: string,
  categoryId: string
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
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
  day_of_week?: number;
  planned_date?: string | null;
  routine_steps?: RoutineStep[] | null;
  library_entry_id?: string | null;
  completed?: boolean;
  skipped?: boolean;
  skip_reason?: string | null;
  actual_duration_min?: number | null;
  actual_calories_kcal?: number | null;
  execution_notes?: string | null;
  completed_at?: string | null;
  exercise_log?: ExerciseLogEntry[] | null;
  rpe?: number | null;
  tasks_done?: string[];
  timed_duration_sec?: number | null;
};

export async function getActiveMovementLibrary(
  supabase: SupabaseClient
): Promise<MovementLibraryEntry[]> {
  const { data, error } = await supabase
    .from('movement_library')
    .select('*')
    .eq('active', true);

  if (error) {
    console.error('getActiveMovementLibrary error:', error);
    return [];
  }

  return (data ?? []) as MovementLibraryEntry[];
}

export async function getRecentMovementEntryIds(
  supabase: SupabaseClient,
  userId: string,
  withinDays = 3
): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - withinDays);
  const sinceIso = since.toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .select('library_entry_id, completed_at, created_at')
    .eq('user_id', userId)
    .not('library_entry_id', 'is', null);

  if (error) {
    console.error('getRecentMovementEntryIds error:', error);
    return [];
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const entryId = row.library_entry_id as string | null;
    if (!entryId) continue;
    const completedAt = row.completed_at as string | null;
    const createdAt = row.created_at as string | null;
    const inWindow =
      (completedAt != null && completedAt >= sinceIso) ||
      (createdAt != null && createdAt >= sinceIso);
    if (inWindow) ids.add(entryId);
  }

  return Array.from(ids);
}

export async function insertMovementSessions(
  supabase: SupabaseClient,
  userId: string,
  weekId: string,
  categoryId: string,
  weekStart: string,
  picks: Record<number, MovementLibraryEntry>
): Promise<{ sessions: Session[]; error: string | null }> {
  const days = [0, 1, 2, 3, 4, 5, 6] as const;
  const rows = days.map((day, index) => {
    const pick = picks[day];
    return {
      week_id: weekId,
      user_id: userId,
      category_id: categoryId,
      day_of_week: day,
      planned_date: plannedDateForDay(weekStart, day),
      title: pick.name,
      description: null,
      planned_duration_min: pick.duration_min,
      session_type: 'random_pick',
      sort_order: index,
      zones: null,
      blocks: null,
      routine_steps: JSON.parse(JSON.stringify(pick.steps)) as RoutineStep[],
      exercise_log: null,
      library_entry_id: pick.id,
    };
  });

  const { data, error } = await supabase
    .from('sessions')
    .insert(rows)
    .select('*');

  if (error) {
    console.error('insertMovementSessions error:', error);
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

export async function getSessionById(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('getSessionById error:', error);
    return null;
  }

  return data as Session | null;
}

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

export async function deleteSession(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('deleteSession error:', error);
    return { error: error.message };
  }

  if (!data) {
    return { error: 'Session not found' };
  }

  return { error: null };
}

export type InsertSessionSnapshotInput = {
  id: string;
  weekId: string;
  categoryId: string;
  day_of_week: number;
  planned_date: string;
  title: string;
  description: string | null;
  planned_duration_min: number | null;
  sort_order: number;
  session_type: string;
  zones: Session['zones'];
  blocks: Session['blocks'];
};

export async function insertSessionFromSnapshot(
  supabase: SupabaseClient,
  userId: string,
  input: InsertSessionSnapshotInput
): Promise<{ session: Session | null; error: string | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      id: input.id,
      week_id: input.weekId,
      user_id: userId,
      category_id: input.categoryId,
      day_of_week: input.day_of_week,
      planned_date: input.planned_date,
      title: input.title,
      description: input.description,
      planned_duration_min: input.planned_duration_min,
      sort_order: input.sort_order,
      session_type: input.session_type,
      zones: input.zones,
      blocks: input.blocks,
      routine_steps: null,
      exercise_log: null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('insertSessionFromSnapshot error:', error);
    return { session: null, error: error.message };
  }

  return { session: data as Session, error: null };
}

export async function swapSessionDays(
  supabase: SupabaseClient,
  userId: string,
  weekId: string,
  sessionIdA: string,
  sessionIdB: string
): Promise<{ sessions: Session[]; error: string | null }> {
  const [sessionA, sessionB] = await Promise.all([
    getSessionById(supabase, userId, sessionIdA),
    getSessionById(supabase, userId, sessionIdB),
  ]);

  if (!sessionA || !sessionB) {
    return { sessions: [], error: 'Session not found' };
  }

  if (
    sessionA.week_id !== weekId ||
    sessionB.week_id !== weekId ||
    sessionA.user_id !== userId ||
    sessionB.user_id !== userId
  ) {
    return { sessions: [], error: 'Sessions cannot be swapped' };
  }

  if (sessionA.id === sessionB.id) {
    return { sessions: [sessionA], error: null };
  }

  const slotA = {
    day_of_week: sessionA.day_of_week,
    planned_date: sessionA.planned_date,
    sort_order: sessionA.sort_order,
  };
  const slotB = {
    day_of_week: sessionB.day_of_week,
    planned_date: sessionB.planned_date,
    sort_order: sessionB.sort_order,
  };

  // Stage unique sort_orders only (keep day_of_week in 0–6 for DB CHECK).
  const [stageA, stageB] = await Promise.all([
    supabase
      .from('sessions')
      .update({ sort_order: -1 })
      .eq('id', sessionA.id)
      .eq('user_id', userId),
    supabase
      .from('sessions')
      .update({ sort_order: -2 })
      .eq('id', sessionB.id)
      .eq('user_id', userId),
  ]);

  if (stageA.error || stageB.error) {
    const message =
      stageA.error?.message ?? stageB.error?.message ?? 'Failed to stage swap';
    console.error('swapSessionDays stage error:', message);
    return { sessions: [], error: message };
  }

  const [updateA, updateB] = await Promise.all([
    supabase
      .from('sessions')
      .update({
        day_of_week: slotB.day_of_week,
        planned_date: slotB.planned_date,
        sort_order: slotB.sort_order,
      })
      .eq('id', sessionA.id)
      .eq('user_id', userId)
      .select('*')
      .single(),
    supabase
      .from('sessions')
      .update({
        day_of_week: slotA.day_of_week,
        planned_date: slotA.planned_date,
        sort_order: slotA.sort_order,
      })
      .eq('id', sessionB.id)
      .eq('user_id', userId)
      .select('*')
      .single(),
  ]);

  if (updateA.error || updateB.error || !updateA.data || !updateB.data) {
    const message =
      updateA.error?.message ??
      updateB.error?.message ??
      'Failed to swap sessions';
    console.error('swapSessionDays update error:', message);
    return { sessions: [], error: message };
  }

  return {
    sessions: sortSessionsByDay([
      updateA.data as Session,
      updateB.data as Session,
    ]),
    error: null,
  };
}

function sortSessionsByDay(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.sort_order - b.sort_order;
  });
}

export async function reorderCategorySessions(
  supabase: SupabaseClient,
  userId: string,
  weekId: string,
  categoryId: string,
  orderedSessionIds: string[]
): Promise<{ sessions: Session[]; error: string | null }> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('week_id', weekId)
    .eq('category_id', categoryId)
    .order('day_of_week')
    .order('sort_order');

  if (error) {
    console.error('reorderCategorySessions load error:', error);
    return { sessions: [], error: error.message };
  }

  const current = sortSessionsByDay((data ?? []) as Session[]);
  const currentIds = current.map((s) => s.id);

  if (
    orderedSessionIds.length !== currentIds.length ||
    new Set(orderedSessionIds).size !== orderedSessionIds.length ||
    !orderedSessionIds.every((id) => currentIds.includes(id))
  ) {
    return {
      sessions: [],
      error: 'Session list is not a valid permutation',
    };
  }

  const slots = current.map((s) => ({
    day_of_week: s.day_of_week,
    planned_date: s.planned_date,
    sort_order: s.sort_order,
  }));

  // Stage unique temporary sort_orders (keep day_of_week in 0–6 for DB CHECK).
  for (let i = 0; i < orderedSessionIds.length; i++) {
    const { error: stageError } = await supabase
      .from('sessions')
      .update({
        sort_order: -(i + 1),
      })
      .eq('id', orderedSessionIds[i])
      .eq('user_id', userId);

    if (stageError) {
      console.error('reorderCategorySessions stage error:', stageError);
      return { sessions: [], error: stageError.message };
    }
  }

  const updated: Session[] = [];
  for (let i = 0; i < orderedSessionIds.length; i++) {
    const slot = slots[i];
    const { data: row, error: updateError } = await supabase
      .from('sessions')
      .update({
        day_of_week: slot.day_of_week,
        planned_date: slot.planned_date,
        sort_order: slot.sort_order,
      })
      .eq('id', orderedSessionIds[i])
      .eq('user_id', userId)
      .select('*')
      .single();

    if (updateError || !row) {
      console.error('reorderCategorySessions update error:', updateError);
      return {
        sessions: [],
        error: updateError?.message ?? 'Failed to reorder sessions',
      };
    }
    updated.push(row as Session);
  }

  return { sessions: sortSessionsByDay(updated), error: null };
}

export async function getNutritionPlanByWeek(
  supabase: SupabaseClient,
  userId: string,
  weekId: string
): Promise<NutritionPlan | null> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_id', weekId)
    .maybeSingle();

  if (error) {
    console.error('getNutritionPlanByWeek error:', error);
    return null;
  }

  return data as NutritionPlan | null;
}

export type UpsertNutritionPlanInput = {
  week_id: string;
  weight_kg: number;
  goal_weight_kg: number | null;
  deficit_strategy: string;
  baseline_tdee: number;
  weekly_deficit_target: number;
  race_week: boolean;
  training_calories_map: Record<string, number>;
  macro_guide: NutritionPlan['macro_guide'];
  meal_prep_brief: string;
  meal_prep_summary?: string | null;
};

export async function upsertNutritionPlan(
  supabase: SupabaseClient,
  userId: string,
  input: UpsertNutritionPlanInput
): Promise<{ nutritionPlan: NutritionPlan | null; error: string | null }> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .upsert(
      {
        ...input,
        user_id: userId,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'week_id,user_id' }
    )
    .select('*')
    .single();

  if (error) {
    console.error('upsertNutritionPlan error:', error);
    return { nutritionPlan: null, error: error.message };
  }

  return { nutritionPlan: data as NutritionPlan, error: null };
}

export async function updateNutritionPlanBrief(
  supabase: SupabaseClient,
  userId: string,
  weekId: string,
  mealPrepBrief: string,
  mealPrepSummary: string | null = null
): Promise<{ nutritionPlan: NutritionPlan | null; error: string | null }> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .update({
      meal_prep_brief: mealPrepBrief,
      meal_prep_summary: mealPrepSummary,
      generated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('week_id', weekId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('updateNutritionPlanBrief error:', error);
    return { nutritionPlan: null, error: error.message };
  }

  if (!data) {
    return { nutritionPlan: null, error: 'Nutrition plan not found' };
  }

  return { nutritionPlan: data as NutritionPlan, error: null };
}

export async function getWeeksInRange(
  supabase: SupabaseClient,
  userId: string,
  fromStart: string,
  toStart: string
): Promise<Week[]> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('user_id', userId)
    .gte('week_start', fromStart)
    .lte('week_start', toStart)
    .order('week_start', { ascending: true });

  if (error) {
    console.error('getWeeksInRange error:', error);
    return [];
  }

  return (data ?? []) as Week[];
}

export async function getRecentWeeks(
  supabase: SupabaseClient,
  userId: string,
  limit = 12
): Promise<Week[]> {
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getRecentWeeks error:', error);
    return [];
  }

  return (data ?? []) as Week[];
}

export async function getGoalEvents(
  supabase: SupabaseClient,
  userId: string
): Promise<import('@/types').GoalEvent[]> {
  const { data, error } = await supabase
    .from('goal_events')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: true });

  if (error) {
    console.error('getGoalEvents error:', error);
    return [];
  }

  return (data ?? []) as import('@/types').GoalEvent[];
}

export async function createGoalEvent(
  supabase: SupabaseClient,
  userId: string,
  input: {
    label: string;
    event_date: string;
    event_type: string;
    distances: string[];
  }
): Promise<{
  event: import('@/types').GoalEvent | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('goal_events')
    .insert({
      user_id: userId,
      label: input.label,
      event_date: input.event_date,
      event_type: input.event_type,
      distances: input.distances,
    })
    .select('*')
    .single();

  if (error) {
    console.error('createGoalEvent error:', error);
    return { event: null, error: error.message };
  }

  return { event: data as import('@/types').GoalEvent, error: null };
}

export async function updateGoalEvent(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: Partial<{
    label: string;
    event_date: string;
    event_type: string;
    distances: string[];
  }>
): Promise<{
  event: import('@/types').GoalEvent | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('goal_events')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('updateGoalEvent error:', error);
    return { event: null, error: error.message };
  }
  if (!data) {
    return { event: null, error: 'Goal event not found' };
  }

  return { event: data as import('@/types').GoalEvent, error: null };
}

export async function deleteGoalEvent(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('goal_events')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('deleteGoalEvent error:', error);
    return { error: error.message };
  }

  return { error: null };
}

export async function upsertWeekReview(
  supabase: SupabaseClient,
  userId: string,
  input: {
    week_id: string;
    category_id: string;
    score: number;
    planned_min: number;
    actual_min: number;
    planned_sessions: number;
    completed_sessions: number;
    skipped_sessions: number;
    missed_sessions: number;
    completion_rate: number;
  }
): Promise<{ error: string | null }> {
  const { data: existing } = await supabase
    .from('week_reviews')
    .select('id')
    .eq('week_id', input.week_id)
    .eq('category_id', input.category_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('week_reviews')
      .update(input)
      .eq('id', existing.id)
      .eq('user_id', userId);
    if (error) {
      console.error('upsertWeekReview update error:', error);
      return { error: error.message };
    }
    return { error: null };
  }

  const { error } = await supabase.from('week_reviews').insert({
    ...input,
    user_id: userId,
  });
  if (error) {
    console.error('upsertWeekReview insert error:', error);
    return { error: error.message };
  }
  return { error: null };
}

export async function insertTrackedSessions(
  supabase: SupabaseClient,
  userId: string,
  weekId: string,
  weekStart: string,
  categoryId: string,
  slots: { day: number; title: string; sort_order: number }[]
): Promise<{ sessions: Session[]; error: string | null }> {
  const rows = slots.map((s) => ({
    week_id: weekId,
    user_id: userId,
    category_id: categoryId,
    day_of_week: s.day,
    planned_date: plannedDateForDay(weekStart, s.day),
    title: s.title,
    description: null,
    planned_duration_min: null,
    session_type: 'tracked_slot',
    sort_order: s.sort_order,
    tasks_done: [],
  }));

  const { data, error } = await supabase
    .from('sessions')
    .insert(rows)
    .select('*');

  if (error) {
    console.error('insertTrackedSessions error:', error);
    return { sessions: [], error: error.message };
  }

  return { sessions: (data ?? []) as Session[], error: null };
}
