import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { redirect } from 'next/navigation';
import { CurrentWeekView } from '@/components/week/current-week-view';
import {
  getCategories,
  getNutritionPlanByWeek,
  getSessions,
} from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateCurrentWeek } from '@/lib/weeks';

type CurrentWeekPageProps = {
  searchParams: { locked?: string };
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'border-emerald-700 text-emerald-300';
    case 'complete':
      return 'border-gray-600 text-gray-300';
    default:
      return 'border-amber-700 text-amber-300';
  }
}

export default async function CurrentWeekPage({
  searchParams,
}: CurrentWeekPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const week = await getOrCreateCurrentWeek(supabase, user.id);
  const categories = await getCategories(
    supabase,
    user.id,
    'active',
    'created_at'
  );

  const rangeLabel = `${format(parseISO(week.week_start), 'EEE d MMM')} – ${format(
    parseISO(week.week_end),
    'EEE d MMM'
  )}`;

  if (week.status === 'planning') {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">This week</h1>
              <p className="mt-1 text-sm text-gray-400">{rangeLabel}</p>
            </div>
            <span
              className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusBadgeClass(
                week.status
              )}`}
            >
              {week.status}
            </span>
          </div>

          <Link
            href="/plan"
            className="flex w-full items-center justify-center rounded border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-sm font-medium text-amber-100 hover:bg-amber-950/60"
          >
            Plan this week →
          </Link>
        </div>
      </div>
    );
  }

  const [sessions, nutritionPlan] = await Promise.all([
    getSessions(supabase, week.id),
    getNutritionPlanByWeek(supabase, user.id, week.id),
  ]);

  const entryIds = Array.from(
    new Set(
      sessions
        .map((s) => s.library_entry_id)
        .filter((id): id is string => !!id)
    )
  );

  const targetAreaByEntryId: Record<string, string> = {};
  if (entryIds.length > 0) {
    const { data } = await supabase
      .from('movement_library')
      .select('id, target_area')
      .in('id', entryIds);
    for (const row of data ?? []) {
      targetAreaByEntryId[row.id as string] = row.target_area as string;
    }
  }

  const cycling = categories.find((c) => c.name === 'Cycling');
  const ftp =
    typeof cycling?.coach_context?.ftp === 'number'
      ? cycling.coach_context.ftp
      : 200;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
      <div className="mx-auto max-w-md">
        <CurrentWeekView
          week={week}
          categories={categories}
          initialSessions={sessions}
          nutritionPlan={nutritionPlan}
          ftp={ftp}
          targetAreaByEntryId={targetAreaByEntryId}
          lockedBanner={
            searchParams.locked === '1' && week.status === 'complete'
          }
          rangeLabel={rangeLabel}
        />
      </div>
    </div>
  );
}
