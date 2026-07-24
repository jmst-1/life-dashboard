import { format } from 'date-fns';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { TodayView } from '@/components/today/today-view';
import { getCategories, getNutritionPlanByWeek, getSessions } from '@/lib/db';
import { normalizeCategories } from '@/lib/normalize-category';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateCurrentWeek } from '@/lib/weeks';

function todayDayOfWeekMon0(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export default async function TodayPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const week = await getOrCreateCurrentWeek(supabase, user.id);
  const categories = normalizeCategories(
    await getCategories(supabase, user.id, 'active')
  );

  const isPlanning = week.status === 'planning';
  const sessions = isPlanning ? [] : await getSessions(supabase, user.id, week.id);

  if (isPlanning && sessions.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-ld-orange/40 bg-ld-orange-dim">
          <Sparkles size={26} className="text-ld-orange" />
        </div>
        <div className="mb-2 text-[18px] font-extrabold text-ld-text">
          This week isn&apos;t planned yet
        </div>
        <p className="mb-6 max-w-xs text-[13px] leading-relaxed text-ld-text-sub">
          Plan your week to see today&apos;s sessions and nutrition targets.
        </p>
        <Link
          href="/ahead?plan=1"
          className="rounded-2xl bg-ld-orange px-6 py-3.5 text-[14px] font-extrabold text-white"
        >
          Plan this week →
        </Link>
      </div>
    );
  }

  const nutritionPlan = await getNutritionPlanByWeek(
    supabase,
    user.id,
    week.id
  );

  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const todayDayOfWeek = todayDayOfWeekMon0();

  return (
    <TodayView
      week={week}
      categories={categories}
      sessions={sessions}
      nutritionPlan={nutritionPlan}
      todayIso={todayIso}
      todayDayOfWeek={todayDayOfWeek}
    />
  );
}
