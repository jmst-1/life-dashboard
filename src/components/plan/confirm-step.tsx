'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { NutritionCard } from '@/components/plan/nutrition-card';
import { dayLabel } from '@/lib/plan-context';
import type { Category, NutritionPlan, Session } from '@/types';

type ConfirmStepProps = {
  weekId: string;
  categories: Category[];
  selectedCategoryIds: Record<string, boolean>;
  nutritionPlan: NutritionPlan | null;
  weightKgSnapshot: number | null;
};

export function ConfirmStep({
  weekId,
  categories,
  selectedCategoryIds,
  nutritionPlan,
  weightKgSnapshot,
}: ConfirmStepProps) {
  const router = useRouter();
  const selected = categories.filter(
    (c) => selectedCategoryIds[c.id] !== false
  );

  const [sessionsByCategory, setSessionsByCategory] = useState<
    Record<string, Session[]>
  >({});
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingSessions(true);
      setError(null);
      try {
        const entries = await Promise.all(
          selected.map(async (category) => {
            const res = await fetch(
              `/api/sessions?weekId=${encodeURIComponent(weekId)}&categoryId=${encodeURIComponent(category.id)}`
            );
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error ?? 'Failed to load sessions');
            }
            return [category.id, data.sessions as Session[]] as const;
          })
        );
        if (!cancelled) {
          setSessionsByCategory(Object.fromEntries(entries));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load summary'
          );
        }
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // selected is derived from categories + ids; stringify ids for stable dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId, categories, selectedCategoryIds]);

  async function handleStartWeek() {
    setError(null);
    setActivating(true);
    try {
      const res = await fetch(`/api/weeks/${weekId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          weight_kg_snapshot: weightKgSnapshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to activate week');
        return;
      }
      router.push('/week/current');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setActivating(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Step 5 — Confirm
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Ready to start your week?
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Review your plans, then activate. You can still log and adjust during
          the week.
        </p>
      </div>

      {loadingSessions ? (
        <div className="flex items-center gap-3 rounded border border-gray-700 bg-gray-900 px-4 py-6 text-sm text-gray-400">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-white"
            aria-hidden
          />
          Loading summary…
        </div>
      ) : (
        <ul className="space-y-3">
          {selected.map((category) => {
            const sessions = sessionsByCategory[category.id] ?? [];
            return (
              <li
                key={category.id}
                className="rounded border border-gray-700 bg-gray-900 p-4"
              >
                <div className="flex items-start gap-3">
                  <CategoryGlyph
                    icon={category.icon}
                    color={category.color}
                    size={22}
                    aria-label={`${category.name} icon`}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white">
                      {category.name}
                    </h3>
                    {sessions.length === 0 ? (
                      <p className="mt-1 text-sm text-gray-500">
                        {category.tracking_type === 'random_pick'
                          ? 'Will be generated after you confirm'
                          : 'No sessions planned'}
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {sessions.map((session) => (
                          <li
                            key={session.id}
                            className="flex justify-between gap-2 text-sm text-gray-300"
                          >
                            <span className="truncate">
                              <span className="text-gray-500">
                                {dayLabel(session.day_of_week)}
                              </span>{' '}
                              {session.title}
                            </span>
                            <span className="shrink-0 tabular-nums text-gray-500">
                              {session.planned_duration_min != null
                                ? `${session.planned_duration_min} min`
                                : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {nutritionPlan && <NutritionCard plan={nutritionPlan} />}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={activating || loadingSessions}
        onClick={() => void handleStartWeek()}
        className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {activating ? 'Starting…' : 'Start my week'}
      </button>
    </section>
  );
}
