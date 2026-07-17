import { NextResponse } from 'next/server';
import { createWeightLog, updateProfile } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { createWeightLogSchema } from '@/lib/validations/weight';

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

  const parsed = createWeightLogSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid weight log payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { weightLog, error: logError } = await createWeightLog(
    supabase,
    user.id,
    {
      weight_kg: parsed.data.weight_kg,
      logged_date: parsed.data.logged_date,
      notes: parsed.data.notes ?? null,
    }
  );

  if (logError || !weightLog) {
    return NextResponse.json(
      { error: logError ?? 'Failed to create weight log' },
      { status: 500 }
    );
  }

  const { error: profileError } = await updateProfile(supabase, user.id, {
    current_weight_kg: parsed.data.weight_kg,
  });

  if (profileError) {
    return NextResponse.json(
      { error: profileError },
      { status: 500 }
    );
  }

  return NextResponse.json({ weightLog }, { status: 201 });
}
