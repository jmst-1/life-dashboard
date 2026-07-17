import Link from 'next/link';
import { redirect } from 'next/navigation';
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
    <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href="/settings"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Settings
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-gray-400">
          Body metrics, deficit preferences, and dietary notes.
        </p>
        <div className="mt-8">
          <ProfileForm profile={profile} />
        </div>
      </div>
    </div>
  );
}
