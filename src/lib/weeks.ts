import { endOfWeek, format, startOfWeek } from 'date-fns';
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
