import { addWeeks, endOfWeek, format, startOfWeek } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getWeek } from '@/lib/db';
import type { Week } from '@/types';

export function getWeekBounds(date: Date): {
  weekStart: string;
  weekEnd: string;
} {
  return {
    weekStart: format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    weekEnd: format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };
}

/** True when week_start is on or after the current Monday. */
export function isWeekPlannableByDate(weekStart: string, now = new Date()): boolean {
  return weekStart >= getWeekBounds(now).weekStart;
}

export async function getOrCreateCurrentWeek(
  supabase: SupabaseClient,
  userId: string
): Promise<Week> {
  const { weekStart, weekEnd } = getWeekBounds(new Date());

  const existing = await getWeek(supabase, userId, weekStart);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('weeks')
    .insert({
      user_id: userId,
      week_start: weekStart,
      week_end: weekEnd,
      status: 'planning',
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const raced = await getWeek(supabase, userId, weekStart);
      if (raced) {
        return raced;
      }
    }
    console.error('getOrCreateCurrentWeek error:', error);
    throw new Error(error.message);
  }

  return data as Week;
}

/**
 * Ensure week rows exist for a range around the current week (creating
 * `planning`-status placeholders for future weeks that haven't been
 * visited yet), then return them sorted ascending by week_start.
 */
export async function ensureWeeksInRange(
  supabase: SupabaseClient,
  userId: string,
  weeksBefore: number,
  weeksAfter: number
): Promise<Week[]> {
  const anchor = startOfWeek(new Date(), { weekStartsOn: 1 });
  const results: Week[] = [];

  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    const start = addWeeks(anchor, i);
    const weekStart = format(start, 'yyyy-MM-dd');
    const weekEnd = format(
      endOfWeek(start, { weekStartsOn: 1 }),
      'yyyy-MM-dd'
    );

    const existing = await getWeek(supabase, userId, weekStart);
    if (existing) {
      results.push(existing);
      continue;
    }

    const { data, error } = await supabase
      .from('weeks')
      .insert({
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        status: 'planning',
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        const raced = await getWeek(supabase, userId, weekStart);
        if (raced) {
          results.push(raced);
          continue;
        }
      }
      console.error('ensureWeeksInRange error:', error);
      continue;
    }

    results.push(data as Week);
  }

  return results.sort((a, b) => a.week_start.localeCompare(b.week_start));
}
