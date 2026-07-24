import { redirect } from 'next/navigation';
import { LogView } from '@/components/log/log-view';
import {
  getCategories,
  getProfile,
  getRecentWeeks,
  getSessions,
  getWeightLogs,
} from '@/lib/db';
import { normalizeCategories } from '@/lib/normalize-category';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateCurrentWeek } from '@/lib/weeks';

export default async function LogPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentWeek = await getOrCreateCurrentWeek(supabase, user.id);
  const [recentWeeks, categories, weightLogs, profile] = await Promise.all([
    getRecentWeeks(supabase, user.id, 12),
    getCategories(supabase, user.id, 'active'),
    getWeightLogs(supabase, user.id),
    getProfile(supabase, user.id),
  ]);

  const pastWeeks = recentWeeks.filter((w) => w.id !== currentWeek.id);

  const currentWeekSessions =
    currentWeek.status === 'planning'
      ? []
      : await getSessions(supabase, user.id, currentWeek.id);

  return (
    <LogView
      currentWeek={currentWeek}
      pastWeeks={pastWeeks}
      categories={normalizeCategories(categories)}
      currentWeekSessions={currentWeekSessions}
      weightLogs={weightLogs}
      goalWeightKg={profile?.goal_weight_kg ?? null}
    />
  );
}
