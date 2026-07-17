import { format } from 'date-fns';
import { NextResponse } from 'next/server';
import {
  createWeightLog,
  getProfile,
  updateProfile,
} from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { updateProfileSchema } from '@/lib/validations/profile';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await getProfile(supabase, user.id);
  if (!existing) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid profile payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { profile, error } = await updateProfile(
    supabase,
    user.id,
    parsed.data
  );

  if (error || !profile) {
    return NextResponse.json(
      { error: error ?? 'Failed to update profile' },
      { status: 500 }
    );
  }

  const newWeight = parsed.data.current_weight_kg;
  if (
    newWeight != null &&
    newWeight !== existing.current_weight_kg
  ) {
    const { error: logError } = await createWeightLog(supabase, user.id, {
      weight_kg: newWeight,
      logged_date: format(new Date(), 'yyyy-MM-dd'),
      notes: null,
    });
    if (logError) {
      console.error('Failed to insert weight log on profile update:', logError);
    }
  }

  return NextResponse.json({ profile });
}
