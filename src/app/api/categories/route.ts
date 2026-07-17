import { NextResponse } from 'next/server';
import { createCategory } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { createCategorySchema } from '@/lib/validations/category';

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

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid category payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { category, error } = await createCategory(
    supabase,
    user.id,
    parsed.data
  );

  if (error || !category) {
    const status = error === 'Category name already exists' ? 409 : 500;
    return NextResponse.json(
      { error: error ?? 'Failed to create category' },
      { status }
    );
  }

  return NextResponse.json({ category }, { status: 201 });
}
