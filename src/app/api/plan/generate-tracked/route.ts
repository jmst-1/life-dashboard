import { NextResponse } from 'next/server';
import {
  deleteSessionsForWeekCategory,
  getCategoryById,
  getSessionsByWeekAndCategory,
  getWeekById,
  insertTrackedSessions,
} from '@/lib/db';
import { getCategoryMode } from '@/lib/category-mode';
import { buildTrackedSlots } from '@/lib/tracked-slots';
import { createClient } from '@/lib/supabase/server';
import { isWeekPlannableByDate } from '@/lib/weeks';
import { generateTrackedBodySchema } from '@/lib/validations/plan';

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

    const parsedBody = generateTrackedBodySchema.safeParse(body);
    if (!parsedBody.success) {
      const message =
        parsedBody.error.issues[0]?.message ?? 'Invalid generate-tracked payload';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { weekId, categoryId } = parsedBody.data;

    const [week, category] = await Promise.all([
      getWeekById(supabase, user.id, weekId),
      getCategoryById(supabase, user.id, categoryId),
    ]);

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }
    if (!isWeekPlannableByDate(week.week_start)) {
      return NextResponse.json(
        { error: 'Past weeks cannot be planned' },
        { status: 400 }
      );
    }
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    if (getCategoryMode(category) !== 'tracked') {
      return NextResponse.json(
        { error: 'Category must be in tracked mode' },
        { status: 400 }
      );
    }

    const existingSessions = await getSessionsByWeekAndCategory(
      supabase,
      user.id,
      weekId,
      categoryId
    );
    if (existingSessions.length > 0) {
      return NextResponse.json({
        sessions: existingSessions,
        skipped: true,
        reason: 'existing_plan',
      });
    }

    const slots = buildTrackedSlots(category);

    const { error: deleteError } = await deleteSessionsForWeekCategory(
      supabase,
      user.id,
      weekId,
      categoryId
    );
    if (deleteError) {
      return NextResponse.json({ error: deleteError }, { status: 500 });
    }

    const { sessions, error: insertError } = await insertTrackedSessions(
      supabase,
      user.id,
      weekId,
      week.week_start,
      categoryId,
      slots
    );
    if (insertError) {
      return NextResponse.json({ error: insertError }, { status: 500 });
    }

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('POST /api/plan/generate-tracked error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
