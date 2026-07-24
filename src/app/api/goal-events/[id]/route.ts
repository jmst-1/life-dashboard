import { NextResponse } from 'next/server';
import { deleteGoalEvent, updateGoalEvent } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { updateGoalEventSchema } from '@/lib/validations/goal-event';

type RouteContext = { params: { id: string } };

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

  const parsed = updateGoalEventSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid goal event payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { event, error } = await updateGoalEvent(
    supabase,
    user.id,
    context.params.id,
    parsed.data
  );
  if (error || !event) {
    const status = error === 'Goal event not found' ? 404 : 500;
    return NextResponse.json(
      { error: error ?? 'Failed to update goal event' },
      { status }
    );
  }

  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await deleteGoalEvent(
    supabase,
    user.id,
    context.params.id
  );
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
