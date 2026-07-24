'use client';

import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { Check, Sun } from 'lucide-react';
import { useSetHeader } from '@/components/layout/header-context';
import { AiSessionSheet } from '@/components/today/ai-session-sheet';
import { BinarySheet } from '@/components/today/binary-sheet';
import { MoveSheet } from '@/components/today/move-sheet';
import { NutritionTodayCard } from '@/components/today/nutrition-today-card';
import { SessionCard } from '@/components/today/session-card';
import { TrackedSessionSheet } from '@/components/today/tracked-session-sheet';
import { getCategoryMode, getEffortType } from '@/lib/category-mode';
import { isRestSession } from '@/lib/session-utils';
import type { Category, NutritionPlan, Session, Week } from '@/types';

type TodayViewProps = {
  week: Week;
  categories: Category[];
  sessions: Session[];
  nutritionPlan: NutritionPlan | null;
  todayIso: string;
  todayDayOfWeek: number;
};

type SheetState =
  | { type: 'binary'; session: Session }
  | { type: 'tracked'; session: Session }
  | { type: 'ai'; session: Session }
  | null;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TodayView({
  week,
  categories,
  sessions: initialSessions,
  nutritionPlan,
  todayIso,
  todayDayOfWeek,
}: TodayViewProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSheet, setActiveSheet] = useState<SheetState>(null);
  const [movingSession, setMovingSession] = useState<Session | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.day_of_week === todayDayOfWeek && !isRestSession(s))
        .sort((a, b) => a.sort_order - b.sort_order),
    [sessions, todayDayOfWeek]
  );

  const activePhysCatNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of todaySessions) {
      const cat = categoryById.get(s.category_id);
      if (cat?.affects_nutrition) names.add(cat.name);
    }
    return Array.from(names);
  }, [todaySessions, categoryById]);

  const allDone =
    todaySessions.length > 0 &&
    todaySessions.every((s) => s.completed || s.skipped);

  function upsertSession(updated: Session) {
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }

  function openSession(session: Session) {
    const category = categoryById.get(session.category_id);
    if (!category) return;
    const effort = getEffortType(category);
    const mode = getCategoryMode(category);
    if (effort === 'binary') {
      setActiveSheet({ type: 'binary', session });
      return;
    }
    if (mode === 'tracked') {
      setActiveSheet({ type: 'tracked', session });
      return;
    }
    setActiveSheet({ type: 'ai', session });
  }

  function closeSheet() {
    setActiveSheet(null);
  }

  useSetHeader({ title: 'Today' });

  const dateLabel = format(parseISO(todayIso), 'EEEE, d MMM');

  return (
    <div className="px-5 pt-4">
      <div className="mb-5">
        <div className="mb-0.5 text-[12px] text-ld-text-sub">{dateLabel}</div>
        <div className="text-[22px] font-black text-ld-text">
          {greeting()}
        </div>
      </div>

      <NutritionTodayCard
        nutritionPlan={nutritionPlan}
        dayIso={todayIso}
        activePhysCatNames={activePhysCatNames}
      />

      <div className="mb-3 text-[11px] font-bold tracking-wide text-ld-text-muted">
        TODAY&apos;S SESSIONS
      </div>

      {todaySessions.length === 0 ? (
        <div className="rounded-2xl border border-ld-border bg-ld-surface px-5 py-7 text-center">
          <Sun size={28} className="mx-auto mb-2.5 text-ld-text-muted" />
          <div className="mb-1 text-[15px] font-bold text-ld-text-sub">
            Rest day
          </div>
          <div className="text-[13px] text-ld-text-muted">
            No sessions planned. Recover well.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {todaySessions.map((session) => {
            const category = categoryById.get(session.category_id);
            if (!category) return null;
            return (
              <SessionCard
                key={session.id}
                session={session}
                category={category}
                onTap={() => openSession(session)}
                onMove={() => setMovingSession(session)}
              />
            );
          })}
        </div>
      )}

      {allDone && (
        <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-ld-green/30 bg-ld-green-dim px-4 py-3.5">
          <Check size={16} className="text-ld-green" />
          <span className="text-[13px] font-bold text-ld-green">
            All done today. Great work.
          </span>
        </div>
      )}

      <div className="mt-3.5 flex items-center gap-2 rounded-[10px] border border-ld-border bg-ld-surface-high px-3.5 py-2.5">
        <span className="shrink-0 text-[11px] text-ld-text-muted">i</span>
        <span className="text-[11px] text-ld-text-muted">
          Tap a card to open session. Use &quot;Move&quot; to shift to another
          day.
        </span>
      </div>

      <div className="h-8" />

      {activeSheet?.type === 'binary' &&
        (() => {
          const category = categoryById.get(activeSheet.session.category_id);
          if (!category) return null;
          return (
            <BinarySheet
              session={activeSheet.session}
              category={category}
              onClose={closeSheet}
              onSaved={(updated) => {
                upsertSession(updated);
                setActiveSheet({ type: 'binary', session: updated });
              }}
            />
          );
        })()}

      {activeSheet?.type === 'tracked' &&
        (() => {
          const category = categoryById.get(activeSheet.session.category_id);
          if (!category) return null;
          return (
            <TrackedSessionSheet
              session={activeSheet.session}
              category={category}
              onClose={closeSheet}
              onSaved={(updated) => {
                upsertSession(updated);
                setActiveSheet({ type: 'tracked', session: updated });
              }}
            />
          );
        })()}

      {activeSheet?.type === 'ai' &&
        (() => {
          const category = categoryById.get(activeSheet.session.category_id);
          if (!category) return null;
          return (
            <AiSessionSheet
              session={activeSheet.session}
              category={category}
              onClose={closeSheet}
              onUpdate={(updated) => {
                upsertSession(updated);
                setActiveSheet({ type: 'ai', session: updated });
              }}
            />
          );
        })()}

      {movingSession &&
        (() => {
          const category = categoryById.get(movingSession.category_id);
          if (!category) return null;
          return (
            <MoveSheet
              session={movingSession}
              category={category}
              categories={categories}
              weekSessions={sessions}
              week={week}
              fromDay={todayDayOfWeek}
              todayDayOfWeek={todayDayOfWeek}
              onMove={(day) => {
                upsertSession({ ...movingSession, day_of_week: day });
                setMovingSession(null);
              }}
              onClose={() => setMovingSession(null)}
            />
          );
        })()}
    </div>
  );
}
