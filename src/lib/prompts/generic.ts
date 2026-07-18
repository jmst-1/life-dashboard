export type GenericPromptContext = {
  category_name: string;
  coaching_brief: string;
  goal_event_summary: string;
  current_phase: string;
  recent_weeks_summary: string;
  planning_notes: string;
};

export function buildGenericPrompt(ctx: GenericPromptContext): string {
  return `You are a structured coach generating a weekly training plan for the category "${ctx.category_name}".

ATHLETE / CATEGORY PROFILE:
- Category: ${ctx.category_name}
- Coaching brief: ${ctx.coaching_brief}
- Goal event: ${ctx.goal_event_summary}
- Current phase: ${ctx.current_phase}

LAST 4 WEEKS HISTORY:
${ctx.recent_weeks_summary}

THIS WEEK CONTEXT:
${ctx.planning_notes}

INSTRUCTIONS:
Generate a structured weekly training plan for this category. Output valid JSON only.
Aim for 2–5 sessions across the week (day 0=Mon, 6=Sun).
Each session needs a clear title, duration, description, and coaching note.
Respect any constraints in the coaching brief and planning notes.
If a goal event / phase is set, align load with ${ctx.current_phase}.

OUTPUT FORMAT (JSON only, no preamble, no markdown):
{
  "week_theme": "string",
  "sessions": [
    {
      "day": 0,
      "title": "string",
      "duration_min": 45,
      "description": "string",
      "coaching_note": "string"
    }
  ],
  "week_note": "string"
}`;
}
