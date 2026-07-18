'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { NutritionCard } from '@/components/plan/nutrition-card';
import type { NutritionPlan, Session } from '@/types';

/** In-flight full generates keyed by weekId + fingerprint (Strict Mode safe). */
const generatePromises = new Map<string, Promise<NutritionPlan | null>>();

function sessionsFingerprint(sessions: Session[]): string {
  return sessions
    .map(
      (s) =>
        `${s.id}:${s.category_id}:${s.day_of_week}:${s.planned_duration_min ?? ''}`
    )
    .sort()
    .join('|');
}

async function fetchWeekSessions(
  weekId: string,
  categoryIds: string[]
): Promise<Session[]> {
  if (categoryIds.length === 0) return [];

  const batches = await Promise.all(
    categoryIds.map(async (categoryId) => {
      const res = await fetch(
        `/api/sessions?weekId=${encodeURIComponent(weekId)}&categoryId=${encodeURIComponent(categoryId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to load sessions');
      }
      return (data.sessions ?? []) as Session[];
    })
  );

  return batches.flat();
}

type NutritionStepProps = {
  weekId: string;
  categoryIds: string[];
  initialPlan?: NutritionPlan | null;
  initialFingerprint?: string | null;
  onContinue: () => void;
  onBack?: () => void;
  onPlanReady?: (plan: NutritionPlan, fingerprint: string) => void;
};

export function NutritionStep({
  weekId,
  categoryIds,
  initialPlan = null,
  initialFingerprint = null,
  onContinue,
  onBack,
  onPlanReady,
}: NutritionStepProps) {
  const [plan, setPlan] = useState<NutritionPlan | null>(initialPlan);
  const [loading, setLoading] = useState(!initialPlan);
  const [briefLoading, setBriefLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onPlanReadyRef = useRef(onPlanReady);
  onPlanReadyRef.current = onPlanReady;
  const fingerprintRef = useRef<string | null>(initialFingerprint);
  const categoryIdsKey = categoryIds.join(',');

  const reportPlan = useCallback(
    (next: NutritionPlan, fingerprint: string) => {
      fingerprintRef.current = fingerprint;
      setPlan(next);
      onPlanReadyRef.current?.(next, fingerprint);
    },
    []
  );

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
        let fingerprint = fingerprintRef.current;
        if (mode === 'full') {
          const sessions = await fetchWeekSessions(
            weekId,
            categoryIdsKey ? categoryIdsKey.split(',') : []
          );
          fingerprint = sessionsFingerprint(sessions);
        }

        const cacheKey =
          mode === 'full' && fingerprint
            ? `${weekId}:${fingerprint}`
            : null;

        if (cacheKey) {
          const existing = generatePromises.get(cacheKey);
          if (existing) {
            const shared = await existing;
            if (shared) {
              reportPlan(shared, fingerprint!);
            }
            return;
          }
        }

        const run = (async (): Promise<NutritionPlan | null> => {
          const res = await fetch('/api/nutrition/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekId, mode }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error ?? 'Failed to generate nutrition plan');
          }
          return data.nutritionPlan as NutritionPlan;
        })();

        if (cacheKey) {
          generatePromises.set(cacheKey, run);
        }

        try {
          const next = await run;
          if (!next) return;
          if (mode === 'full') {
            reportPlan(next, fingerprint ?? sessionsFingerprint([]));
          } else {
            setPlan(next);
            onPlanReadyRef.current?.(
              next,
              fingerprintRef.current ?? sessionsFingerprint([])
            );
          }
        } finally {
          if (cacheKey) {
            generatePromises.delete(cacheKey);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong. Please try again.'
        );
      } finally {
        setLoading(false);
        setBriefLoading(false);
        setRecalcLoading(false);
      }
    },
    [weekId, categoryIdsKey, plan, reportPlan]
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setError(null);
      try {
        const sessions = await fetchWeekSessions(
          weekId,
          categoryIdsKey ? categoryIdsKey.split(',') : []
        );
        if (cancelled) return;

        const fingerprint = sessionsFingerprint(sessions);

        if (
          initialPlan &&
          initialFingerprint &&
          fingerprint === initialFingerprint
        ) {
          fingerprintRef.current = fingerprint;
          setPlan(initialPlan);
          setLoading(false);
          return;
        }

        setLoading(true);
        const cacheKey = `${weekId}:${fingerprint}`;
        const existing = generatePromises.get(cacheKey);
        if (existing) {
          const shared = await existing;
          if (cancelled) return;
          if (shared) {
            reportPlan(shared, fingerprint);
          }
          setLoading(false);
          return;
        }

        const run = (async (): Promise<NutritionPlan | null> => {
          const res = await fetch('/api/nutrition/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weekId, mode: 'full' }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error ?? 'Failed to generate nutrition plan');
          }
          return data.nutritionPlan as NutritionPlan;
        })();

        generatePromises.set(cacheKey, run);
        try {
          const next = await run;
          if (cancelled) return;
          if (next) {
            reportPlan(next, fingerprint);
          }
        } finally {
          generatePromises.delete(cacheKey);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // Bootstrap when week or selected categories change; initial* used for hydrate check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId, categoryIdsKey]);

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

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded border border-gray-700 px-4 py-2.5 text-sm text-gray-300 hover:border-gray-500"
        >
          Back
        </button>
      )}
    </section>
  );
}
