import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
import { SwimmingCoachForm } from '@/components/settings/swimming-coach-form';
import { getCategories } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function SwimmingCoachPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const categories = await getCategories(supabase, user.id, 'active');
  const swimming = categories.find((c) => c.name === 'Swimming');

  return (
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title="Swimming Coach" backHref="/settings" />
      <p className="text-[13px] text-ld-text-sub">
        Context used when generating your weekly swim plan.
      </p>

      <div className="mt-6">
        {swimming ? (
          <SwimmingCoachForm category={swimming} />
        ) : (
          <p className="text-sm text-ld-text-sub">
            No Swimming category found — add one in{' '}
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
