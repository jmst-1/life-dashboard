import { NextResponse } from 'next/server';
import { getWeekById, swapSessionDays } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { swapSessionDaysSchema } from '@/lib/validations/session';

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

  const parsed = swapSessionDaysSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid swap payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { weekId, sessionIdA, sessionIdB } = parsed.data;

  const week = await getWeekById(supabase, user.id, weekId);
  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }

  const { sessions, error } = await swapSessionDays(
    supabase,
    user.id,
    weekId,
    sessionIdA,
    sessionIdB
  );

  if (error === 'Session not found') {
    return NextResponse.json({ error }, { status: 404 });
  }
  if (error) {
    const status = error === 'Sessions cannot be swapped' ? 400 : 500;
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ sessions });
}
