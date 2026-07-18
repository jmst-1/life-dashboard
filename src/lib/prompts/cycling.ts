export type CyclingPromptContext = {
  ftp: number;
  weight_kg: number | null;
  current_phase: string;
  goal_event_summary: string;
  goals: string;
  injury_notes: string;
  recent_weeks_summary: string;
  planning_notes: string;
};

export function buildCyclingPrompt(ctx: CyclingPromptContext): string {
  const wkg =
    ctx.weight_kg != null && ctx.weight_kg > 0
      ? (ctx.ftp / ctx.weight_kg).toFixed(2)
      : '—';

  return `You are a structured cycling coach generating a weekly training plan for a specific athlete.

ATHLETE PROFILE:
- FTP: ${ctx.ftp}W (${wkg} W/kg at ${ctx.weight_kg ?? '—'}kg)
- Equipment: Smart trainer (Rouvy ERG), outdoor bike with power meter
- Current phase: ${ctx.current_phase}
- Goal event: ${ctx.goal_event_summary}
- Goals: ${ctx.goals}
- Constraint notes: ${ctx.injury_notes}

LAST 4 WEEKS HISTORY:
${ctx.recent_weeks_summary}

THIS WEEK CONTEXT:
${ctx.planning_notes}

INSTRUCTIONS:
Generate a structured 7-day cycling training plan. Output valid JSON only.
Follow periodisation: if last week score > 85%, you may progress load slightly.
If score < 65%, repeat or reduce load. Week 4 of any phase = recovery week.
If a goal event is set, respect ${ctx.current_phase} strictly — it is already computed
from weeks-until-event, do not override it based on your own judgment.
Include: session title, day (0=Mon, 6=Sun), duration_min, description with zone targets,
specific watt ranges computed from FTP, and coaching notes.
Balance: Z2 base, sweetspot, threshold intervals, one long ride, one rest day.

OUTPUT FORMAT (JSON only, no preamble, no markdown):
{
  "week_theme": "string",
  "sessions": [
    {
      "day": 0,
      "title": "string",
      "duration_min": 60,
      "description": "string",
      "zones": [{ "name": "string", "duration_min": 10, "pct_ftp_low": 56, "pct_ftp_high": 75 }],
      "coaching_note": "string"
    }
  ],
  "week_note": "string"
}`;
}
