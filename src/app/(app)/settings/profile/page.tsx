import { redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
import { ProfileForm } from '@/components/settings/profile-form';
import { getProfile } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function ProfileSettingsPage() {
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
      <SetHeader title="Profile" backHref="/settings" />
      <p className="text-[13px] text-ld-text-sub">
        Body metrics and deficit preferences.
      </p>
      <div className="mt-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
