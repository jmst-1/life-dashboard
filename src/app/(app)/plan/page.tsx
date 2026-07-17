import { redirect } from 'next/navigation';
import { PlanningWizard } from '@/components/plan/planning-wizard';
import { getCategories, getProfile } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateCurrentWeek } from '@/lib/weeks';

export default async function PlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const week = await getOrCreateCurrentWeek(supabase, user.id);

  if (week.status === 'active' || week.status === 'complete') {
    redirect('/week/current?locked=1');
  }

  const [profile, categories] = await Promise.all([
    getProfile(supabase, user.id),
    getCategories(supabase, user.id, 'active'),
  ]);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold">Plan this week</h1>
        <p className="mt-1 text-sm text-gray-400">
          Set context and scope before generating your training plan.
        </p>
        <div className="mt-8">
          <PlanningWizard
            week={week}
            currentWeightKg={profile?.current_weight_kg ?? null}
            categories={categories}
          />
        </div>
      </div>
    </div>
  );
}
