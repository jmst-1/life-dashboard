import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SetHeader } from '@/components/layout/header-context';
import { TriathlonCoachForm } from '@/components/settings/triathlon-coach-form';
import { getCategories } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

export default async function TriathlonCoachPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const categories = await getCategories(supabase, user.id, 'active');
  const triathlon = categories.find((c) => c.name === 'Triathlon');

  return (
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title="Triathlon Coach" backHref="/settings" />
      <p className="text-[13px] text-ld-text-sub">
        Context used when generating your weekly triathlon plan.
      </p>

      <div className="mt-6">
        {triathlon ? (
          <TriathlonCoachForm category={triathlon} />
        ) : (
          <p className="text-sm text-ld-text-sub">
            No Triathlon category found — add one in{' '}
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
