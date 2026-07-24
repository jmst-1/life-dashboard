import { format } from 'date-fns';
import { NextResponse } from 'next/server';
import { checkAndLogAiUsage } from '@/lib/ai-usage';
import { callClaude } from '@/lib/claude';
import { getCategories, getSessions, getWeekById, upsertWeekReview } from '@/lib/db';
import { buildWeekReviewPrompt } from '@/lib/prompts/week-review';
import { createClient } from '@/lib/supabase/server';
import { computeWeekScore, isSessionMissed } from '@/lib/week-score';
import type { Session } from '@/types';

type RouteContext = {
  params: { id: string };
};

/** Strip any accidental ```fences``` — commentary is plain text, not JSON. */
function cleanCommentary(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:\w+)?\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekId = context.params.id;

    const week = await getWeekById(supabase, user.id, weekId);
    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    const [categories, sessions] = await Promise.all([
      getCategories(supabase, user.id, 'active'),
      getSessions(supabase, user.id, weekId),
    ]);

    const { overall, segments } = computeWeekScore(categories, sessions);

    const todayIso = format(new Date(), 'yyyy-MM-dd');
    const sessionsByCategory = new Map<string, Session[]>();
    for (const s of sessions) {
      const list = sessionsByCategory.get(s.category_id) ?? [];
      list.push(s);
      sessionsByCategory.set(s.category_id, list);
    }

    for (const seg of segments) {
      const catSessions = sessionsByCategory.get(seg.categoryId) ?? [];
      const skippedSessions = catSessions.filter((s) => s.skipped).length;
      const missedSessions = catSessions.filter((s) =>
        isSessionMissed(s, todayIso)
      ).length;

      const { error: reviewError } = await upsertWeekReview(supabase, user.id, {
        week_id: weekId,
        category_id: seg.categoryId,
        score: seg.score,
        planned_min: seg.plannedMin,
        actual_min: seg.actualMin,
        planned_sessions: seg.plannedSessions,
        completed_sessions: seg.completedSessions,
        skipped_sessions: skippedSessions,
        missed_sessions: missedSessions,
        completion_rate: seg.completion,
      });
      if (reviewError) {
        console.error('POST /api/weeks/[id]/review upsert error:', reviewError);
      }
    }

    const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));

    let commentary: string | null = null;
    const usage = await checkAndLogAiUsage({
      supabase,
      userId: user.id,
      weekId,
      callType: 'week_commentary',
    });
    if (!usage.allowed) {
      // Cap blocks commentary only — still persist scores + complete the week.
      if (usage.error) {
        console.error(
          'POST /api/weeks/[id]/review usage error:',
          usage.error
        );
      }
    } else {
      try {
        const prompt = buildWeekReviewPrompt({
          weekStart: week.week_start,
          overall,
          segments,
          categoriesById,
          planningNotes: week.planning_notes,
        });
        const raw = await callClaude(prompt, { maxTokens: 500 });
        commentary = cleanCommentary(raw);
      } catch (err) {
        console.error('POST /api/weeks/[id]/review commentary error:', err);
        commentary = null;
      }
    }

    const scoreBreakdown = Object.fromEntries(
      segments.map((seg) => [seg.categoryId, seg.score])
    );

    const { data, error } = await supabase
      .from('weeks')
      .update({
        score_overall: overall,
        score_breakdown: scoreBreakdown,
        coach_commentary: commentary,
        status: 'complete',
      })
      .eq('id', weekId)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('POST /api/weeks/[id]/review week update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ week: data, overall, segments });
  } catch (err) {
    console.error('POST /api/weeks/[id]/review error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
