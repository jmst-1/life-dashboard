import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StrengthCoachForm } from '@/components/settings/strength-coach-form';
import { getCategories } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function StrengthCoachPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const categories = await getCategories(supabase, user.id, 'active');
  const strength = categories.find((c) => c.name === 'Strength');

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 pb-24 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href="/settings"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Settings
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Strength Coach</h1>
        <p className="mt-1 text-sm text-gray-400">
          Context used when generating your weekly strength plan.
        </p>

        <div className="mt-8">
          {strength ? (
            <StrengthCoachForm category={strength} />
          ) : (
            <p className="text-sm text-gray-400">
              No Strength category found — add one in{' '}
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
