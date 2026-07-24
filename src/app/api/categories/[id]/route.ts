import { NextResponse } from 'next/server';
import { getCategoryById, updateCategory } from '@/lib/db';
import { syncedModeFields } from '@/lib/normalize-category';
import { createClient } from '@/lib/supabase/server';
import { updateCategorySchema } from '@/lib/validations/category';

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

  const existing = await getCategoryById(supabase, user.id, context.params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? 'Invalid category payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = { ...parsed.data };
  if (data.mode !== undefined || data.tracking_type !== undefined) {
    const synced = syncedModeFields({
      mode: data.mode ?? undefined,
      tracking_type: data.tracking_type,
    });
    data.mode = synced.mode;
    data.tracking_type = synced.tracking_type;
  }

  const { category, error } = await updateCategory(
    supabase,
    user.id,
    context.params.id,
    data
  );

  if (error || !category) {
    const status = error === 'Category name already exists' ? 409 : 500;
    return NextResponse.json(
      { error: error ?? 'Failed to update category' },
      { status }
    );
  }

  return NextResponse.json({ category });
}
