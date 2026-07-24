import { redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
import { NutritionCoachForm } from '@/components/settings/nutrition-coach-form';
import { getProfile } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function NutritionCoachPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    redirect('/onboarding');
  }

  return (
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title="Nutrition Coach" backHref="/settings" />
      <p className="text-[13px] text-ld-text-sub">
        Dietary preferences used when generating your meal-prep brief.
      </p>

      <div className="mt-6">
        <NutritionCoachForm profile={profile} />
      </div>
    </div>
  );
}
