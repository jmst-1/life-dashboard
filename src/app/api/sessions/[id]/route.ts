import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/db';
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
  } = {};
  if (parsed.data.title !== undefined) {
    updates.title = parsed.data.title;
  }
  if (parsed.data.planned_duration_min !== undefined) {
    updates.planned_duration_min = parsed.data.planned_duration_min;
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
