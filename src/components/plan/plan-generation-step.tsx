'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import {
  WeekPlanCalendar,
  type CalendarSession,
} from '@/components/plan/week-plan-calendar';
import { dayLabel, plannedDateForDay } from '@/lib/plan-context';
import { isRestSession } from '@/lib/session-utils';
import { createClient } from '@/lib/supabase/client';
import type { Category, Session } from '@/types';

/** Survives React Strict Mode remounts so auto-gen only fires once per week. */
const autoStartedWeeks = new Set<string>();
/** Movement bootstrap keys already started (weekId:categoryIds). */
const movementBootstrappedKeys = new Set<string>();
/** Prevents duplicate in-flight generate calls for the same category. */
const inFlightCategoryIds = new Set<string>();
type HydrateResult = { status: 'done' | 'idle'; sessions: Session[] };

/** In-flight hydrate promises so concurrent callers share one fetch. */
const hydratePromises = new Map<string, Promise<HydrateResult>>();
/** In-flight reroll for a session id. */
const inFlightRerollIds = new Set<string>();

type MovementSession = Session & { target_area?: string | null };

function formatTargetArea(area: string | null | undefined): string {
  if (!area) return '—';
  return area.replace(/_/g, ' ');
}

async function loadTargetAreaMap(
  entryIds: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(entryIds.filter(Boolean)));
  if (unique.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase
    .from('movement_library')
    .select('id, target_area')
    .in('id', unique);
  if (error || !data) return {};
  return Object.fromEntries(
    data.map((row) => [row.id as string, row.target_area as string])
  );
}

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
  weekStart: string;
  planningNotes: string;
  categories: Category[];
  selectedCategoryIds: Record<string, boolean>;
  onContinue: () => void;
  onBack?: () => void;
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

function sortSessionsByDay(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    return a.sort_order - b.sort_order;
  });
}

function cloneSessions(sessions: Session[]): Session[] {
  return sessions.map((s) => ({ ...s }));
}

function sessionsMatchSnapshot(
  sessions: Session[],
  snapshot: Session[] | undefined
): boolean {
  if (!snapshot || snapshot.length !== sessions.length) return false;
  const byId = new Map(snapshot.map((s) => [s.id, s]));
  for (const session of sessions) {
    const original = byId.get(session.id);
    if (!original) return false;
    if (
      original.day_of_week !== session.day_of_week ||
      original.sort_order !== session.sort_order ||
      original.title !== session.title ||
      original.planned_duration_min !== session.planned_duration_min
    ) {
      return false;
    }
  }
  return true;
}

export function PlanGenerationStep({
  weekId,
  weekStart,
  planningNotes,
  categories,
  selectedCategoryIds,
  onContinue,
  onBack,
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
      Object.fromEntries(
        [...aiPlanCategories, ...randomPickCategories].map((c) => [
          c.id,
          emptyState(),
        ])
      )
  );
  const [targetAreaByEntryId, setTargetAreaByEntryId] = useState<
    Record<string, string>
  >({});
  const [rerollingSessionId, setRerollingSessionId] = useState<string | null>(
    null
  );
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [movingSession, setMovingSession] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const genStateRef = useRef(genState);
  genStateRef.current = genState;
  const snapshotsRef = useRef<Record<string, Session[]>>({});

  function saveSnapshot(categoryId: string, sessions: Session[]) {
    snapshotsRef.current[categoryId] = cloneSessions(sessions);
  }

  const activeCategoryIds = selected.map((c) => c.id);
  const activeCategoryIdsKey = activeCategoryIds.join(',');
  const aiPlanCategoryIdsKey = aiPlanCategories.map((c) => c.id).join(',');
  const randomPickCategoryIdsKey = randomPickCategories
    .map((c) => c.id)
    .join(',');

  function mergeTargetAreas(
    sessions: MovementSession[],
    areas?: Record<string, string>
  ) {
    const next: Record<string, string> = { ...areas };
    for (const session of sessions) {
      if (session.library_entry_id && session.target_area) {
        next[session.library_entry_id] = session.target_area;
      }
    }
    if (Object.keys(next).length > 0) {
      setTargetAreaByEntryId((prev) => ({ ...prev, ...next }));
    }
  }

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

        const sessions = (data.sessions ?? []) as Session[];
        saveSnapshot(category.id, sessions);
        setGenState((prev) => ({
          ...prev,
          [category.id]: {
            status: 'done',
            weekTheme: data.week_theme ?? null,
            weekNote: data.week_note ?? null,
            sessions,
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

  const generateMovementCategory = useCallback(
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
        const res = await fetch('/api/plan/generate-movement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekId,
            categoryId: category.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setGenState((prev) => ({
            ...prev,
            [category.id]: {
              ...(prev[category.id] ?? emptyState()),
              status: 'error',
              error: data.error ?? 'Failed to generate movement plan',
            },
          }));
          return false;
        }

        const sessions = (data.sessions ?? []) as MovementSession[];
        mergeTargetAreas(sessions);
        setGenState((prev) => ({
          ...prev,
          [category.id]: {
            status: 'done',
            weekTheme: null,
            weekNote: null,
            sessions,
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
    [weekId]
  );

  const rerollMovementSession = useCallback(
    async (session: Session) => {
      if (inFlightRerollIds.has(session.id)) return;
      inFlightRerollIds.add(session.id);
      setRerollingSessionId(session.id);

      try {
        const res = await fetch('/api/plan/reroll-movement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setCalendarError(data.error ?? 'Failed to shuffle routine');
          return;
        }

        const updated = data.session as MovementSession;
        mergeTargetAreas([updated]);
        setGenState((prev) => {
          const cat = prev[updated.category_id];
          if (!cat) return prev;
          return {
            ...prev,
            [updated.category_id]: {
              ...cat,
              sessions: cat.sessions.map((s) =>
                s.id === updated.id ? updated : s
              ),
            },
          };
        });
      } catch {
        setCalendarError('Something went wrong shuffling this routine.');
      } finally {
        inFlightRerollIds.delete(session.id);
        setRerollingSessionId((current) =>
          current === session.id ? null : current
        );
      }
    },
    []
  );

  const hydrateCategory = useCallback(
    async (categoryId: string): Promise<HydrateResult> => {
      const current = genStateRef.current[categoryId];
      if (current?.status === 'done' && current.sessions.length > 0) {
        if (!snapshotsRef.current[categoryId]) {
          saveSnapshot(categoryId, current.sessions);
        }
        return { status: 'done', sessions: current.sessions };
      }
      if (current?.status === 'generating' || current?.status === 'error') {
        return { status: 'idle', sessions: [] };
      }

      const existingPromise = hydratePromises.get(categoryId);
      if (existingPromise) {
        return existingPromise;
      }

      const promise = (async (): Promise<HydrateResult> => {
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
            return { status: 'idle', sessions: [] };
          }

          const sessions = (data.sessions ?? []) as Session[];
          if (sessions.length > 0) {
            saveSnapshot(categoryId, sessions);
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
            return { status: 'done', sessions };
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
          return { status: 'idle', sessions: [] };
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
          return { status: 'idle', sessions: [] };
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
        .filter(({ result }) => result.status === 'idle')
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
  const allMovementDone =
    randomPickCategories.length === 0 ||
    randomPickCategories.every((c) => genState[c.id]?.status === 'done');
  const allPlansDone = allAiDone && allMovementDone;
  const showCalendar = allAiDone && aiPlanCategories.length > 0;

  // After AI plans finish, hydrate then generate random_pick categories in parallel.
  useEffect(() => {
    if (!allAiDone) return;
    if (randomPickCategories.length === 0) return;

    const bootstrapKey = `${weekId}:${randomPickCategoryIdsKey}`;
    if (movementBootstrappedKeys.has(bootstrapKey)) return;
    movementBootstrappedKeys.add(bootstrapKey);

    const categoriesAtStart = randomPickCategories;

    async function run() {
      const results = await Promise.all(
        categoriesAtStart.map(async (category) => ({
          category,
          result: await hydrateCategory(category.id),
        }))
      );

      const entryIds = results.flatMap(({ result }) =>
        result.status === 'done'
          ? result.sessions
              .map((s) => s.library_entry_id)
              .filter((id): id is string => Boolean(id))
          : []
      );
      if (entryIds.length > 0) {
        const areas = await loadTargetAreaMap(entryIds);
        if (Object.keys(areas).length > 0) {
          setTargetAreaByEntryId((prev) => ({ ...prev, ...areas }));
        }
      }

      const missing = results
        .filter(({ result }) => result.status === 'idle')
        .map(({ category }) => category);
      await Promise.all(missing.map((c) => generateMovementCategory(c)));
    }

    void run();
  }, [
    allAiDone,
    weekId,
    randomPickCategoryIdsKey,
    randomPickCategories,
    hydrateCategory,
    generateMovementCategory,
  ]);

  const calendarSessions: CalendarSession[] = useMemo(() => {
    if (!showCalendar) return [];
    const categoriesById = Object.fromEntries(
      aiPlanCategories.map((c) => [c.id, c])
    );
    const items: CalendarSession[] = [];
    for (const category of aiPlanCategories) {
      const state = genState[category.id];
      if (!state || state.status !== 'done') continue;
      for (const session of state.sessions) {
        if (isRestSession(session)) continue;
        const cat = categoriesById[session.category_id] ?? category;
        items.push({ ...session, category: cat });
      }
    }
    return items;
  }, [showCalendar, aiPlanCategories, genState]);

  const hasCalendarChanges = useMemo(() => {
    if (!showCalendar) return false;
    return aiPlanCategories.some((category) => {
      const state = genState[category.id];
      if (!state || state.status !== 'done') return false;
      return !sessionsMatchSnapshot(
        state.sessions,
        snapshotsRef.current[category.id]
      );
    });
  }, [showCalendar, aiPlanCategories, genState]);

  async function saveSessionEdit(session: Session) {
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
        const cat = prev[updated.category_id];
        if (!cat) return prev;
        return {
          ...prev,
          [updated.category_id]: {
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

  async function swapSessions(sessionA: Session, sessionB: Session) {
    const categoryId = sessionA.category_id;
    const cat = genStateRef.current[categoryId];
    if (!cat || cat.status !== 'done') return;

    const previous = cat.sessions;
    const optimistic = previous.map((s) => {
      if (s.id === sessionA.id) {
        return {
          ...s,
          day_of_week: sessionB.day_of_week,
          planned_date: sessionB.planned_date,
          sort_order: sessionB.sort_order,
        };
      }
      if (s.id === sessionB.id) {
        return {
          ...s,
          day_of_week: sessionA.day_of_week,
          planned_date: sessionA.planned_date,
          sort_order: sessionA.sort_order,
        };
      }
      return s;
    });

    setMovingSession(true);
    setCalendarError(null);
    setGenState((prev) => {
      const existing = prev[categoryId];
      if (!existing) return prev;
      return {
        ...prev,
        [categoryId]: {
          ...existing,
          sessions: optimistic,
        },
      };
    });

    try {
      const res = await fetch('/api/sessions/swap-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId,
          sessionIdA: sessionA.id,
          sessionIdB: sessionB.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenState((prev) => {
          const existing = prev[categoryId];
          if (!existing) return prev;
          return {
            ...prev,
            [categoryId]: {
              ...existing,
              sessions: previous,
            },
          };
        });
        setCalendarError(data.error ?? 'Failed to move session');
        return;
      }

      const swapped = (data.sessions ?? []) as Session[];
      setGenState((prev) => {
        const existing = prev[categoryId];
        if (!existing) return prev;
        const byId = new Map(swapped.map((s) => [s.id, s]));
        return {
          ...prev,
          [categoryId]: {
            ...existing,
            sessions: existing.sessions.map((s) => byId.get(s.id) ?? s),
          },
        };
      });
    } catch {
      setGenState((prev) => {
        const existing = prev[categoryId];
        if (!existing) return prev;
        return {
          ...prev,
          [categoryId]: {
            ...existing,
            sessions: previous,
          },
        };
      });
      setCalendarError('Something went wrong. Please try again.');
    } finally {
      setMovingSession(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (movingSession || resetting) return;

    let session: Session | undefined;
    for (const category of aiPlanCategories) {
      const found = genStateRef.current[category.id]?.sessions.find(
        (s) => s.id === sessionId
      );
      if (found) {
        session = found;
        break;
      }
    }
    if (!session) return;

    const categoryId = session.category_id;
    const cat = genStateRef.current[categoryId];
    if (!cat) return;
    const previous = cat.sessions;

    setMovingSession(true);
    setCalendarError(null);
    if (editingSessionId === sessionId) {
      setEditingSessionId(null);
    }
    setGenState((prev) => {
      const existing = prev[categoryId];
      if (!existing) return prev;
      return {
        ...prev,
        [categoryId]: {
          ...existing,
          sessions: existing.sessions.filter((s) => s.id !== sessionId),
        },
      };
    });

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenState((prev) => {
          const existing = prev[categoryId];
          if (!existing) return prev;
          return {
            ...prev,
            [categoryId]: {
              ...existing,
              sessions: previous,
            },
          };
        });
        setCalendarError(
          (data as { error?: string }).error ?? 'Failed to delete session'
        );
      }
    } catch {
      setGenState((prev) => {
        const existing = prev[categoryId];
        if (!existing) return prev;
        return {
          ...prev,
          [categoryId]: {
            ...existing,
            sessions: previous,
          },
        };
      });
      setCalendarError('Something went wrong. Please try again.');
    } finally {
      setMovingSession(false);
    }
  }

  async function reassignSessionDay(session: Session, day: number) {
    const categoryId = session.category_id;
    const cat = genStateRef.current[categoryId];
    if (!cat) return;

    const previous = cat.sessions;
    const planned_date = plannedDateForDay(weekStart, day);
    const optimistic = previous.map((s) =>
      s.id === session.id
        ? { ...s, day_of_week: day, planned_date }
        : s
    );

    setMovingSession(true);
    setCalendarError(null);
    setGenState((prev) => {
      const existing = prev[categoryId];
      if (!existing) return prev;
      return {
        ...prev,
        [categoryId]: {
          ...existing,
          sessions: optimistic,
        },
      };
    });

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_of_week: day }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenState((prev) => {
          const existing = prev[categoryId];
          if (!existing) return prev;
          return {
            ...prev,
            [categoryId]: {
              ...existing,
              sessions: previous,
            },
          };
        });
        setCalendarError(data.error ?? 'Failed to move session');
        return;
      }

      const updated = data.session as Session;
      setGenState((prev) => {
        const existing = prev[categoryId];
        if (!existing) return prev;
        return {
          ...prev,
          [categoryId]: {
            ...existing,
            sessions: existing.sessions.map((s) =>
              s.id === updated.id ? updated : s
            ),
          },
        };
      });
    } catch {
      setGenState((prev) => {
        const existing = prev[categoryId];
        if (!existing) return prev;
        return {
          ...prev,
          [categoryId]: {
            ...existing,
            sessions: previous,
          },
        };
      });
      setCalendarError('Something went wrong. Please try again.');
    } finally {
      setMovingSession(false);
    }
  }

  async function handleMoveToDay(sessionId: string, day: number) {
    if (movingSession || resetting) return;

    let session: Session | undefined;
    for (const category of aiPlanCategories) {
      const found = genStateRef.current[category.id]?.sessions.find(
        (s) => s.id === sessionId
      );
      if (found) {
        session = found;
        break;
      }
    }
    if (!session || session.day_of_week === day) return;

    const categoryId = session.category_id;
    const cat = genStateRef.current[categoryId];
    if (!cat || cat.status !== 'done') return;

    const sessions = sortSessionsByDay(cat.sessions);
    const occupant = sessions.find(
      (s) => s.day_of_week === day && s.id !== sessionId
    );

    if (occupant) {
      await swapSessions(session, occupant);
      return;
    }

    await reassignSessionDay(session, day);
  }

  async function restoreCategoryFromSnapshot(
    categoryId: string,
    previousSessions: Session[],
    snapshot: Session[]
  ): Promise<void> {
    const prevIds = new Set(previousSessions.map((s) => s.id));
    const snapIds = new Set(snapshot.map((s) => s.id));

    for (const prev of previousSessions) {
      if (snapIds.has(prev.id)) continue;
      const res = await fetch(`/api/sessions/${prev.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? 'Failed to remove session'
        );
      }
    }

    for (const snap of snapshot) {
      if (prevIds.has(snap.id)) continue;
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId,
          session: {
            id: snap.id,
            categoryId: snap.category_id,
            day_of_week: snap.day_of_week,
            title: snap.title,
            planned_duration_min: snap.planned_duration_min,
            sort_order: snap.sort_order,
            description: snap.description,
            session_type: snap.session_type,
            zones: snap.zones,
            blocks: snap.blocks,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to restore deleted session');
      }
    }

    const sharedPrevious = previousSessions.filter((s) => snapIds.has(s.id));
    const sharedSnapshot = snapshot.filter((s) => prevIds.has(s.id));

    const prevDays = new Set(sharedPrevious.map((s) => s.day_of_week));
    const snapDays = new Set(sharedSnapshot.map((s) => s.day_of_week));
    const sameDaySet =
      prevDays.size === snapDays.size &&
      Array.from(prevDays).every((d) => snapDays.has(d));

    if (sameDaySet && sharedPrevious.length >= 2) {
      const slots = sortSessionsByDay(sharedPrevious);
      const orderedIds = slots.map((slot) => {
        const target = sharedSnapshot.find(
          (s) => s.day_of_week === slot.day_of_week
        );
        return target?.id;
      });
      if (
        orderedIds.every((id): id is string => Boolean(id)) &&
        orderedIds.some((id, i) => id !== slots[i].id)
      ) {
        const res = await fetch('/api/sessions/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weekId,
            categoryId,
            sessionIds: orderedIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to restore session days');
        }
      }
    } else {
      for (const snap of sharedSnapshot) {
        const prev = sharedPrevious.find((s) => s.id === snap.id);
        if (!prev || prev.day_of_week === snap.day_of_week) continue;
        const res = await fetch(`/api/sessions/${snap.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day_of_week: snap.day_of_week }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to restore session day');
        }
      }
    }

    for (const snap of sharedSnapshot) {
      const prev = sharedPrevious.find((s) => s.id === snap.id);
      if (
        prev &&
        prev.title === snap.title &&
        prev.planned_duration_min === snap.planned_duration_min
      ) {
        continue;
      }

      const body: {
        title?: string;
        planned_duration_min?: number | null;
      } = {};
      if (!prev || prev.title !== snap.title) {
        body.title = snap.title;
      }
      if (
        (!prev || prev.planned_duration_min !== snap.planned_duration_min) &&
        (snap.planned_duration_min == null || snap.planned_duration_min > 0)
      ) {
        body.planned_duration_min = snap.planned_duration_min;
      }
      if (body.title === undefined && body.planned_duration_min === undefined) {
        continue;
      }

      const res = await fetch(`/api/sessions/${snap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to restore session details');
      }
    }
  }

  async function resetToSnapshots() {
    if (resetting || movingSession || !hasCalendarChanges) return;

    const previousByCategory: Record<string, Session[]> = {};
    for (const category of aiPlanCategories) {
      const state = genStateRef.current[category.id];
      if (state?.status === 'done') {
        previousByCategory[category.id] = cloneSessions(state.sessions);
      }
    }

    setResetting(true);
    setCalendarError(null);
    setEditingSessionId(null);

    setGenState((prev) => {
      const next = { ...prev };
      for (const category of aiPlanCategories) {
        const snap = snapshotsRef.current[category.id];
        const existing = next[category.id];
        if (!snap || !existing) continue;
        next[category.id] = {
          ...existing,
          sessions: cloneSessions(snap),
        };
      }
      return next;
    });

    try {
      for (const category of aiPlanCategories) {
        const snap = snapshotsRef.current[category.id];
        const previous = previousByCategory[category.id];
        if (!snap || !previous) continue;
        if (sessionsMatchSnapshot(previous, snap)) continue;
        await restoreCategoryFromSnapshot(category.id, previous, snap);
      }
    } catch (err) {
      setGenState((prev) => {
        const next = { ...prev };
        for (const [categoryId, sessions] of Object.entries(
          previousByCategory
        )) {
          const existing = next[categoryId];
          if (!existing) continue;
          next[categoryId] = {
            ...existing,
            sessions,
          };
        }
        return next;
      });
      setCalendarError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Step 3 — Generate Plans
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          {showCalendar ? 'Your week at a glance' : 'Generating plans…'}
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          {showCalendar
            ? 'Drag a session to another day. Regenerating a category returns to the progress cards until it finishes.'
            : 'AI coaches build each active category. Strength waits for Cycling so hard days stay coordinated.'}
        </p>
      </div>

      {showCalendar ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {orderedAiPlan.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center gap-2 text-sm text-gray-300"
                >
                  <CategoryGlyph
                    icon={category.icon}
                    color={category.color}
                    size={16}
                    aria-label={`${category.name} icon`}
                  />
                  <span>{category.name}</span>
                  <button
                    type="button"
                    onClick={() => void generateCategory(category)}
                    className="text-xs text-gray-400 underline underline-offset-2 hover:text-white"
                  >
                    Regenerate
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={!hasCalendarChanges || resetting || movingSession}
              onClick={() => void resetToSnapshots()}
              className="shrink-0 text-xs text-gray-400 underline underline-offset-2 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
            >
              {resetting ? 'Resetting…' : 'Reset'}
            </button>
          </div>

          {calendarError && (
            <p className="text-sm text-red-400" role="alert">
              {calendarError}
            </p>
          )}

          <WeekPlanCalendar
            sessions={calendarSessions}
            disabled={movingSession || resetting}
            editingSessionId={editingSessionId}
            editTitle={editTitle}
            editDuration={editDuration}
            editSaving={editSaving}
            onEditTitleChange={setEditTitle}
            onEditDurationChange={setEditDuration}
            onStartEdit={(session) => {
              setEditingSessionId(session.id);
              setEditTitle(session.title);
              setEditDuration(
                session.planned_duration_min != null
                  ? String(session.planned_duration_min)
                  : ''
              );
            }}
            onSaveEdit={(session) => void saveSessionEdit(session)}
            onCancelEdit={() => setEditingSessionId(null)}
            onMoveToDay={(sessionId, day) =>
              void handleMoveToDay(sessionId, day)
            }
            onDeleteSession={(sessionId) =>
              void handleDeleteSession(sessionId)
            }
          />
        </>
      ) : (
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
                      {state.status === 'done' && (
                        <span className="text-xs text-gray-400">
                          {state.sessions.length} session
                          {state.sessions.length === 1 ? '' : 's'}
                          {state.weekTheme ? ` · ${state.weekTheme}` : ''}
                        </span>
                      )}
                    </div>

                    {state.status === 'error' && (
                      <p className="mt-2 text-sm text-red-400" role="alert">
                        {state.error}
                      </p>
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

          {randomPickCategories.map((category) => {
            const state = genState[category.id] ?? emptyState();
            // Detailed list below covers the done state.
            if (allAiDone && state.status === 'done') return null;
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
                      {!allAiDone && (
                        <span className="text-xs text-gray-500">
                          Waiting for training plan…
                        </span>
                      )}
                      {allAiDone &&
                        (state.status === 'generating' ||
                          state.status === 'loading') && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                            <span
                              className="h-3 w-3 animate-spin rounded-full border-2 border-gray-500 border-t-white"
                              aria-hidden
                            />
                            {state.status === 'loading'
                              ? 'Checking…'
                              : 'Picking routines…'}
                          </span>
                        )}
                    </div>
                    {state.status === 'error' && (
                      <p className="mt-2 text-sm text-red-400" role="alert">
                        {state.error}
                      </p>
                    )}
                    {allAiDone &&
                      (state.status === 'idle' || state.status === 'error') && (
                        <button
                          type="button"
                          onClick={() => void generateMovementCategory(category)}
                          className="mt-3 text-xs text-white underline underline-offset-2 hover:text-gray-200"
                        >
                          {state.status === 'error' ? 'Retry' : 'Generate'}
                        </button>
                      )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {allAiDone &&
        randomPickCategories.map((category) => {
          const state = genState[category.id] ?? emptyState();
          if (state.status !== 'done' || state.sessions.length === 0) {
            if (showCalendar) {
              return (
                <div
                  key={category.id}
                  className="rounded border border-gray-700 bg-gray-900 p-4"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CategoryGlyph
                      icon={category.icon}
                      color={category.color}
                      size={16}
                      aria-label={`${category.name} icon`}
                    />
                    <span className="font-medium text-white">
                      {category.name}
                    </span>
                    {(state.status === 'generating' ||
                      state.status === 'loading') && (
                      <span className="text-xs text-gray-400">
                        Picking routines…
                      </span>
                    )}
                    {state.status === 'error' && (
                      <button
                        type="button"
                        onClick={() => void generateMovementCategory(category)}
                        className="text-xs text-red-400 underline underline-offset-2"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          }

          return (
            <div
              key={category.id}
              className="space-y-2 rounded border border-gray-700 bg-gray-900 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CategoryGlyph
                    icon={category.icon}
                    color={category.color}
                    size={18}
                    aria-label={`${category.name} icon`}
                  />
                  <h3 className="text-sm font-semibold text-white">
                    {category.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => void generateMovementCategory(category)}
                  className="text-xs text-gray-400 underline underline-offset-2 hover:text-white"
                >
                  Regenerate
                </button>
              </div>
              <ul className="divide-y divide-gray-800">
                {sortSessionsByDay(state.sessions).map((session) => {
                  const area =
                    (session.library_entry_id &&
                      targetAreaByEntryId[session.library_entry_id]) ||
                    (session as MovementSession).target_area;
                  const shuffling = rerollingSessionId === session.id;
                  return (
                    <li
                      key={session.id}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-white">
                          <span className="text-gray-500">
                            {dayLabel(session.day_of_week)}
                          </span>
                          <span className="mx-1.5 text-gray-600">·</span>
                          {session.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {session.planned_duration_min ?? '—'} min
                          <span className="mx-1.5 text-gray-600">·</span>
                          {formatTargetArea(area)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={shuffling}
                        onClick={() => void rerollMovementSession(session)}
                        className="inline-flex shrink-0 items-center gap-1 rounded border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Shuffle ${session.title}`}
                      >
                        <Shuffle
                          className={`h-3.5 w-3.5 ${shuffling ? 'animate-spin' : ''}`}
                          aria-hidden
                        />
                        Shuffle
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

      {orderedAiPlan.length === 0 && randomPickCategories.length === 0 && (
        <p className="text-sm text-gray-500">
          No categories selected for this week.
        </p>
      )}

      <button
        type="button"
        disabled={!allPlansDone}
        onClick={onContinue}
        className="w-full rounded bg-white px-4 py-2.5 text-sm font-medium text-gray-950 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {allPlansDone ? continueLabel : 'Waiting for plans…'}
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
