import { redirect } from 'next/navigation';
import { CategoryList } from '@/components/categories/category-list';
import { SetHeader } from '@/components/layout/header-context';
import { getCategories } from '@/lib/db';
import { PRODUCT_CONFIG, PRODUCT_MODE } from '@/lib/product-config';
import { createClient } from '@/lib/supabase/server';

export default async function CategoriesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [active, archived] = await Promise.all([
    getCategories(supabase, user.id, 'active', 'created_at'),
    getCategories(supabase, user.id, 'archived', 'created_at'),
  ]);

  const allowCustomCategories =
    PRODUCT_CONFIG[PRODUCT_MODE].allowCustomCategories;

  return (
    <div className="px-5 pb-8 pt-4 text-ld-text">
      <SetHeader title="Categories" backHref="/settings" />
      <p className="text-[13px] text-ld-text-sub">
        Manage the activities you track each week.
      </p>

      <div className="mt-6">
        <CategoryList
          active={active}
          archived={archived}
          allowCustomCategories={allowCustomCategories}
        />
      </div>
    </div>
  );
}
