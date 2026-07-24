import { parseISO } from 'date-fns';
import { NextResponse } from 'next/server';
import { callClaude, parseClaudeJson } from '@/lib/claude';
import { capReachedResponse, checkAndLogAiUsage } from '@/lib/ai-usage';
import {
  getCategories,
  getNutritionPlanByWeek,
  getProfile,
  getSessions,
  getWeekById,
  updateNutritionPlanBrief,
  upsertNutritionPlan,
} from '@/lib/db';
import {
  baselineTDEE,
  buildCalorieTargets,
  buildMacroGuide,
  classifyDayType,
  estimateCalories,
  isRaceWeek,
  weeklyDeficitTarget,
  type DaySessions,
  type MacroGuide,
} from '@/lib/nutrition';
import {
  buildDayMapReadable,
  buildMealPrepPrompt,
  type MealPrepClaudeResponse,
} from '@/lib/prompts/nutrition';
import { createClient } from '@/lib/supabase/server';
import { generateNutritionBodySchema } from '@/lib/validations/nutrition';
import type { Category, DayType, NutritionPlan, Session } from '@/types';

function stringifyDayMap(
  dayMap: Record<number, DayType>
): Record<string, DayType> {
  return Object.fromEntries(
    Object.entries(dayMap).map(([d, t]) => [String(d), t])
  );
}

function stringifyCalMap(
  calByDay: Record<number, number>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(calByDay).map(([d, c]) => [String(d), c])
  );
}

function macroGuideFromStored(
  stored: NutritionPlan['macro_guide']
): MacroGuide {
  const dayMap: Record<number, DayType> = {};
  for (const [d, t] of Object.entries(stored.day_map)) {
    dayMap[Number(d)] = t;
  }
  return {
    day_types: stored.day_types,
    day_map: dayMap,
  };
}

function groupSessionsByDay(
  sessions: Session[],
  categoriesById: Record<string, Category>
): Record<number, DaySessions> {
  const byDay: Record<number, DaySessions> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const session of sessions) {
    const category = categoriesById[session.category_id];
    if (!category) continue;
    const day = session.day_of_week;
    if (day < 0 || day > 6) continue;
    byDay[day].push({ session, category });
  }
  return byDay;
}

function profileReadyForBmr(profile: Awaited<ReturnType<typeof getProfile>>) {
  if (!profile) return false;
  if (profile.tdee_override) return true;
  return (
    profile.current_weight_kg != null &&
    profile.height_cm != null &&
    profile.age != null &&
    profile.biological_sex != null
  );
}

/** Parse Claude meal-prep JSON; on failure treat the whole text as the brief. */
function parseMealPrepResponse(raw: string): {
  summary: string | null;
  brief: string;
} {
  const trimmed = raw.trim();
  try {
    const parsed = parseClaudeJson<MealPrepClaudeResponse>(trimmed);
    const brief =
      typeof parsed.brief === 'string' ? parsed.brief.trim() : '';
    const summary =
      typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (brief) {
      return { summary: summary || null, brief };
    }
  } catch {
    // fall through
  }
  return { summary: null, brief: trimmed };
}

async function generateFull(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  weekId: string
) {
  const [week, profile, categories] = await Promise.all([
    getWeekById(supabase, userId, weekId),
    getProfile(supabase, userId),
    getCategories(supabase, userId, 'active'),
  ]);

  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }
  if (!profileReadyForBmr(profile)) {
    return NextResponse.json(
      {
        error:
          'Profile needs weight, height, age, and biological sex (or a TDEE override) for nutrition targets',
      },
      { status: 400 }
    );
  }
  if (profile.current_weight_kg == null) {
    return NextResponse.json(
      { error: 'Current weight is required for nutrition targets' },
      { status: 400 }
    );
  }

  const existingPlan = await getNutritionPlanByWeek(supabase, userId, weekId);
  if (existingPlan?.meal_prep_brief) {
    return NextResponse.json({
      nutritionPlan: existingPlan,
      skipped: true,
      reason: 'existing_plan',
    });
  }

  const nutritionCategories = categories.filter((c) => c.affects_nutrition);
  const categoriesById = Object.fromEntries(
    nutritionCategories.map((c) => [c.id, c])
  );
  const categoryIds = new Set(nutritionCategories.map((c) => c.id));

  const allSessions = await getSessions(supabase, userId, weekId);
  const sessions = allSessions.filter((s) => categoryIds.has(s.category_id));
  const byDay = groupSessionsByDay(sessions, categoriesById);

  const weightKg = profile.current_weight_kg;
  const trainingCalByDay: Record<number, number> = {};
  const dayMap: Record<number, DayType> = {};

  for (const d of [0, 1, 2, 3, 4, 5, 6]) {
    const daySessions = byDay[d];
    trainingCalByDay[d] = daySessions.reduce(
      (sum, { session, category }) =>
        sum + estimateCalories(session, category, weightKg),
      0
    );
    dayMap[d] = classifyDayType(daySessions);
  }

  const raceWeek = isRaceWeek(
    parseISO(week.week_start),
    parseISO(week.week_end),
    nutritionCategories
  );
  const calorieTargets = buildCalorieTargets(
    profile,
    dayMap,
    trainingCalByDay,
    raceWeek
  );
  const macroGuide = buildMacroGuide(
    profile,
    dayMap,
    calorieTargets,
    raceWeek
  );

  const dayMapReadable = buildDayMapReadable(dayMap, byDay);
  const prompt = buildMealPrepPrompt({
    macroGuide,
    dayMapReadable,
    dietaryNotes: profile.dietary_notes,
    planningNotes: week.planning_notes,
  });

  const usage = await checkAndLogAiUsage({
    supabase,
    userId,
    weekId,
    callType: 'nutrition_brief',
  });
  if (!usage.allowed) {
    return NextResponse.json(
      capReachedResponse(usage.used, usage.cap, usage.error),
      { status: 429 }
    );
  }

  const raw = await callClaude(prompt, { maxTokens: 1400 });
  const { summary, brief } = parseMealPrepResponse(raw);

  const storedMacroGuide: NutritionPlan['macro_guide'] = {
    day_types: macroGuide.day_types,
    day_map: stringifyDayMap(macroGuide.day_map),
  };

  const { nutritionPlan, error } = await upsertNutritionPlan(
    supabase,
    userId,
    {
      week_id: weekId,
      weight_kg: weightKg,
      goal_weight_kg: profile.goal_weight_kg,
      deficit_strategy: profile.deficit_strategy,
      baseline_tdee: baselineTDEE(profile),
      weekly_deficit_target: weeklyDeficitTarget(profile),
      race_week: raceWeek,
      training_calories_map: stringifyCalMap(trainingCalByDay),
      macro_guide: storedMacroGuide,
      meal_prep_brief: brief,
      meal_prep_summary: summary,
    }
  );

  if (error || !nutritionPlan) {
    return NextResponse.json(
      { error: error ?? 'Failed to save nutrition plan' },
      { status: 500 }
    );
  }

  return NextResponse.json({ nutritionPlan });
}

async function generateBriefOnly(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  weekId: string
) {
  const existing = await getNutritionPlanByWeek(supabase, userId, weekId);
  if (!existing) {
    return generateFull(supabase, userId, weekId);
  }

  const [week, profile, categories] = await Promise.all([
    getWeekById(supabase, userId, weekId),
    getProfile(supabase, userId),
    getCategories(supabase, userId, 'active'),
  ]);

  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const nutritionCategories = categories.filter((c) => c.affects_nutrition);
  const categoriesById = Object.fromEntries(
    nutritionCategories.map((c) => [c.id, c])
  );
  const categoryIds = new Set(nutritionCategories.map((c) => c.id));
  const allSessions = await getSessions(supabase, userId, weekId);
  const sessions = allSessions.filter((s) => categoryIds.has(s.category_id));
  const byDay = groupSessionsByDay(sessions, categoriesById);

  const macroGuide = macroGuideFromStored(existing.macro_guide);
  const dayMapReadable = buildDayMapReadable(macroGuide.day_map, byDay);
  const prompt = buildMealPrepPrompt({
    macroGuide,
    dayMapReadable,
    dietaryNotes: profile.dietary_notes,
    planningNotes: week.planning_notes,
  });

  const usage = await checkAndLogAiUsage({
    supabase,
    userId,
    weekId,
    callType: 'nutrition_brief',
  });
  if (!usage.allowed) {
    return NextResponse.json(
      capReachedResponse(usage.used, usage.cap, usage.error),
      { status: 429 }
    );
  }

  const raw = await callClaude(prompt, { maxTokens: 1400 });
  const { summary, brief } = parseMealPrepResponse(raw);

  const { nutritionPlan, error } = await updateNutritionPlanBrief(
    supabase,
    userId,
    weekId,
    brief,
    summary
  );

  if (error || !nutritionPlan) {
    return NextResponse.json(
      { error: error ?? 'Failed to update meal-prep brief' },
      { status: 500 }
    );
  }

  return NextResponse.json({ nutritionPlan });
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = generateNutritionBodySchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? 'Invalid nutrition payload';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { weekId, mode } = parsed.data;

    if (mode === 'brief_only') {
      return await generateBriefOnly(supabase, user.id, weekId);
    }

    return await generateFull(supabase, user.id, weekId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nutrition generate failed';
    console.error('POST /api/nutrition/generate error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
