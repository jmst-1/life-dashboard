'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { getCategoryRegistryEntry } from '@/lib/category-registry';
import { isRestSession } from '@/lib/session-utils';
import type { Category, NutritionPlan, Session, Week } from '@/types';
import { CyclingDetailDrawer } from './cycling-detail-drawer';
import { LogSessionModal } from './log-session-modal';
import { MovementDetailDrawer } from './movement-detail-drawer';
import { ScoreRing } from './score-ring';
import { WeekBoard } from './week-board';
import { WeekDayMacros } from './week-day-macros';

type CurrentWeekViewProps = {
  week: Week;
  categories: Category[];
  initialSessions: Session[];
  nutritionPlan: NutritionPlan | null;
  ftp: number;
  targetAreaByEntryId: Record<string, string>;
  lockedBanner?: boolean;
  rangeLabel: string;
};

type DrawerState =
  | { type: 'cycling'; session: Session }
  | { type: 'movement'; session: Session }
  | { type: 'log'; session: Session }
  | null;

function todayDayOfWeekMon0(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export function CurrentWeekView({
  week,
  categories,
  initialSessions,
  nutritionPlan,
  ftp,
  targetAreaByEntryId: initialTargetAreas,
  lockedBanner,
  rangeLabel,
}: CurrentWeekViewProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [targetAreas, setTargetAreas] = useState(initialTargetAreas);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [shufflingId, setShufflingId] = useState<string | null>(null);

  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const canEdit = week.status === 'active';
  const todayDow = todayDayOfWeekMon0();
  const [selectedDay, setSelectedDay] = useState(todayDow);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const sessionsByDay = useMemo(() => {
    const byDay: Record<number, Session[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    for (const s of sessions) {
      if (isRestSession(s)) continue;
      if (s.day_of_week >= 0 && s.day_of_week <= 6) {
        byDay[s.day_of_week].push(s);
      }
    }
    for (let day = 0; day <= 6; day++) {
      byDay[day].sort((a, b) => {
        const catA = categoryById.get(a.category_id)?.name ?? '';
        const catB = categoryById.get(b.category_id)?.name ?? '';
        if (catA !== catB) return catA.localeCompare(catB);
        return a.sort_order - b.sort_order;
      });
    }
    return byDay;
  }, [sessions, categoryById]);

  function upsertSession(updated: Session) {
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }

  function openSession(session: Session) {
    const category = categoryById.get(session.category_id);
    if (!category) return;
    const renderer = getCategoryRegistryEntry(category).sessionRenderer;
    if (renderer === 'strength') {
      router.push(`/week/${session.id}/strength`);
      return;
    }
    if (renderer === 'cycling') {
      setDrawer({ type: 'cycling', session });
      return;
    }
    if (renderer === 'movement') {
      setDrawer({ type: 'movement', session });
      return;
    }
    setDrawer({ type: 'log', session });
  }

  async function shuffleSession(session: Session) {
    setShufflingId(session.id);
    try {
      const res = await fetch('/api/plan/reroll-movement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const json = (await res.json()) as {
        session?: Session & { target_area?: string };
        error?: string;
      };
      if (res.ok && json.session) {
        upsertSession(json.session);
        if (json.session.library_entry_id && json.session.target_area) {
          setTargetAreas((prev) => ({
            ...prev,
            [json.session!.library_entry_id!]: json.session!.target_area!,
          }));
        }
      }
    } finally {
      setShufflingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {lockedBanner && (
        <p
          className="rounded border border-amber-800/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
          role="status"
        >
          This week&apos;s plan is locked. You can review it here.
        </p>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">This week</h1>
          <p className="mt-1 text-sm text-gray-400">{rangeLabel}</p>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            week.status === 'active'
              ? 'border-emerald-700 text-emerald-300'
              : week.status === 'complete'
                ? 'border-gray-600 text-gray-300'
                : 'border-amber-700 text-amber-300'
          }`}
        >
          {week.status}
        </span>
      </div>

      {week.status === 'active' && (
        <Link
          href="/plan"
          className="inline-flex text-sm font-medium text-white underline underline-offset-2 hover:text-gray-200"
        >
          Edit plan →
        </Link>
      )}

      <ScoreRing categories={categories} sessions={sessions} />

      <WeekBoard
        sessionsByDay={sessionsByDay}
        categoryById={categoryById}
        nutritionPlan={nutritionPlan}
        todayDayOfWeek={todayDow}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        todayIso={todayIso}
        canEdit={canEdit}
        shufflingId={shufflingId}
        onOpenSession={openSession}
        onShuffleSession={shuffleSession}
      />

      {nutritionPlan && (
        <WeekDayMacros plan={nutritionPlan} selectedDay={selectedDay} />
      )}

      {drawer?.type === 'cycling' && (
        <CyclingDetailDrawer
          session={drawer.session}
          ftp={ftp}
          canEdit={canEdit}
          onClose={() => setDrawer(null)}
          onLog={() => setDrawer({ type: 'log', session: drawer.session })}
        />
      )}

      {drawer?.type === 'movement' && (
        <MovementDetailDrawer
          session={drawer.session}
          targetArea={
            (drawer.session.library_entry_id &&
              targetAreas[drawer.session.library_entry_id]) ||
            null
          }
          canEdit={canEdit}
          onClose={() => setDrawer(null)}
          onSaved={(updated) => {
            upsertSession(updated);
            setDrawer(null);
          }}
          onRerolled={(updated, area) => {
            upsertSession(updated);
            if (updated.library_entry_id && area) {
              setTargetAreas((prev) => ({
                ...prev,
                [updated.library_entry_id!]: area,
              }));
            }
          }}
        />
      )}

      {drawer?.type === 'log' && (
        <LogSessionModal
          session={drawer.session}
          canEdit={canEdit}
          onClose={() => setDrawer(null)}
          onSaved={(updated) => {
            upsertSession(updated);
            setDrawer(null);
          }}
        />
      )}
    </div>
  );
}
