export type StrengthPromptContext = {
  level: string;
  equipment: string;
  goals: string;
  injury_notes: string;
  cycling_sessions_summary: string;
  recent_weeks_summary: string;
  planning_notes: string;
};

export function buildStrengthPrompt(ctx: StrengthPromptContext): string {
  return `You are a structured strength and conditioning coach generating a complete weekly
training plan with full workout routines.

ATHLETE PROFILE:
- Level: ${ctx.level}
- Available equipment: ${ctx.equipment}
- Goals: ${ctx.goals}
- Injury / constraint notes: ${ctx.injury_notes}

LAST 4 WEEKS HISTORY:
${ctx.recent_weeks_summary}

CYCLING PLAN THIS WEEK:
${ctx.cycling_sessions_summary}
Use this to avoid scheduling heavy leg work the day before or after threshold,
VO2, or long ride sessions.

THIS WEEK CONTEXT:
${ctx.planning_notes}

INSTRUCTIONS:
Generate a structured weekly strength training plan with complete workout routines.
Output valid JSON only.
Design sessions for the available equipment.
Structure each session with named blocks: warm-up, main lifts, accessory work, cool-down.
Each exercise must include: name, sets, reps (or time), and a coaching note.
Aim for 2–4 sessions. Avoid heavy leg sessions around hard cycling days.
Respect injury notes strictly.

OUTPUT FORMAT (JSON only, no preamble, no markdown):
{
  "week_theme": "string",
  "sessions": [
    {
      "day": 2,
      "title": "string",
      "duration_min": 50,
      "description": "string",
      "blocks": [
        {
          "name": "string",
          "duration_min": 10,
          "exercises": [{ "name": "string", "sets": 3, "reps": "8-10", "notes": "string" }]
        }
      ],
      "coaching_note": "string"
    }
  ],
  "week_note": "string"
}`;
}
