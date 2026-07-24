import type { Category } from '@/types';
import { getCategoryMode } from '@/lib/category-mode';

/**
 * Distribute N tracked sessions across the week (Mon–Sun).
 * Prefer spreading: e.g. 3 → Mon/Wed/Fri, 5 → Mon–Fri, 7 → every day.
 */
export function pickTrackedDays(sessionsPerWeek: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(sessionsPerWeek)));
  const patterns: Record<number, number[]> = {
    1: [2],
    2: [1, 4],
    3: [0, 2, 4],
    4: [0, 2, 4, 6],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return patterns[n] ?? patterns[3];
}

export function buildTrackedSlots(category: Category): {
  day: number;
  title: string;
  sort_order: number;
}[] {
  if (getCategoryMode(category) !== 'tracked') return [];
  const days = pickTrackedDays(category.sessions_per_week ?? 3);
  return days.map((day, i) => ({
    day,
    title: `${category.name} session`,
    sort_order: i,
  }));
}
