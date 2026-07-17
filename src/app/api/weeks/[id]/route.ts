import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateWeekSchema } from '@/lib/validations/week';
import type { Week } from '@/types';

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

  const parsed = updateWeekSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid week payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updates: Partial<Pick<Week, 'planning_notes' | 'status'>> = {};
  if (parsed.data.planning_notes !== undefined) {
    updates.planning_notes = parsed.data.planning_notes;
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
  }

  const { data, error } = await supabase
    .from('weeks')
    .update(updates)
    .eq('id', context.params.id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('PATCH /api/weeks/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }

  return NextResponse.json({ week: data as Week });
}
