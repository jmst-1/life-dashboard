import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 text-white">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold">
          Onboarding coming in Session 5
        </h1>
        {user?.email && (
          <p className="mt-3 text-sm text-gray-400">
            Signed in as <span className="text-white">{user.email}</span>
          </p>
        )}
      </div>
    </div>
  );
}
