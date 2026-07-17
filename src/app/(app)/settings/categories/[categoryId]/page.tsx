import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CategoryForm } from '@/components/categories/category-form';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { categoryFormValuesFromCategory } from '@/lib/category-form-values';
import { getCategoryById } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
  params: { categoryId: string };
};

export default async function EditCategoryPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const category = await getCategoryById(
    supabase,
    user.id,
    params.categoryId
  );

  if (!category) {
    notFound();
  }

  const isCustom =
    category.tracking_type === 'ai_plan' &&
    category.name !== 'Cycling' &&
    category.name !== 'Strength';

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/settings/categories"
          className="text-sm text-gray-400 underline hover:text-white"
        >
          Back to categories
        </Link>

        <h1 className="mt-4 flex items-center gap-2 text-xl font-semibold">
          <CategoryGlyph
            icon={category.icon}
            color={category.color}
            size={24}
          />
          <span>Edit {category.name}</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Tracking type can&apos;t be changed after creation.
        </p>

        <div className="mt-8 rounded border border-gray-700 bg-gray-900 p-6">
          <CategoryForm
            mode="edit"
            categoryId={category.id}
            initialValues={categoryFormValuesFromCategory(category)}
            isCustom={isCustom}
          />
        </div>
      </div>
    </div>
  );
}
