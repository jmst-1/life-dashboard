import { NextResponse } from 'next/server';
import { getWeekById, reorderCategorySessions } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { reorderSessionsSchema } from '@/lib/validations/session';

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

  const parsed = reorderSessionsSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid reorder payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { weekId, categoryId, sessionIds } = parsed.data;

  const week = await getWeekById(supabase, user.id, weekId);
  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }

  const { sessions, error } = await reorderCategorySessions(
    supabase,
    user.id,
    weekId,
    categoryId,
    sessionIds
  );

  if (error) {
    const status =
      error === 'Session list is not a valid permutation' ? 400 : 500;
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ sessions });
}
