import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CyclingCoachForm } from '@/components/settings/cycling-coach-form';
import { getCategories } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function CyclingCoachPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const categories = await getCategories(supabase, user.id, 'active');
  const cycling = categories.find((c) => c.name === 'Cycling');

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href="/settings"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Settings
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Cycling Coach</h1>
        <p className="mt-1 text-sm text-gray-400">
          Context used when generating your weekly bike plan.
        </p>

        <div className="mt-8">
          {cycling ? (
            <CyclingCoachForm category={cycling} />
          ) : (
            <p className="text-sm text-gray-400">
              No Cycling category found — add one in{' '}
              <Link
                href="/settings/categories"
                className="text-white underline hover:text-gray-200"
              >
                Settings → Categories
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
