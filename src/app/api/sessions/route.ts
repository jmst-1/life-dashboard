import { NextResponse } from 'next/server';
import {
  getSessionsByWeekAndCategory,
  getWeekById,
  insertSessionFromSnapshot,
} from '@/lib/db';
import { plannedDateForDay } from '@/lib/plan-context';
import { createClient } from '@/lib/supabase/server';
import {
  createSessionSchema,
  listSessionsQuerySchema,
} from '@/lib/validations/session';

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = listSessionsQuerySchema.safeParse({
    weekId: searchParams.get('weekId'),
    categoryId: searchParams.get('categoryId'),
  });

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid sessions query';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { weekId, categoryId } = parsed.data;

  const week = await getWeekById(supabase, user.id, weekId);
  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }

  const sessions = await getSessionsByWeekAndCategory(
    supabase,
    weekId,
    categoryId
  );

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
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

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid session payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { weekId, session: input } = parsed.data;
  const week = await getWeekById(supabase, user.id, weekId);
  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }

  const { session, error } = await insertSessionFromSnapshot(
    supabase,
    user.id,
    {
      id: input.id,
      weekId,
      categoryId: input.categoryId,
      day_of_week: input.day_of_week,
      planned_date: plannedDateForDay(week.week_start, input.day_of_week),
      title: input.title,
      description: input.description ?? null,
      planned_duration_min: input.planned_duration_min,
      sort_order: input.sort_order,
      session_type: input.session_type ?? 'ai_generated',
      zones: (input.zones as never) ?? null,
      blocks: (input.blocks as never) ?? null,
    }
  );

  if (error || !session) {
    return NextResponse.json(
      { error: error ?? 'Failed to create session' },
      { status: 500 }
    );
  }

  return NextResponse.json({ session }, { status: 201 });
}
