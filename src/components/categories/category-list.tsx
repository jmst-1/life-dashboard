'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';
import {
  effortLabel,
  getCategoryMode,
  getEffortType,
  modeLabel,
} from '@/lib/category-mode';
import { AddCategoryFlow } from './add-category-flow';
import {
  CategoryCreateSheet,
  type CategoryCreatePayload,
} from './category-create-sheet';
import { CategoryGlyph } from './category-glyph';
import { Pill } from '@/components/ui/pill';

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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
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

  async function handleEditSave(payload: CategoryCreatePayload) {
    if (!editingCategory) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to update category');
      }
      setEditingCategory(null);
      router.refresh();
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ld-text">Active</h2>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-xl bg-ld-orange px-3 py-1.5 text-xs font-bold text-white"
        >
          Add category
        </button>
      </div>

      {error && <p className="text-sm text-ld-red">{error}</p>}

      <ul className="space-y-2">
        {active.map((category) => {
          const mode = getCategoryMode(category);
          const effort = getEffortType(category);
          return (
            <li
              key={category.id}
              className="flex items-center gap-3 rounded-[14px] border border-ld-border bg-ld-surface px-4 py-3"
            >
              <CategoryGlyph
                icon={category.icon}
                color={category.color}
                size={18}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-ld-text">
                  {category.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Pill label={modeLabel(mode)} color={category.color} />
                  <Pill label={effortLabel(effort)} color="var(--ld-text-sub)" />
                  {category.affects_nutrition && (
                    <Pill label="Nutrition" color="var(--ld-orange)" />
                  )}
                  {category.timed_session && (
                    <Pill label="Timed" color="var(--ld-teal)" />
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingCategory(category)}
                  className="rounded-lg border border-ld-border bg-ld-surface px-3 py-1.5 text-[11px] font-bold text-ld-text"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={archivingId === category.id}
                  onClick={() => handleArchive(category.id)}
                  className="rounded-lg border border-ld-border bg-ld-surface px-3 py-1.5 text-[11px] font-bold text-ld-red disabled:opacity-50"
                >
                  Archive
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {archived.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ld-text-muted">
            Archived
          </h2>
          <ul className="space-y-2 opacity-60">
            {archived.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-[14px] border border-ld-border px-4 py-3"
              >
                <CategoryGlyph
                  icon={category.icon}
                  color={category.color}
                  size={18}
                />
                <span className="text-sm text-ld-text-sub">{category.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddCategoryFlow
        allowCustomCategories={allowCustomCategories}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        activeCount={active.length}
      />

      {editingCategory && (
        <CategoryCreateSheet
          editing={editingCategory}
          saving={savingEdit}
          onClose={() => setEditingCategory(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
