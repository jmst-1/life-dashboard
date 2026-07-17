import { redirect } from 'next/navigation';
import { CategoryList } from '@/components/categories/category-list';
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
    <div className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold">Categories</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage the activities you track each week.
        </p>

        <div className="mt-8">
          <CategoryList
            active={active}
            archived={archived}
            allowCustomCategories={allowCustomCategories}
          />
        </div>
      </div>
    </div>
  );
}
