export type RunningPromptContext = {
  threshold_pace: string;
  current_phase: string;
  goal_event_summary: string;
  goals: string;
  equipment_notes: string;
  injury_notes: string;
  recent_weeks_summary: string;
  planning_notes: string;
};

export function buildRunningPrompt(ctx: RunningPromptContext): string {
  return `You are a structured running coach generating a weekly training plan for a specific athlete.

ATHLETE PROFILE:
- Threshold pace: ${ctx.threshold_pace}
- Equipment / surface: ${ctx.equipment_notes}
- Current phase: ${ctx.current_phase}
- Goal event: ${ctx.goal_event_summary}
- Goals: ${ctx.goals}
- Constraint notes: ${ctx.injury_notes}

LAST 4 WEEKS HISTORY:
${ctx.recent_weeks_summary}

THIS WEEK CONTEXT:
${ctx.planning_notes}

INSTRUCTIONS:
Generate a structured weekly running training plan. Output valid JSON only.
Follow periodisation: if last week score > 85%, you may progress load slightly.
If score < 65%, repeat or reduce load. Week 4 of any phase = recovery week.
If a goal event is set, respect ${ctx.current_phase} strictly — it is already computed
from weeks-until-event, do not override it based on your own judgment.
Derive easy, tempo, and interval paces relative to threshold pace (${ctx.threshold_pace}).
Include pace targets and effort cues in each session description.
Balance: easy runs, one quality session (tempo or intervals), one long run, and at least one rest or very easy day.
Aim for 3–5 sessions (day 0=Mon, 6=Sun). Respect injury notes strictly.

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
