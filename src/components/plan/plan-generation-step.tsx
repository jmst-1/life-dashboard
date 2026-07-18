'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { dayLabel } from '@/lib/plan-context';
import type { Category, Session } from '@/types';

/** Survives React Strict Mode remounts so auto-gen only fires once per week. */
const autoStartedWeeks = new Set<string>();
/** Prevents duplicate in-flight generate calls for the same category. */
const inFlightCategoryIds = new Set<string>();
/** In-flight hydrate promises so concurrent callers share one fetch. */
const hydratePromises = new Map<string, Promise<'done' | 'idle'>>();

type CategoryGenStatus =
  | 'idle'
  | 'loading'
  | 'generating'
  | 'done'
  | 'error';

type CategoryGenState = {
  status: CategoryGenStatus;
  weekTheme: string | null;
  weekNote: string | null;
  sessions: Session[];
  error: string | null;
};

type PlanGenerationStepProps = {
  weekId: string;
  planningNotes: string;
  categories: Category[];
  selectedCategoryIds: Record<string, boolean>;
  onContinue: () => void;
  continueLabel?: string;
};

function emptyState(): CategoryGenState {
  return {
    status: 'idle',
    weekTheme: null,
    weekNote: null,
    sessions: [],
    error: null,
  };
}

export function PlanGenerationStep({
  weekId,
  planningNotes,
  categories,
  selectedCategoryIds,
  onContinue,
  continueLabel = 'Next: Nutrition',
}: PlanGenerationStepProps) {
  const selected = categories.filter(
    (c) => selectedCategoryIds[c.id] !== false
  );
  const aiPlanCategories = selected.filter((c) => c.tracking_type === 'ai_plan');
  const randomPickCategories = selected.filter(
    (c) => c.tracking_type === 'random_pick'
  );

  const cycling = aiPlanCategories.find((c) => c.name === 'Cycling');
  const strength = aiPlanCategories.find((c) => c.name === 'Strength');
  const generics = aiPlanCategories.filter(
    (c) => c.name !== 'Cycling' && c.name !== 'Strength'
  );

  const orderedAiPlan = [
    ...(cycling ? [cycling] : []),
    ...(strength ? [strength] : []),
    ...generics,
  ];

  const [genState, setGenState] = useState<Record<string, CategoryGenState>>(
    () =>
      Object.fromEntries(aiPlanCategories.map((c) => [c.id, emptyState()]))
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const genStateRef = useRef(genState);
  genStateRef.current = genState;

  const activeCategoryIds = selected.map((c) => c.id);
  const activeCategoryIdsKey = activeCategoryIds.join(',');
  const aiPlanCategoryIdsKey = aiPlanCategories.map((c) => c.id).join(',');

  const generateCategory = useCallback(
    async (category: Category) => {
      if (inFlightCategoryIds.has(category.id)) {
        return false;
      }
      inFlightCategoryIds.add(category.id);

      setGenState((prev) => ({
        ...prev,
        [category.id]: {
          ...(prev[category.id] ?? emptyState()),
          status: 'generating',
          error: null,
        },
      }));

      try {
        const res = await fetch('/api/plan/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekId,
            categoryId: category.id,
            planningNotes: planningNotes.trim() || null,
            activeCategoryIds: activeCategoryIdsKey
              ? activeCategoryIdsKey.split(',')
              : [],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setGenState((prev) => ({
            ...prev,
            [category.id]: {
              ...(prev[category.id] ?? emptyState()),
              status: 'error',
              error: data.error ?? 'Failed to generate plan',
            },
          }));
          return false;
        }

        setGenState((prev) => ({
          ...prev,
          [category.id]: {
            status: 'done',
            weekTheme: data.week_theme ?? null,
            weekNote: data.week_note ?? null,
            sessions: (data.sessions ?? []) as Session[],
            error: null,
          },
        }));
        return true;
      } catch {
        setGenState((prev) => ({
          ...prev,
          [category.id]: {
            ...(prev[category.id] ?? emptyState()),
            status: 'error',
            error: 'Something went wrong. Please try again.',
          },
        }));
        return false;
      } finally {
        inFlightCategoryIds.delete(category.id);
      }
    },
    [weekId, planningNotes, activeCategoryIdsKey]
  );

  const hydrateCategory = useCallback(
    async (categoryId: string): Promise<'done' | 'idle'> => {
      const current = genStateRef.current[categoryId];
      if (current?.status === 'done' && current.sessions.length > 0) {
        return 'done';
      }
      if (current?.status === 'generating' || current?.status === 'error') {
        return 'idle';
      }

      const existingPromise = hydratePromises.get(categoryId);
      if (existingPromise) {
        return existingPromise;
      }

      const promise = (async (): Promise<'done' | 'idle'> => {
        setGenState((prev) => {
          const existing = prev[categoryId];
          if (
            existing?.status === 'generating' ||
            existing?.status === 'done' ||
            existing?.status === 'error'
          ) {
            return prev;
          }
          return {
            ...prev,
            [categoryId]: {
              ...(existing ?? emptyState()),
              status: 'loading',
              error: null,
            },
          };
        });

        try {
          const res = await fetch(
            `/api/sessions?weekId=${encodeURIComponent(weekId)}&categoryId=${encodeURIComponent(categoryId)}`
          );
          const data = await res.json();
          if (!res.ok) {
            setGenState((prev) => {
              const existing = prev[categoryId];
              if (
                existing?.status === 'generating' ||
                existing?.status === 'done' ||
                existing?.status === 'error'
              ) {
                return prev;
              }
              return {
                ...prev,
                [categoryId]: {
                  ...emptyState(),
                  status: 'idle',
                },
              };
            });
            return 'idle';
          }

          const sessions = (data.sessions ?? []) as Session[];
          if (sessions.length > 0) {
            setGenState((prev) => {
              const existing = prev[categoryId];
              if (
                existing?.status === 'generating' ||
                existing?.status === 'done' ||
                existing?.status === 'error'
              ) {
                return prev;
              }
              return {
                ...prev,
                [categoryId]: {
                  status: 'done',
                  weekTheme: null,
                  weekNote: null,
                  sessions,
                  error: null,
                },
              };
            });
            return 'done';
          }

          setGenState((prev) => {
            const existing = prev[categoryId];
            if (
              existing?.status === 'generating' ||
              existing?.status === 'done' ||
              existing?.status === 'error'
            ) {
              return prev;
            }
            return {
              ...prev,
              [categoryId]: {
                ...emptyState(),
                status: 'idle',
              },
            };
          });
          return 'idle';
        } catch {
          setGenState((prev) => {
            const existing = prev[categoryId];
            if (
              existing?.status === 'generating' ||
              existing?.status === 'done' ||
              existing?.status === 'error'
            ) {
              return prev;
            }
            return {
              ...prev,
              [categoryId]: {
                ...emptyState(),
                status: 'idle',
              },
            };
          });
          return 'idle';
        } finally {
          hydratePromises.delete(categoryId);
        }
      })();

      hydratePromises.set(categoryId, promise);
      return promise;
    },
    [weekId]
  );

  // Bootstrap: hydrate from DB first, then auto-generate only missing categories.
  useEffect(() => {
    if (autoStartedWeeks.has(weekId)) return;
    autoStartedWeeks.add(weekId);

    const selectedAtStart = categories.filter(
      (c) => selectedCategoryIds[c.id] !== false
    );
    const aiAtStart = selectedAtStart.filter(
      (c) => c.tracking_type === 'ai_plan'
    );
    const cyclingAtStart = aiAtStart.find((c) => c.name === 'Cycling');
    const strengthAtStart = aiAtStart.find((c) => c.name === 'Strength');
    const genericsAtStart = aiAtStart.filter(
      (c) => c.name !== 'Cycling' && c.name !== 'Strength'
    );

    async function run() {
      const results = await Promise.all(
        aiAtStart.map(async (category) => ({
          category,
          result: await hydrateCategory(category.id),
        }))
      );

      const missing = results
        .filter(({ result }) => result === 'idle')
        .map(({ category }) => category);

      if (missing.length === 0) return;

      const missingIds = new Set(missing.map((c) => c.id));
      const parallel = [
        ...(cyclingAtStart && missingIds.has(cyclingAtStart.id)
          ? [cyclingAtStart]
          : []),
        ...genericsAtStart.filter((c) => missingIds.has(c.id)),
      ];
      await Promise.all(parallel.map((c) => generateCategory(c)));
      if (strengthAtStart && missingIds.has(strengthAtStart.id)) {
        await generateCategory(strengthAtStart);
      }
    }

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per weekId
  }, [weekId]);

  // Hydrate from DB when an ai_plan category is toggled on and state is idle.
  useEffect(() => {
    const ids = aiPlanCategoryIdsKey
      ? aiPlanCategoryIdsKey.split(',')
      : [];

    for (const categoryId of ids) {
      const current = genStateRef.current[categoryId];
      const status = current?.status;
      if (
        status === 'done' ||
        status === 'generating' ||
        status === 'error' ||
        status === 'loading'
      ) {
        continue;
      }
      void hydrateCategory(categoryId);
    }
  }, [aiPlanCategoryIdsKey, weekId, hydrateCategory]);

  const allAiDone =
    aiPlanCategories.length === 0 ||
    aiPlanCategories.every((c) => genState[c.id]?.status === 'done');

  async function saveSessionEdit(session: Session, categoryId: string) {
    setEditSaving(true);
    try {
      const title = editTitle.trim();
      const durationRaw = editDuration.trim();
      const planned_duration_min = durationRaw
        ? Number(durationRaw)
        : session.planned_duration_min;

      if (!title) return;
      if (
        planned_duration_min != null &&
        (!Number.isFinite(planned_duration_min) || planned_duration_min <= 0)
      ) {
        return;
      }

      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          planned_duration_min,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error);
        return;
      }

      const updated = data.session as Session;
      setGenState((prev) => {
        const cat = prev[categoryId];
        if (!cat) return prev;
        return {
          ...prev,
          [categoryId]: {
            ...cat,
            sessions: cat.sessions.map((s) =>
              s.id === updated.id ? updated : s
            ),
          },
        };
      });
      setEditingSessionId(null);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Step 3 — Generate Plans
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Generating plans…
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          AI coaches build each active category. Strength waits for Cycling so
          hard days stay coordinated.
        </p>
      </div>

      <ul className="space-y-3">
        {orderedAiPlan.map((category) => {
          const state = genState[category.id] ?? emptyState();
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
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {category.name}
                    </h3>
                    {(state.status === 'generating' ||
                      state.status === 'loading') && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                        <span
                          className="h-3 w-3 animate-spin rounded-full border-2 border-gray-500 border-t-white"
                          aria-hidden
                        />
                        {state.status === 'loading'
                          ? 'Checking…'
                          : 'Generating…'}
                      </span>
                    )}
                    {state.status === 'done' && state.weekTheme && (
                      <span className="text-xs text-gray-400">
                        {state.weekTheme}
                      </span>
                    )}
                  </div>

                  {state.status === 'error' && (
                    <p className="mt-2 text-sm text-red-400" role="alert">
                      {state.error}
                    </p>
                  )}

                  {state.status === 'done' && (
                    <ul className="mt-3 space-y-1.5">
                      {state.sessions.map((session) => {
                        const editing = editingSessionId === session.id;
                        return (
                          <li
                            key={session.id}
                            className="flex items-center gap-2 text-sm text-gray-300"
                          >
                            <span className="w-8 shrink-0 text-xs font-medium uppercase text-gray-500">
                              {dayLabel(session.day_of_week)}
                            </span>
                            {editing ? (
                              <>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="min-w-0 flex-1 rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm text-white outline-none focus:border-gray-400"
                                  aria-label="Session title"
                                />
                                <input
                                  type="number"
                                  min={1}
                                  value={editDuration}
                                  onChange={(e) =>
                                    setEditDuration(e.target.value)
                                  }
                                  className="w-16 rounded border border-gray-600 bg-gray-950 px-2 py-1 text-sm text-white outline-none focus:border-gray-400"
                                  aria-label="Duration minutes"
                                />
                                <button
                                  type="button"
                                  disabled={editSaving}
                                  onClick={() =>
                                    void saveSessionEdit(session, category.id)
                                  }
                                  className="text-xs text-white underline underline-offset-2 disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSessionId(null)}
                                  className="text-xs text-gray-400 underline underline-offset-2"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSessionId(session.id);
                                    setEditTitle(session.title);
                                    setEditDuration(
                                      session.planned_duration_min != null
                                        ? String(session.planned_duration_min)
                                        : ''
                                    );
                                  }}
                                  className="min-w-0 flex-1 truncate text-left hover:text-white"
                                >
                                  {session.title}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSessionId(session.id);
                                    setEditTitle(session.title);
                                    setEditDuration(
                                      session.planned_duration_min != null
                                        ? String(session.planned_duration_min)
                                        : ''
                                    );
                                  }}
                                  className="shrink-0 text-xs text-gray-400 hover:text-white"
                                >
                                  {session.planned_duration_min != null
                                    ? `${session.planned_duration_min} min`
                                    : '—'}
                                </button>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {state.status === 'idle' && (
                    <button
                      type="button"
                      onClick={() => void generateCategory(category)}
                      className="mt-3 text-xs text-white underline underline-offset-2 hover:text-gray-200"
                    >
                      Generate
                    </button>
                  )}

                  {(state.status === 'done' || state.status === 'error') && (
                    <button
                      type="button"
                      onClick={() => void generateCategory(category)}
                      className="mt-3 text-xs text-gray-400 underline underline-offset-2 hover:text-white"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}

        {randomPickCategories.map((category) => (
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
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {category.name}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Will be generated after you confirm your training plan
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {orderedAiPlan.length === 0 && randomPickCategories.length === 0 && (
        <p className="text-sm text-gray-500">
          No categories selected for this week.
        </p>
      )}

      <button
        type="button"
        disabled={!allAiDone}
        onClick={onContinue}
        className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {allAiDone ? continueLabel : 'Waiting for plans…'}
      </button>
    </section>
  );
}
