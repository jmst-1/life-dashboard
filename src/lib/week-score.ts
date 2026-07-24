import type { Category, Session } from '@/types';
import { getCategoryMode, getEffortType } from '@/lib/category-mode';

export type CategoryScoreSegment = {
  categoryId: string;
  color: string;
  plannedMin: number;
  actualMin: number;
  plannedSessions: number;
  completedSessions: number;
  completion: number;
  effort: number;
  score: number;
};

export type WeekScoreResult = {
  overall: number;
  segments: CategoryScoreSegment[];
};

export function scoreBandColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#60a5fa';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f07820';
  return '#ef4444';
}

export function scoreBandTextClass(score: number): string {
  if (score >= 90) return 'text-ld-green';
  if (score >= 75) return 'text-ld-blue';
  if (score >= 60) return 'text-ld-amber';
  if (score >= 40) return 'text-ld-orange';
  return 'text-ld-red';
}

export function scoreBand(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Locked in', color: '#22c55e' };
  if (score >= 75) return { label: 'Solid week', color: '#60a5fa' };
  if (score >= 60) return { label: 'Partial', color: '#f59e0b' };
  if (score >= 40) return { label: 'Rough week', color: '#f07820' };
  return { label: 'Tough week', color: '#ef4444' };
}

/** RPE 5–8 = full credit; outside that band softens slightly. */
function rpeQuality(rpe: number | null | undefined): number {
  if (rpe == null) return 1;
  if (rpe >= 5 && rpe <= 8) return 1;
  if (rpe === 4 || rpe === 9) return 0.85;
  if (rpe <= 3 || rpe === 10) return 0.7;
  return 1;
}

function sessionCompletion(
  category: Category,
  session: Session
): number {
  if (session.skipped) return 0;
  if (!session.completed) return 0;

  const effort = getEffortType(category);
  if (effort === 'binary') return 1;

  const mode = getCategoryMode(category);
  if (mode === 'tracked') {
    const template = category.task_template ?? [];
    if (template.length === 0) return 1;
    const done = session.tasks_done?.length ?? 0;
    return Math.min(1, done / template.length);
  }

  return 1;
}

function sessionEffort(category: Category, session: Session): number {
  if (!session.completed || session.skipped) return 0;
  if (getEffortType(category) !== 'rpe') {
    return sessionCompletion(category, session);
  }
  return rpeQuality(session.rpe);
}

/**
 * v6 equal-weight scoring:
 * category = 0.7 * completion + 0.3 * effort
 * overall = mean of category scores
 */
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

    const completion =
      plannedSessions > 0
        ? catSessions.reduce((sum, s) => sum + sessionCompletion(category, s), 0) /
          plannedSessions
        : 0;
    const effort =
      plannedSessions > 0
        ? catSessions.reduce((sum, s) => sum + sessionEffort(category, s), 0) /
          plannedSessions
        : 0;

    const score = Math.round((0.7 * completion + 0.3 * effort) * 100);

    segments.push({
      categoryId: category.id,
      color: category.color,
      plannedMin,
      actualMin,
      plannedSessions,
      completedSessions,
      completion,
      effort,
      score,
    });
  }

  const overall =
    segments.length === 0
      ? 0
      : Math.round(
          segments.reduce((sum, s) => sum + s.score, 0) / segments.length
        );

  return { overall, segments };
}

export function isSessionMissed(session: Session, todayIso: string): boolean {
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
