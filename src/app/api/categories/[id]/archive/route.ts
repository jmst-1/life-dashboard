import { NextResponse } from 'next/server';
import { archiveCategory, getCategoryById } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

type RouteContext = {
  params: { id: string };
};

export async function PATCH(_request: Request, context: RouteContext) {
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

  const { category, error } = await archiveCategory(
    supabase,
    user.id,
    context.params.id
  );

  if (error || !category) {
    return NextResponse.json(
      { error: error ?? 'Failed to archive category' },
      { status: 500 }
    );
  }

  return NextResponse.json({ category });
}
