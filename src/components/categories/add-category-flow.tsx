'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';
import {
  getSelectableTemplates,
  type CategoryTemplateId,
} from '@/lib/category-templates';
import {
  CategoryCreateSheet,
  type CategoryCreatePayload,
} from './category-create-sheet';
import { CategoryGlyph } from './category-glyph';
import { Pill } from '@/components/ui/pill';
import { modeLabel, effortLabel } from '@/lib/category-mode';

type AddCategoryFlowProps = {
  allowCustomCategories: boolean;
  open: boolean;
  onClose: () => void;
  onCategoryAdded?: (category: Category) => void;
  activeCount?: number;
};

type FlowStep = 'pick' | 'create';

export function AddCategoryFlow({
  allowCustomCategories,
  open,
  onClose,
  onCategoryAdded,
  activeCount = 0,
}: AddCategoryFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('pick');
  const [seed, setSeed] = useState<Partial<CategoryCreatePayload> | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  function handleClose() {
    setStep('pick');
    setSeed(null);
    onClose();
  }

  function selectTemplate(id: CategoryTemplateId) {
    const template = getSelectableTemplates().find((t) => t.id === id);
    if (!template) return;
    const d = template.defaults;
    setSeed({
      name: d.name,
      icon: d.icon,
      color: d.color,
      color_dim: d.color_dim ?? `${d.color}18`,
      mode: d.mode,
      tracking_type: d.tracking_type,
      effort_type: d.effort_type,
      sessions_per_week: d.sessions_per_week,
      timed_session: d.timed_session,
      task_template: d.task_template,
      ai_enabled: d.ai_enabled,
      affects_nutrition: d.affects_nutrition,
      nutrition_met: d.nutrition_met,
      nutrition_hard_threshold_min: d.nutrition_hard_threshold_min,
    });
    setStep('create');
  }

  function selectCustom() {
    setSeed(null);
    setStep('create');
  }

  async function handleSave(payload: CategoryCreatePayload) {
    setSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to create category');
      }
      handleClose();
      if (onCategoryAdded) {
        onCategoryAdded(data.category as Category);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  if (step === 'create') {
    const editingSeed = seed
      ? ({
          id: '',
          user_id: '',
          name: seed.name ?? '',
          icon: seed.icon ?? 'clipboard-list',
          color: seed.color ?? '#94a3b8',
          color_dim: seed.color_dim ?? null,
          tracking_type: seed.tracking_type ?? 'tracked',
          mode: seed.mode ?? 'tracked',
          effort_type: seed.effort_type ?? 'duration',
          sessions_per_week: seed.sessions_per_week ?? 3,
          timed_session: seed.timed_session ?? false,
          task_template: seed.task_template ?? [],
          ai_enabled: seed.ai_enabled ?? false,
          status: 'active' as const,
          coach_context: {},
          affects_nutrition: seed.affects_nutrition ?? false,
          nutrition_met: seed.nutrition_met ?? 6,
          nutrition_hard_threshold_min:
            seed.nutrition_hard_threshold_min ?? 60,
          goal_event_name: null,
          goal_event_date: null,
          goal_event_notes: null,
          created_at: '',
          updated_at: '',
        } satisfies Category)
      : null;

    return (
      <CategoryCreateSheet
        editing={editingSeed}
        saving={saving}
        onClose={handleClose}
        onSave={handleSave}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex h-full w-full max-w-phone flex-col justify-end">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/80 backdrop-blur-[6px]"
          onClick={handleClose}
        />
        <div className="relative z-[1] max-h-[66.666vh] w-full overflow-y-auto rounded-t-[22px] border border-b-0 border-ld-border bg-ld-surface px-5 pb-12 pt-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-ld-text">
            Add category
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-ld-text-sub"
          >
            Close
          </button>
        </div>

        {activeCount >= 6 && (
          <div className="mb-4 rounded-xl border border-ld-amber/30 bg-ld-amber-dim px-3.5 py-2.5 text-xs text-ld-amber">
            You have {activeCount} active categories. More is fine — just
            expect a denser week.
          </div>
        )}

        <p className="mb-4 text-sm text-ld-text-sub">
          Start from a preset
          {allowCustomCategories ? ', or build your own.' : '.'}
        </p>

        <div className="flex flex-col gap-2.5">
          {getSelectableTemplates().map((template) => {
            const d = template.defaults;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template.id)}
                className="flex w-full items-center gap-3 rounded-[14px] border border-ld-border bg-ld-surface-high p-3.5 text-left"
              >
                <div
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border"
                  style={{
                    background: d.color_dim ?? `${d.color}18`,
                    borderColor: `${d.color}44`,
                  }}
                >
                  <CategoryGlyph icon={d.icon} color={d.color} size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-ld-text">
                    {template.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Pill label={modeLabel(d.mode)} color={d.color} />
                    <Pill
                      label={effortLabel(d.effort_type)}
                      color="var(--ld-text-sub)"
                    />
                    {d.timed_session && (
                      <Pill label="Timed" color="var(--ld-teal)" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {allowCustomCategories && (
            <button
              type="button"
              onClick={selectCustom}
              className="w-full rounded-[14px] border border-ld-border bg-ld-surface-high px-4 py-3 text-sm font-bold text-ld-text"
            >
              Build your own
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
