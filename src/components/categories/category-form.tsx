'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category } from '@/types';
import {
  CATEGORY_COLOR_PRESETS,
  CATEGORY_ICON_PRESETS,
  type CategoryTemplateId,
  formatTrackingType,
  lockNutritionToggle,
  normalizeCategoryIcon,
} from '@/lib/category-templates';
import type { CategoryFormValues } from '@/lib/category-form-values';
import { CategoryGlyph } from './category-glyph';

type CategoryFormProps = {
  mode: 'create' | 'edit';
  categoryId?: string;
  initialValues: CategoryFormValues;
  templateId?: CategoryTemplateId | null;
  isCustom?: boolean;
  onCancel?: () => void;
  onSuccess?: (category: Category) => void;
};

const inputClassName =
  'mt-1 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-gray-500';

export function CategoryForm({
  mode,
  categoryId,
  initialValues,
  templateId = null,
  isCustom = false,
  onCancel,
  onSuccess,
}: CategoryFormProps) {
  const router = useRouter();
  const nutritionLocked =
    lockNutritionToggle(templateId) ||
    initialValues.tracking_type === 'random_pick';

  const [values, setValues] = useState<CategoryFormValues>(() => ({
    ...initialValues,
    affects_nutrition: nutritionLocked
      ? false
      : initialValues.affects_nutrition,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const showCoachingBrief =
    isCustom && values.tracking_type === 'ai_plan';
  const showMetFields =
    values.tracking_type === 'ai_plan' && values.affects_nutrition;

  function updateField<K extends keyof CategoryFormValues>(
    key: K,
    value: CategoryFormValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      icon: normalizeCategoryIcon(values.icon),
      color: values.color,
      ai_enabled: values.ai_enabled,
      affects_nutrition: nutritionLocked ? false : values.affects_nutrition,
      nutrition_met: values.nutrition_met,
      nutrition_hard_threshold_min: values.nutrition_hard_threshold_min,
    };

    if (mode === 'create') {
      payload.tracking_type = values.tracking_type;
      const coach_context: Record<string, unknown> = {};
      if (showCoachingBrief && values.coaching_brief.trim()) {
        coach_context.coaching_brief = values.coaching_brief.trim();
      }
      payload.coach_context = coach_context;
    } else if (showCoachingBrief) {
      payload.coach_context = {
        coaching_brief: values.coaching_brief.trim() || undefined,
      };
    }

    try {
      const url =
        mode === 'create'
          ? '/api/categories'
          : `/api/categories/${categoryId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }

      if (onSuccess) {
        onSuccess(data.category as Category);
      } else if (mode === 'create') {
        router.push('/settings/categories');
        router.refresh();
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setLoading(false);
      setError('Something went wrong');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'edit' && (
        <div>
          <span className="block text-sm text-gray-300">Tracking type</span>
          <span className="mt-1 inline-block rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300">
            {formatTrackingType(values.tracking_type)}
          </span>
        </div>
      )}

      <div>
        <label htmlFor="category-name" className="block text-sm text-gray-300">
          Name
        </label>
        <input
          id="category-name"
          type="text"
          required
          value={values.name}
          onChange={(e) => updateField('name', e.target.value)}
          disabled={loading}
          className={inputClassName}
        />
      </div>

      <div>
        <span className="block text-sm text-gray-300">Icon</span>
        <div className="mt-2 grid grid-cols-7 gap-1.5 sm:grid-cols-8">
          {CATEGORY_ICON_PRESETS.map((iconKey) => (
            <button
              key={iconKey}
              type="button"
              disabled={loading}
              onClick={() => updateField('icon', iconKey)}
              className={`flex items-center justify-center rounded border p-2 transition-colors ${
                values.icon === iconKey
                  ? 'border-white bg-gray-800'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500'
              }`}
              aria-label={`Select icon ${iconKey}`}
            >
              <CategoryGlyph icon={iconKey} color={values.color} size={18} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm text-gray-300">Color</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORY_COLOR_PRESETS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              disabled={loading}
              onClick={() => updateField('color', swatch)}
              className={`h-8 w-8 rounded-full border-2 ${
                values.color === swatch
                  ? 'border-white'
                  : 'border-transparent hover:border-gray-500'
              }`}
              style={{ backgroundColor: swatch }}
              aria-label={`Select color ${swatch}`}
            />
          ))}
        </div>
      </div>

      {showCoachingBrief && (
        <div>
          <label
            htmlFor="coaching-brief"
            className="block text-sm text-gray-300"
          >
            Tell the coach what this category is about
          </label>
          <textarea
            id="coaching-brief"
            rows={3}
            value={values.coaching_brief}
            onChange={(e) => updateField('coaching_brief', e.target.value)}
            disabled={loading}
            className={inputClassName}
            placeholder="e.g. Trail running focused on endurance and hills"
          />
        </div>
      )}

      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={values.affects_nutrition}
            disabled={loading || nutritionLocked}
            onChange={(e) =>
              updateField('affects_nutrition', e.target.checked)
            }
            className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900"
          />
          <span>
            <span className="block text-sm text-gray-300">
              Include in weekly nutrition targets?
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Sessions in this category will count toward your daily calorie and
              training load calculations.
            </span>
          </span>
        </label>
        {nutritionLocked && (
          <p className="mt-2 text-xs text-gray-500">
            Mobility and stretch sessions are planned based on your training
            load, so they can&apos;t also feed into it.
          </p>
        )}
      </div>

      {showMetFields && (
        <>
          <div>
            <label htmlFor="nutrition-met" className="block text-sm text-gray-300">
              MET value
            </label>
            <input
              id="nutrition-met"
              type="number"
              min={1}
              step={0.5}
              required
              value={values.nutrition_met}
              onChange={(e) =>
                updateField('nutrition_met', Number(e.target.value))
              }
              disabled={loading}
              className={inputClassName}
            />
            <p className="mt-1 text-xs text-gray-500">
              Metabolic equivalent used to estimate calories burned per session.
            </p>
          </div>

          <div>
            <label
              htmlFor="hard-threshold"
              className="block text-sm text-gray-300"
            >
              Hard session threshold (minutes)
            </label>
            <input
              id="hard-threshold"
              type="number"
              min={1}
              step={1}
              required
              value={values.nutrition_hard_threshold_min}
              onChange={(e) =>
                updateField(
                  'nutrition_hard_threshold_min',
                  Number(e.target.value)
                )
              }
              disabled={loading}
              className={inputClassName}
            />
            <p className="mt-1 text-xs text-gray-500">
              Sessions at or above this duration count as hard training days for
              nutrition cycling.
            </p>
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-400" role="status">
          Saved
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-white px-3 py-2 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? 'Saving…' : mode === 'create' ? 'Add category' : 'Save'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-gray-500 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
