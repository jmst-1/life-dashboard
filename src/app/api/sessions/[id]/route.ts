import { NextResponse } from 'next/server';
import {
  deleteSession,
  getSessionById,
  getWeekById,
  updateSession,
} from '@/lib/db';
import { plannedDateForDay } from '@/lib/plan-context';
import { createClient } from '@/lib/supabase/server';
import { updateSessionSchema } from '@/lib/validations/session';

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid session payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updates: {
    title?: string;
    planned_duration_min?: number | null;
    day_of_week?: number;
    planned_date?: string | null;
  } = {};
  if (parsed.data.title !== undefined) {
    updates.title = parsed.data.title;
  }
  if (parsed.data.planned_duration_min !== undefined) {
    updates.planned_duration_min = parsed.data.planned_duration_min;
  }

  if (parsed.data.day_of_week !== undefined) {
    const existing = await getSessionById(
      supabase,
      user.id,
      context.params.id
    );
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const week = await getWeekById(supabase, user.id, existing.week_id);
    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    updates.day_of_week = parsed.data.day_of_week;
    updates.planned_date = plannedDateForDay(
      week.week_start,
      parsed.data.day_of_week
    );
  }

  const { session, error } = await updateSession(
    supabase,
    user.id,
    context.params.id,
    updates
  );

  if (error === 'Session not found') {
    return NextResponse.json({ error }, { status: 404 });
  }
  if (error || !session) {
    return NextResponse.json(
      { error: error ?? 'Failed to update session' },
      { status: 500 }
    );
  }

  return NextResponse.json({ session });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await deleteSession(supabase, user.id, context.params.id);

  if (error === 'Session not found') {
    return NextResponse.json({ error }, { status: 404 });
  }
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
