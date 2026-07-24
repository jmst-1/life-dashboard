import { redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
import { GoalEventsManager } from '@/components/settings/goal-events-manager';
import { getGoalEvents } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function GoalEventsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const events = await getGoalEvents(supabase, user.id);

  return (
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title="Goal Events" backHref="/settings" />
      <p className="text-[13px] text-ld-text-sub">
        Races and targets shown on Ahead. Coach plan generation still uses the
        goal fields on each category&apos;s coach settings.
      </p>

      <GoalEventsManager initialEvents={events} />
    </div>
  );
}
