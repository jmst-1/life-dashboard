import { NextResponse } from 'next/server';
import {
  getSessionById,
  updateSession,
  type UpdateSessionInput,
} from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { completeSessionSchema } from '@/lib/validations/session';

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

  const parsed = completeSessionSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid complete-session payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const existing = await getSessionById(
    supabase,
    user.id,
    context.params.id
  );
  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const data = parsed.data;
  const updates: UpdateSessionInput = {
    actual_duration_min: data.actual_duration_min,
    completed: data.completed,
    skipped: data.skipped,
    completed_at: data.completed ? new Date().toISOString() : null,
  };

  if (data.actual_calories_kcal !== undefined) {
    updates.actual_calories_kcal = data.actual_calories_kcal;
  }
  if (data.execution_notes !== undefined) {
    updates.execution_notes = data.execution_notes;
  }
  if (data.exercise_log !== undefined) {
    updates.exercise_log = data.exercise_log;
  }
  if (data.skipped) {
    updates.skip_reason = data.skip_reason ?? null;
  } else {
    updates.skip_reason = null;
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
      { error: error ?? 'Failed to complete session' },
      { status: 500 }
    );
  }

  return NextResponse.json({ session });
}
