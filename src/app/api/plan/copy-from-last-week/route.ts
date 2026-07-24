import { addDays, format, parseISO } from 'date-fns';
import { NextResponse } from 'next/server';
import {
  deleteSessionsForWeekCategory,
  getCategoryById,
  getRecentWeeks,
  getSessionsByWeekAndCategory,
  getWeekById,
} from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { isWeekPlannableByDate } from '@/lib/weeks';
import { copyFromLastWeekBodySchema } from '@/lib/validations/plan';
import type { Session } from '@/types';

function plannedDateForDay(weekStart: string, dayOfWeek: number): string {
  return format(addDays(parseISO(weekStart), dayOfWeek), 'yyyy-MM-dd');
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

    const parsed = copyFromLastWeekBodySchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? 'Invalid copy payload';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { weekId, categoryId } = parsed.data;

    const [targetWeek, category] = await Promise.all([
      getWeekById(supabase, user.id, weekId),
      getCategoryById(supabase, user.id, categoryId),
    ]);

    if (!targetWeek) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    if (!isWeekPlannableByDate(targetWeek.week_start)) {
      return NextResponse.json(
        { error: 'Past weeks cannot be planned' },
        { status: 400 }
      );
    }

    const recentWeeks = await getRecentWeeks(supabase, user.id, 16);
    const priorWeeks = recentWeeks.filter(
      (w) => w.week_start < targetWeek.week_start
    );

    let sourceSessions: Session[] = [];
    for (const prior of priorWeeks) {
      const sessions = await getSessionsByWeekAndCategory(
        supabase,
        user.id,
        prior.id,
        categoryId
      );
      if (sessions.length > 0) {
        sourceSessions = sessions;
        break;
      }
    }

    if (sourceSessions.length === 0) {
      return NextResponse.json(
        { error: 'No previous week plan found for this category' },
        { status: 404 }
      );
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

    const rows = sourceSessions.map((s, index) => ({
      week_id: weekId,
      user_id: user.id,
      category_id: categoryId,
      day_of_week: s.day_of_week,
      planned_date: plannedDateForDay(targetWeek.week_start, s.day_of_week),
      title: s.title,
      description: s.description,
      planned_duration_min: s.planned_duration_min,
      zones: s.zones,
      blocks: s.blocks,
      routine_steps: s.routine_steps,
      exercise_log: null,
      session_type: s.session_type,
      sort_order: s.sort_order ?? index,
      completed: false,
      skipped: false,
      skip_reason: null,
      actual_duration_min: null,
      actual_calories_kcal: null,
      execution_notes: null,
      completed_at: null,
      library_entry_id: s.library_entry_id,
      rpe: null,
      tasks_done: [],
      timed_duration_sec: null,
    }));

    const { data, error } = await supabase
      .from('sessions')
      .insert(rows)
      .select('*');

    if (error) {
      console.error('POST /api/plan/copy-from-last-week insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessions = ((data ?? []) as Session[]).sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return a.sort_order - b.sort_order;
    });

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('POST /api/plan/copy-from-last-week error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
