import { dayLabel } from '@/lib/plan-context';
import type { MacroGuide } from '@/lib/nutrition';
import type { Category, DayType, Session } from '@/types';

export type MealPrepPromptContext = {
  macroGuide: MacroGuide;
  dayMapReadable: string;
  dietaryNotes: string | null;
  planningNotes: string | null;
};

export type MealPrepClaudeResponse = {
  summary: string;
  brief: string;
};

function countDaysOfType(dayMap: Record<number, DayType>, type: DayType): number {
  return Object.values(dayMap).filter((t) => t === type).length;
}

export function buildDayMapReadable(
  dayMap: Record<number, DayType>,
  daySessions: Record<number, { session: Session; category: Category }[]>
): string {
  return [0, 1, 2, 3, 4, 5, 6]
    .map((d) => {
      const type = dayMap[d] ?? 'rest';
      const sessions = daySessions[d] ?? [];
      const names = Array.from(
        new Set(
          sessions
            .filter(({ category }) => category.affects_nutrition)
            .map(({ category }) => category.name)
        )
      );
      const suffix = names.length ? ` (${names.join('+')})` : '';
      return `${dayLabel(d)}: ${type}${suffix}`;
    })
    .join(', ');
}

export function buildMealPrepPrompt(ctx: MealPrepPromptContext): string {
  const { day_types, day_map } = ctx.macroGuide;
  const hard = day_types.hard;
  const moderate = day_types.moderate;
  const rest = day_types.rest;
  const hardCount = countDaysOfType(day_map, 'hard');
  const moderateCount = countDaysOfType(day_map, 'moderate');
  const restCount = countDaysOfType(day_map, 'rest');

  return `You are a practical meal-prep coach. You are NOT calculating calories or macros —
those are already fixed below. Your only job is to turn them into a realistic
Sunday batch-cook plan.

THIS WEEK'S MACRO TARGETS:
Hard days (${hardCount}x): ${hard.calories}kcal · ${hard.protein_g}g protein · ${hard.carbs_g}g carbs · ${hard.fat_g}g fat
Moderate days (${moderateCount}x): ${moderate.calories}kcal · ${moderate.protein_g}g protein · ${moderate.carbs_g}g carbs · ${moderate.fat_g}g fat
Rest days (${restCount}x): ${rest.calories}kcal · ${rest.protein_g}g protein · ${rest.carbs_g}g carbs · ${rest.fat_g}g fat

DAY MAP: ${ctx.dayMapReadable}

DIETARY PREFERENCES / CONSTRAINTS:
${ctx.dietaryNotes?.trim() || 'None'}

THIS WEEK CONTEXT:
${ctx.planningNotes?.trim() || 'None'}

INSTRUCTIONS:
Return JSON only, no preamble, no markdown fences. Shape:
{
  "summary": "string",
  "brief": "string"
}

summary: At most 2 sentences. Name the protein bases and carb bases, and how
portioning differs on hard vs rest days. No fluff.

brief: A Sunday batch-cook plan (250–400 words). Suggest 2–3 protein bases and
1–2 carb bases, and explain how to portion the SAME base ingredients differently
across hard/moderate/rest days — protein portion stays constant, carb portion
scales with the day. Be specific about quantities. Practical, no fluff, assume
a standard home kitchen. Plain text inside the JSON string — no markdown, no
bullet symbols.`;
}
