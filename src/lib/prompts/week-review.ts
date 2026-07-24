import type { CategoryScoreSegment } from '@/lib/week-score';
import type { Category } from '@/types';

export type WeekReviewPromptContext = {
  weekStart: string;
  overall: number;
  segments: CategoryScoreSegment[];
  categoriesById: Record<string, Category>;
  planningNotes: string | null;
};

function summarizeSegments(
  segments: CategoryScoreSegment[],
  categoriesById: Record<string, Category>
): string {
  if (segments.length === 0) return 'No categories tracked this week.';
  return segments
    .map((seg) => {
      const name = categoriesById[seg.categoryId]?.name ?? 'Category';
      return `- ${name}: ${seg.score}/100 · ${seg.completedSessions}/${seg.plannedSessions} sessions completed · ${seg.actualMin}/${seg.plannedMin} min`;
    })
    .join('\n');
}

/** One combined Claude call across all categories — never per-category. */
export function buildWeekReviewPrompt(ctx: WeekReviewPromptContext): string {
  return `You are a supportive but honest weekly coach reviewing a person's training/habit week
across multiple categories. You are NOT calculating scores — those are already
fixed below. Your only job is to write a short combined commentary.

WEEK OF: ${ctx.weekStart}
OVERALL SCORE: ${ctx.overall}/100

PER-CATEGORY RESULTS:
${summarizeSegments(ctx.segments, ctx.categoriesById)}

CONTEXT FOR THE WEEK:
${ctx.planningNotes?.trim() || 'None'}

INSTRUCTIONS:
Write 2–4 sentences of plain-text commentary summarizing the week across ALL
categories together (not one paragraph per category). Call out one clear win
and one clear area to improve next week. Be direct and specific, not generic.
Output plain text only, no markdown, no bullet symbols, no JSON.`;
}
