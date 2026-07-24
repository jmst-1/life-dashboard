import { redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
import { WeightLogForm } from '@/components/settings/weight-log-form';
import { getWeightLogs } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function WeightSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const logs = await getWeightLogs(supabase, user.id);

  return (
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title="Weight Log" backHref="/settings" />
      <p className="text-[13px] text-ld-text-sub">
        Log weigh-ins. Your profile current weight updates automatically.
      </p>
      <div className="mt-6">
        <WeightLogForm logs={logs} />
      </div>
    </div>
  );
}
