import { addDays, format, parseISO } from 'date-fns';
import type { Category, Session, Week, WeekReview } from '@/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function dayLabel(day: number): string {
  return DAY_LABELS[day] ?? `Day ${day}`;
}

export function plannedDateForDay(weekStart: string, day: number): string {
  return format(addDays(parseISO(weekStart), day), 'yyyy-MM-dd');
}

export function formatGoalEventSummary(category: Category): string {
  if (!category.goal_event_name && !category.goal_event_date) {
    return 'None';
  }
  const name = category.goal_event_name?.trim() || 'Goal event';
  if (category.goal_event_date) {
    return `${name} — ${category.goal_event_date}`;
  }
  return name;
}

export function formatRecentWeeksSummary(
  reviews: WeekReview[],
  weeksById: Record<string, Week>
): string {
  if (reviews.length === 0) {
    return 'No prior history.';
  }

  return reviews
    .map((review) => {
      const week = weeksById[review.week_id];
      const weekLabel = week?.week_start ?? review.week_id;
      const score =
        review.score != null ? `${Math.round(review.score)}%` : 'n/a';
      const rate =
        review.completion_rate != null
          ? `${Math.round(review.completion_rate * 100)}% sessions`
          : 'n/a sessions';
      return `- Week of ${weekLabel}: score ${score}, ${rate}`;
    })
    .join('\n');
}

export function formatCyclingSessionsSummary(sessions: Session[]): string {
  if (sessions.length === 0) {
    return 'No cycling sessions planned this week.';
  }

  return sessions
    .map((session) => {
      const day = dayLabel(session.day_of_week);
      const duration =
        session.planned_duration_min != null
          ? `${session.planned_duration_min} min`
          : 'duration n/a';
      const desc = session.description
        ? ` — ${session.description.slice(0, 120)}`
        : '';
      return `${day}: ${session.title} (${duration})${desc}`;
    })
    .join('\n');
}
