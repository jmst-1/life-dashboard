import { redirect } from 'next/navigation';
import { AheadView } from '@/components/ahead/ahead-view';
import { getCategories, getGoalEvents, getProfile, getSessions } from '@/lib/db';
import { normalizeCategories } from '@/lib/normalize-category';
import { createClient } from '@/lib/supabase/server';
import { ensureWeeksInRange, getOrCreateCurrentWeek } from '@/lib/weeks';
import type { Session } from '@/types';

type AheadPageProps = {
  searchParams: { plan?: string };
};

export default async function AheadPage({ searchParams }: AheadPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentWeek = await getOrCreateCurrentWeek(supabase, user.id);
  const [weeks, categories, goalEvents, profile] = await Promise.all([
    ensureWeeksInRange(supabase, user.id, 2, 2),
    getCategories(supabase, user.id, 'active'),
    getGoalEvents(supabase, user.id),
    getProfile(supabase, user.id),
  ]);

  const plannedWeeks = weeks.filter((w) => w.status !== 'planning');
  const sessionLists = await Promise.all(
    plannedWeeks.map((w) => getSessions(supabase, user.id, w.id))
  );
  const sessionsByWeekId: Record<string, Session[]> = {};
  plannedWeeks.forEach((w, i) => {
    sessionsByWeekId[w.id] = sessionLists[i] ?? [];
  });

  const initialPlanOpen =
    !!searchParams.plan && currentWeek.status === 'planning';

  return (
    <AheadView
      currentWeek={currentWeek}
      weeks={weeks}
      categories={normalizeCategories(categories)}
      goalEvents={goalEvents}
      sessionsByWeekId={sessionsByWeekId}
      currentWeightKg={profile?.current_weight_kg ?? null}
      initialPlanOpen={initialPlanOpen}
    />
  );
}
