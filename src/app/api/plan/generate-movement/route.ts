import { NextResponse } from 'next/server';
import {
  deleteSessionsForWeekCategory,
  getActiveMovementLibrary,
  getCategories,
  getCategoryById,
  getRecentMovementEntryIds,
  getSessions,
  getWeekById,
  insertMovementSessions,
} from '@/lib/db';
import { getCategoryMode } from '@/lib/category-mode';
import {
  buildMovementDayMap,
  libraryTypeFromCategoryName,
  pickWeeklyRoutines,
} from '@/lib/movement';
import { createClient } from '@/lib/supabase/server';
import { isWeekPlannableByDate } from '@/lib/weeks';
import { generateMovementBodySchema } from '@/lib/validations/plan';

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

    const parsedBody = generateMovementBodySchema.safeParse(body);
    if (!parsedBody.success) {
      const message =
        parsedBody.error.issues[0]?.message ?? 'Invalid generate-movement payload';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { weekId, categoryId } = parsedBody.data;

    const [week, category] = await Promise.all([
      getWeekById(supabase, user.id, weekId),
      getCategoryById(supabase, user.id, categoryId),
    ]);

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }
    if (!isWeekPlannableByDate(week.week_start)) {
      return NextResponse.json(
        { error: 'Past weeks cannot be planned' },
        { status: 400 }
      );
    }
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    if (getCategoryMode(category) !== 'seeded') {
      return NextResponse.json(
        { error: 'Category must be seeded (random_pick) mode' },
        { status: 400 }
      );
    }

    const existingForCategory = await getSessions(supabase, user.id, weekId).then(
      (all) => all.filter((s) => s.category_id === categoryId)
    );
    if (existingForCategory.length > 0) {
      return NextResponse.json({
        sessions: existingForCategory,
        skipped: true,
        reason: 'existing_plan',
      });
    }

    const libraryType = libraryTypeFromCategoryName(category.name);
    const [library, weekSessions, categories, recentEntryIds] =
      await Promise.all([
        getActiveMovementLibrary(supabase),
        getSessions(supabase, user.id, weekId),
        getCategories(supabase, user.id, 'active'),
        getRecentMovementEntryIds(supabase, user.id),
      ]);

    const typedLibrary = library.filter((e) => e.library_type === libraryType);
    if (typedLibrary.length === 0) {
      return NextResponse.json(
        { error: 'No active movement library entries found' },
        { status: 400 }
      );
    }

    const dayMap = buildMovementDayMap(weekSessions, categories);
    const picks = pickWeeklyRoutines(
      library,
      libraryType,
      dayMap,
      recentEntryIds
    );

    const { error: deleteError } = await deleteSessionsForWeekCategory(
      supabase,
      user.id,
      weekId,
      categoryId
    );
    if (deleteError) {
      return NextResponse.json({ error: deleteError }, { status: 500 });
    }

    const { sessions, error: insertError } = await insertMovementSessions(
      supabase,
      user.id,
      weekId,
      categoryId,
      week.week_start,
      picks
    );
    if (insertError) {
      return NextResponse.json({ error: insertError }, { status: 500 });
    }

    const enriched = sessions.map((session) => {
      const pick = session.library_entry_id
        ? library.find((e) => e.id === session.library_entry_id)
        : undefined;
      return {
        ...session,
        target_area: pick?.target_area ?? null,
      };
    });

    return NextResponse.json({ sessions: enriched });
  } catch (err) {
    console.error('POST /api/plan/generate-movement error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
