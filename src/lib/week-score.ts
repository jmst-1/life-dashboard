import type { Category, Session } from '@/types';

export type CategoryScoreSegment = {
  categoryId: string;
  color: string;
  plannedMin: number;
  actualMin: number;
  plannedSessions: number;
  completedSessions: number;
  score: number;
};

export type WeekScoreResult = {
  overall: number;
  segments: CategoryScoreSegment[];
};

export function scoreBandColor(score: number): string {
  if (score >= 90) return '#34d399'; // green
  if (score >= 75) return '#60a5fa'; // blue
  if (score >= 60) return '#fbbf24'; // amber
  if (score >= 40) return '#fb923c'; // orange
  return '#f87171'; // red
}

export function scoreBandTextClass(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 75) return 'text-blue-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function categoryScore(
  plannedMin: number,
  actualMin: number,
  plannedSessions: number,
  completedSessions: number
): number {
  if (plannedMin <= 0 && plannedSessions <= 0) return 0;
  const timePart =
    plannedMin > 0 ? Math.min(actualMin / plannedMin, 1) * 60 : 0;
  const completionPart =
    plannedSessions > 0 ? (completedSessions / plannedSessions) * 40 : 0;
  return timePart + completionPart;
}

/** Build per-category segments and overall weighted score for categories with sessions. */
export function computeWeekScore(
  categories: Category[],
  sessions: Session[]
): WeekScoreResult {
  const byCategory = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = byCategory.get(s.category_id) ?? [];
    list.push(s);
    byCategory.set(s.category_id, list);
  }

  const segments: CategoryScoreSegment[] = [];

  for (const category of categories) {
    const catSessions = byCategory.get(category.id);
    if (!catSessions || catSessions.length === 0) continue;

    const plannedMin = catSessions.reduce(
      (sum, s) => sum + (s.planned_duration_min ?? 0),
      0
    );
    const actualMin = catSessions.reduce((sum, s) => {
      if (s.completed) return sum + (s.actual_duration_min ?? 0);
      return sum;
    }, 0);
    const plannedSessions = catSessions.length;
    const completedSessions = catSessions.filter((s) => s.completed).length;
    const score = categoryScore(
      plannedMin,
      actualMin,
      plannedSessions,
      completedSessions
    );

    segments.push({
      categoryId: category.id,
      color: category.color,
      plannedMin,
      actualMin,
      plannedSessions,
      completedSessions,
      score,
    });
  }

  const totalPlanned = segments.reduce((sum, s) => sum + s.plannedMin, 0);
  let overall = 0;
  if (totalPlanned > 0) {
    overall = segments.reduce(
      (sum, s) => sum + s.score * (s.plannedMin / totalPlanned),
      0
    );
  } else if (segments.length > 0) {
    overall =
      segments.reduce((sum, s) => sum + s.score, 0) / segments.length;
  }

  return {
    overall: Math.round(overall),
    segments,
  };
}

/** UI-only missed: planned_date has passed and session is not completed/skipped. */
export function isSessionMissed(
  session: Session,
  todayIso: string
): boolean {
  if (session.completed || session.skipped) return false;
  if (!session.planned_date) return false;
  return session.planned_date < todayIso;
}

export type SessionStatus = 'planned' | 'complete' | 'skipped' | 'missed';

export function getSessionStatus(
  session: Session,
  todayIso: string
): SessionStatus {
  if (session.completed) return 'complete';
  if (session.skipped) return 'skipped';
  if (isSessionMissed(session, todayIso)) return 'missed';
  return 'planned';
}
