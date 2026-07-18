import { NextResponse } from 'next/server';
import {
  getActiveMovementLibrary,
  getCategoryById,
  getRecentMovementEntryIds,
  getSessionById,
  updateSession,
} from '@/lib/db';
import {
  libraryTypeFromCategoryName,
  pickRerollEntry,
} from '@/lib/movement';
import { createClient } from '@/lib/supabase/server';
import { rerollMovementBodySchema } from '@/lib/validations/plan';
import type { RoutineStep } from '@/types';

export async function POST(request: Request) {
  try {
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

    const parsedBody = rerollMovementBodySchema.safeParse(body);
    if (!parsedBody.success) {
      const message =
        parsedBody.error.issues[0]?.message ?? 'Invalid reroll-movement payload';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { sessionId } = parsedBody.data;

    const session = await getSessionById(supabase, user.id, sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const category = await getCategoryById(
      supabase,
      user.id,
      session.category_id
    );
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    if (category.tracking_type !== 'random_pick') {
      return NextResponse.json(
        { error: 'Session category must have tracking_type random_pick' },
        { status: 400 }
      );
    }

    const libraryType = libraryTypeFromCategoryName(category.name);
    const [library, recentEntryIds] = await Promise.all([
      getActiveMovementLibrary(supabase),
      getRecentMovementEntryIds(supabase, user.id),
    ]);

    const pick = pickRerollEntry(
      library,
      libraryType,
      session.library_entry_id,
      recentEntryIds
    );
    if (!pick) {
      return NextResponse.json(
        { error: 'No alternative movement library entry available' },
        { status: 400 }
      );
    }

    const routineSteps = JSON.parse(
      JSON.stringify(pick.steps)
    ) as RoutineStep[];

    const { session: updated, error: updateError } = await updateSession(
      supabase,
      user.id,
      sessionId,
      {
        title: pick.name,
        planned_duration_min: pick.duration_min,
        routine_steps: routineSteps,
        library_entry_id: pick.id,
      }
    );

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError ?? 'Failed to update session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: {
        ...updated,
        target_area: pick.target_area,
      },
    });
  } catch (err) {
    console.error('POST /api/plan/reroll-movement error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
