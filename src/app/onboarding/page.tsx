import { redirect } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { getProfile } from '@/lib/db';
import { PRODUCT_CONFIG, PRODUCT_MODE } from '@/lib/product-config';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile(supabase, user.id);
  const allowCustomCategories =
    PRODUCT_CONFIG[PRODUCT_MODE].allowCustomCategories;

  return (
    <OnboardingFlow
      displayName={profile?.display_name ?? null}
      allowCustomCategories={allowCustomCategories}
      initialProfile={profile}
    />
  );
}
