import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
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
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title="Cycling Coach" backHref="/settings" />
      <p className="text-[13px] text-ld-text-sub">
        Context used when generating your weekly bike plan.
      </p>

      <div className="mt-6">
        {cycling ? (
          <CyclingCoachForm category={cycling} />
        ) : (
          <p className="text-sm text-ld-text-sub">
            No Cycling category found — add one in{' '}
            <Link
              href="/settings/categories"
              className="font-semibold text-ld-orange hover:underline"
            >
              Settings → Categories
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
