'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NutritionCard } from '@/components/plan/nutrition-card';
import type { NutritionPlan } from '@/types';

/** Survives Strict Mode remounts so auto-generate only fires once per week. */
const autoStartedWeeks = new Set<string>();

type NutritionStepProps = {
  weekId: string;
  onContinue: () => void;
  onPlanReady?: (plan: NutritionPlan) => void;
};

export function NutritionStep({
  weekId,
  onContinue,
  onPlanReady,
}: NutritionStepProps) {
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [briefLoading, setBriefLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onPlanReadyRef = useRef(onPlanReady);
  onPlanReadyRef.current = onPlanReady;

  const generate = useCallback(
    async (mode: 'full' | 'brief_only') => {
      setError(null);
      if (mode === 'brief_only') {
        setBriefLoading(true);
      } else if (plan) {
        setRecalcLoading(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetch('/api/nutrition/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekId, mode }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Failed to generate nutrition plan');
          return;
        }
        const next = data.nutritionPlan as NutritionPlan;
        setPlan(next);
        onPlanReadyRef.current?.(next);
      } catch {
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
        setBriefLoading(false);
        setRecalcLoading(false);
      }
    },
    [weekId, plan]
  );

  useEffect(() => {
    if (autoStartedWeeks.has(weekId)) return;
    autoStartedWeeks.add(weekId);
    void generate('full');
    // Intentionally run once per weekId on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId]);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Step 4 — Nutrition
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Calorie and macro targets
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Computed from your training plan. Claude only writes the meal-prep
          brief.
        </p>
      </div>

      {loading && !plan && (
        <div className="flex items-center gap-3 rounded border border-gray-700 bg-gray-900 px-4 py-6 text-sm text-gray-400">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-white"
            aria-hidden
          />
          Calculating nutrition targets…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {plan && (
        <NutritionCard
          plan={plan}
          showActions
          briefLoading={briefLoading}
          recalcLoading={recalcLoading}
          onRegenerateBrief={() => void generate('brief_only')}
          onRecalculate={() => void generate('full')}
        />
      )}

      {!loading && !plan && error && (
        <button
          type="button"
          onClick={() => void generate('full')}
          className="text-xs text-white underline underline-offset-2"
        >
          Retry
        </button>
      )}

      <button
        type="button"
        disabled={!plan || loading || briefLoading || recalcLoading}
        onClick={onContinue}
        className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next: Confirm
      </button>
    </section>
  );
}
