import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { redirect } from 'next/navigation';
import { getCategories } from '@/lib/db';
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
  const categories = await getCategories(supabase, user.id, 'active');

  const rangeLabel = `${format(parseISO(week.week_start), 'EEE d MMM')} – ${format(
    parseISO(week.week_end),
    'EEE d MMM'
  )}`;

  const categoryNames =
    categories.length > 0
      ? categories.map((c) => c.name).join(', ')
      : 'None';

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
      <div className="mx-auto max-w-md space-y-6">
        {searchParams.locked === '1' && week.status === 'complete' && (
          <p
            className="rounded border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
            role="status"
          >
            This week&apos;s plan is locked. You can review it here.
          </p>
        )}

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

        {week.status === 'planning' && (
          <Link
            href="/plan"
            className="inline-flex text-sm font-medium text-white underline underline-offset-2 hover:text-gray-200"
          >
            Plan this week →
          </Link>
        )}

        {week.status === 'active' && (
          <Link
            href="/plan"
            className="inline-flex text-sm font-medium text-white underline underline-offset-2 hover:text-gray-200"
          >
            Edit plan →
          </Link>
        )}

        <p className="text-sm text-gray-400">
          Categories:{' '}
          <span className="text-gray-300">{categoryNames}</span>
        </p>

        <div>
          <h2 className="text-sm font-medium text-gray-300">Sessions</h2>
          <p className="mt-2 text-sm text-gray-500">No sessions yet.</p>
        </div>
      </div>
    </div>
  );
}
