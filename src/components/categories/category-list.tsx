'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';
import { formatTrackingType } from '@/lib/category-templates';
import { AddCategoryFlow } from './add-category-flow';
import { CategoryGlyph } from './category-glyph';

type CategoryListProps = {
  active: Category[];
  archived: Category[];
  allowCustomCategories: boolean;
};

export function CategoryList({
  active,
  archived,
  allowCustomCategories,
}: CategoryListProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive(id: string) {
    setError(null);
    setArchivingId(id);

    try {
      const res = await fetch(`/api/categories/${id}/archive`, {
        method: 'PATCH',
      });
      const data = await res.json();
      setArchivingId(null);

      if (!res.ok) {
        setError(data.error ?? 'Failed to archive category');
        return;
      }

      router.refresh();
    } catch {
      setArchivingId(null);
      setError('Failed to archive category');
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {active.length === 0 ? (
        <p className="rounded border border-gray-800 bg-gray-900/50 px-4 py-6 text-center text-sm text-gray-400">
          No categories yet — add your first one below.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-3 rounded border border-gray-700 bg-gray-900 px-4 py-3"
            >
              <CategoryGlyph
                icon={category.icon}
                color={category.color}
                size={22}
                aria-label={`${category.name} icon`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {category.name}
                </p>
                <span className="mt-0.5 inline-block rounded border border-gray-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                  {formatTrackingType(category.tracking_type)}
                </span>
              </div>
              <Link
                href={`/settings/categories/${category.id}`}
                className="rounded border border-gray-700 px-2.5 py-1.5 text-xs text-gray-300 hover:border-gray-500 hover:text-white"
              >
                Edit
              </Link>
              <button
                type="button"
                disabled={archivingId === category.id}
                onClick={() => handleArchive(category.id)}
                className="rounded border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 hover:border-red-800 hover:text-red-400 disabled:opacity-50"
              >
                {archivingId === category.id ? '…' : 'Archive'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="mt-6 w-full rounded bg-white px-3 py-2 text-sm font-medium text-gray-950 hover:bg-gray-200"
      >
        Add category
      </button>

      {archived.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-gray-400">Archived</h2>
          <ul className="mt-3 space-y-2">
            {archived.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded border border-gray-800 bg-gray-900/40 px-4 py-3 opacity-60"
              >
                <CategoryGlyph
                  icon={category.icon}
                  color={category.color}
                  size={22}
                  aria-label={`${category.name} icon`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-400">
                    {category.name}
                  </p>
                  <span className="mt-0.5 inline-block rounded border border-gray-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                    {formatTrackingType(category.tracking_type)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddCategoryFlow
        allowCustomCategories={allowCustomCategories}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
}
