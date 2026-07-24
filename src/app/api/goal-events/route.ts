import { NextResponse } from 'next/server';
import { createGoalEvent } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { createGoalEventSchema } from '@/lib/validations/goal-event';

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

  const parsed = createGoalEventSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid goal event payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { event, error } = await createGoalEvent(supabase, user.id, parsed.data);
  if (error || !event) {
    return NextResponse.json(
      { error: error ?? 'Failed to create goal event' },
      { status: 500 }
    );
  }

  return NextResponse.json({ event }, { status: 201 });
}
