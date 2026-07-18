import { NextResponse } from 'next/server';
import {
  getSessionsByWeekAndCategory,
  getWeekById,
} from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { listSessionsQuerySchema } from '@/lib/validations/session';

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
