import { NextResponse } from 'next/server';
import { callClaude, parseClaudeJson } from '@/lib/claude';
import { getCategoryRegistryEntry } from '@/lib/category-registry';
import {
  deleteSessionsForWeekCategory,
  getCategories,
  getCategoryById,
  getProfile,
  getSessionsByWeekAndCategory,
  getWeekById,
  getWeekReviewsForCategory,
  insertGeneratedSessions,
} from '@/lib/db';
import {
  formatCyclingSessionsSummary,
  formatGoalEventSummary,
  formatRecentWeeksSummary,
} from '@/lib/plan-context';
import { createClient } from '@/lib/supabase/server';
import { derivePhase } from '@/lib/training-phase';
import {
  cyclingPlanResponseSchema,
  generatePlanBodySchema,
  genericPlanResponseSchema,
  strengthPlanResponseSchema,
  type PlanResponse,
} from '@/lib/validations/plan';

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

    const parsedBody = generatePlanBodySchema.safeParse(body);
    if (!parsedBody.success) {
      const message =
        parsedBody.error.issues[0]?.message ?? 'Invalid generate payload';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { weekId, categoryId, planningNotes } = parsedBody.data;

    const [week, category, profile] = await Promise.all([
      getWeekById(supabase, user.id, weekId),
      getCategoryById(supabase, user.id, categoryId),
      getProfile(supabase, user.id),
    ]);

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const registry = getCategoryRegistryEntry(category);
    if (!registry.promptBuilder) {
      return NextResponse.json(
        { error: 'Use /api/plan/generate-movement' },
        { status: 400 }
      );
    }

    const { reviews, weeksById } = await getWeekReviewsForCategory(
      supabase,
      user.id,
      categoryId,
      week.week_start,
      4
    );
    const recent_weeks_summary = formatRecentWeeksSummary(reviews, weeksById);
    const planning_notes =
      planningNotes?.trim() ||
      week.planning_notes?.trim() ||
      'No additional notes.';

    const coach = category.coach_context ?? {};
    const current_phase =
      derivePhase(category.goal_event_date) ??
      (typeof coach.phase === 'string' ? coach.phase : null) ??
      'base';
    const goal_event_summary = formatGoalEventSummary(category);

    let cycling_sessions_summary = 'No cycling sessions planned this week.';
    if (registry.typeKey === 'strength') {
      const allCategories = await getCategories(supabase, user.id, 'active');
      const cyclingCategory = allCategories.find(
        (c) => getCategoryRegistryEntry(c).typeKey === 'cycling'
      );
      if (cyclingCategory) {
        const cyclingSessions = await getSessionsByWeekAndCategory(
          supabase,
          weekId,
          cyclingCategory.id
        );
        cycling_sessions_summary =
          formatCyclingSessionsSummary(cyclingSessions);
      }
    }

    let prompt: string;
    if (registry.typeKey === 'cycling') {
      prompt = registry.promptBuilder({
        ftp: typeof coach.ftp === 'number' ? coach.ftp : 200,
        weight_kg: profile?.current_weight_kg ?? null,
        current_phase,
        goal_event_summary,
        goals:
          typeof coach.goals === 'string' && coach.goals.trim()
            ? coach.goals
            : 'General fitness',
        injury_notes:
          typeof coach.injury_notes === 'string' && coach.injury_notes.trim()
            ? coach.injury_notes
            : 'None',
        recent_weeks_summary,
        planning_notes,
      });
    } else if (registry.typeKey === 'strength') {
      prompt = registry.promptBuilder({
        level:
          typeof coach.level === 'string' && coach.level.trim()
            ? coach.level
            : 'intermediate',
        equipment:
          typeof coach.equipment === 'string' && coach.equipment.trim()
            ? coach.equipment
            : 'Gym access',
        goals:
          typeof coach.goals === 'string' && coach.goals.trim()
            ? coach.goals
            : 'General strength',
        injury_notes:
          typeof coach.injury_notes === 'string' && coach.injury_notes.trim()
            ? coach.injury_notes
            : 'None',
        cycling_sessions_summary,
        recent_weeks_summary,
        planning_notes,
      });
    } else {
      prompt = registry.promptBuilder({
        category_name: category.name,
        coaching_brief:
          typeof coach.coaching_brief === 'string' &&
          coach.coaching_brief.trim()
            ? coach.coaching_brief
            : 'No coaching brief provided.',
        goal_event_summary,
        current_phase,
        recent_weeks_summary,
        planning_notes,
      });
    }

    const strengthMaxTokens = 8000;
    const raw = await callClaude(prompt, {
      // Strength plans with full exercise blocks are much larger than cycling.
      maxTokens: registry.typeKey === 'strength' ? strengthMaxTokens : undefined,
    });
    const json = parseClaudeJson<unknown>(raw);

    let plan: PlanResponse;
    if (registry.sessionRenderer === 'cycling') {
      const validated = cyclingPlanResponseSchema.safeParse(json);
      if (!validated.success) {
        return NextResponse.json(
          {
            error:
              validated.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join('; ') || 'Invalid cycling plan response',
          },
          { status: 500 }
        );
      }
      plan = validated.data;
    } else if (registry.sessionRenderer === 'strength') {
      const validated = strengthPlanResponseSchema.safeParse(json);
      if (!validated.success) {
        return NextResponse.json(
          {
            error:
              validated.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join('; ') || 'Invalid strength plan response',
          },
          { status: 500 }
        );
      }
      plan = validated.data;
    } else {
      const validated = genericPlanResponseSchema.safeParse(json);
      if (!validated.success) {
        return NextResponse.json(
          {
            error:
              validated.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join('; ') || 'Invalid generic plan response',
          },
          { status: 500 }
        );
      }
      plan = validated.data;
    }

    const { error: deleteError } = await deleteSessionsForWeekCategory(
      supabase,
      user.id,
      weekId,
      categoryId
    );
    if (deleteError) {
      return NextResponse.json({ error: deleteError }, { status: 500 });
    }

    const { sessions, error: insertError } = await insertGeneratedSessions(
      supabase,
      user.id,
      weekId,
      categoryId,
      week.week_start,
      plan,
      registry.sessionRenderer
    );
    if (insertError) {
      return NextResponse.json({ error: insertError }, { status: 500 });
    }

    return NextResponse.json({
      sessions,
      week_theme: plan.week_theme,
      week_note: plan.week_note,
    });
  } catch (err) {
    console.error('POST /api/plan/generate error:', err);
    const message =
      err instanceof Error ? err.message : 'Failed to generate plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
