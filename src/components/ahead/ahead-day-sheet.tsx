'use client';

import { useMemo, useState } from 'react';
import { Check, Eye, Shuffle, X } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { AiSessionSheet } from '@/components/today/ai-session-sheet';
import { BinarySheet } from '@/components/today/binary-sheet';
import { MoveSheet } from '@/components/today/move-sheet';
import { TrackedSessionSheet } from '@/components/today/tracked-session-sheet';
import { Divider } from '@/components/ui/divider';
import { Pill } from '@/components/ui/pill';
import { Sheet } from '@/components/ui/sheet';
import { getCategoryMode, getEffortType } from '@/lib/category-mode';
import { isRestSession } from '@/lib/session-utils';
import { dayLabel } from '@/lib/plan-context';
import type { Category, Session, Week } from '@/types';

type AheadDaySheetProps = {
  week: Week;
  day: number;
  categories: Category[];
  /** Full week sessions when day-level detail is available. */
  weekSessions: Session[] | null;
  currentWeekStart: string;
  todayDayOfWeek?: number;
  onClose: () => void;
  onSessionsUpdate?: (updated: Session[]) => void;
  onPlanWeek?: () => void;
};

type DetailSheet =
  | { type: 'binary'; session: Session }
  | { type: 'tracked'; session: Session }
  | { type: 'ai'; session: Session }
  | null;

export function AheadDaySheet({
  week,
  day,
  categories,
  weekSessions,
  currentWeekStart,
  todayDayOfWeek,
  onClose,
  onSessionsUpdate,
  onPlanWeek,
}: AheadDaySheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [movingSession, setMovingSession] = useState<Session | null>(null);
  const [detailSheet, setDetailSheet] = useState<DetailSheet>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);

  const categoryById = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c]));
    return map;
  }, [categories]);

  const daySessions = (weekSessions ?? [])
    .filter((s) => s.day_of_week === day && !isRestSession(s))
    .sort((a, b) => a.sort_order - b.sort_order);

  const isCurrentWeek = week.week_start === currentWeekStart;
  const isToday =
    isCurrentWeek &&
    todayDayOfWeek != null &&
    day === todayDayOfWeek;
  const canLog = isToday;
  const canReorder = isCurrentWeek && week.status === 'active';

  function updateLocal(updater: (prev: Session[]) => Session[]) {
    if (!weekSessions || !onSessionsUpdate) return;
    onSessionsUpdate(updater(weekSessions));
  }

  function openDetail(session: Session) {
    const category = categoryById.get(session.category_id);
    if (!category) return;
    const effort = getEffortType(category);
    const mode = getCategoryMode(category);
    if (effort === 'binary') {
      setDetailSheet({ type: 'binary', session });
      return;
    }
    if (mode === 'tracked') {
      setDetailSheet({ type: 'tracked', session });
      return;
    }
    setDetailSheet({ type: 'ai', session });
  }

  async function handleTap(sessionId: string) {
    if (!canReorder || swapping) return;
    if (selectedId === null) {
      setSelectedId(sessionId);
      return;
    }
    if (selectedId === sessionId) {
      setSelectedId(null);
      return;
    }

    setSwapping(true);
    setSwapError(null);
    try {
      const res = await fetch('/api/sessions/swap-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId: week.id,
          sessionIdA: selectedId,
          sessionIdB: sessionId,
        }),
      });
      const json = (await res.json()) as {
        sessions?: Session[];
        error?: string;
      };
      if (!res.ok || !json.sessions) {
        setSwapError(json.error ?? 'These sessions cannot be swapped');
      } else {
        const byId = new Map(json.sessions.map((s) => [s.id, s]));
        updateLocal((prev) => prev.map((s) => byId.get(s.id) ?? s));
      }
    } catch {
      setSwapError('Something went wrong. Please try again.');
    } finally {
      setSwapping(false);
      setSelectedId(null);
    }
  }

  const isUnplanned = week.status === 'planning';

  return (
    <>
      <Sheet onClose={onClose}>
        <div className="pt-1">
          <div className="mb-3.5 flex items-start justify-between">
            <div>
              <div className="text-[17px] font-extrabold text-ld-text">
                {dayLabel(day)}
                {isToday ? ' · Today' : ''}
              </div>
              <div className="mt-1 text-[12px] text-ld-text-muted">
                Week of {week.week_start}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-ld-border bg-ld-surface-high"
              aria-label="Close"
            >
              <X size={13} className="text-ld-text-sub" />
            </button>
          </div>
          <Divider />

          {weekSessions === null ? (
            <div className="py-6 text-center text-[14px] text-ld-text-sub">
              {isUnplanned
                ? "This week hasn't been planned yet."
                : 'No session data for this week.'}
              {isUnplanned && onPlanWeek && (
                <button
                  type="button"
                  onClick={onPlanWeek}
                  className="mt-4 block w-full rounded-2xl bg-ld-orange py-3.5 text-[13px] font-extrabold text-white"
                >
                  Plan this week →
                </button>
              )}
            </div>
          ) : daySessions.length === 0 ? (
            <div className="py-6 text-center text-[14px] text-ld-text-sub">
              {isUnplanned
                ? "This week hasn't been planned yet."
                : 'Rest day — no sessions.'}
            </div>
          ) : (
            <>
              {canReorder && selectedId !== null && (
                <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-ld-amber/40 bg-ld-amber-dim px-3.5 py-2.5">
                  <Shuffle size={13} className="text-ld-amber" />
                  <span className="text-[12px] font-semibold text-ld-amber">
                    Tap another card to swap, or the same card to cancel.
                  </span>
                </div>
              )}
              {swapError && (
                <p className="mb-3 text-[12px] text-ld-red" role="alert">
                  {swapError}
                </p>
              )}
              <div className="flex flex-col gap-2">
                {daySessions.map((session) => {
                  const category = categoryById.get(session.category_id);
                  if (!category) return null;
                  const mode = getCategoryMode(category);
                  const isSel = selectedId === session.id;
                  const isTarget = selectedId !== null && !isSel;

                  return (
                    <div
                      key={session.id}
                      className="overflow-hidden rounded-2xl border-2 p-3.5 transition-colors"
                      style={{
                        background: isSel
                          ? `${category.color}22`
                          : isTarget
                            ? 'var(--ld-surface-pop)'
                            : 'var(--ld-surface-high)',
                        borderColor: isSel
                          ? category.color
                          : isTarget
                            ? 'var(--ld-border-bright)'
                            : 'var(--ld-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (canReorder) void handleTap(session.id);
                          else openDetail(session);
                        }}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <div
                          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border"
                          style={{
                            background:
                              category.color_dim ?? `${category.color}18`,
                            borderColor: `${category.color}44`,
                          }}
                        >
                          <CategoryGlyph
                            icon={category.icon}
                            color={category.color}
                            size={16}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 truncate text-[13px] font-bold text-ld-text">
                            {session.title}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {session.planned_duration_min != null &&
                              session.planned_duration_min > 0 && (
                                <span className="text-[11px] text-ld-text-sub">
                                  {session.planned_duration_min} min
                                </span>
                              )}
                            {mode === 'ai' && (
                              <Pill label="AI" color={category.color} />
                            )}
                            {mode === 'seeded' && (
                              <Pill label="SEEDED" color={category.color} />
                            )}
                            {mode === 'tracked' && (
                              <Pill
                                label={`${category.sessions_per_week}×/wk`}
                                color={category.color}
                              />
                            )}
                          </div>
                        </div>
                        {isSel && (
                          <Pill label="SELECTED" color={category.color} />
                        )}
                        {isTarget && (
                          <Shuffle size={14} className="text-ld-text-muted" />
                        )}
                        {session.completed && !isSel && !isTarget && (
                          <Check size={14} className="text-ld-green" />
                        )}
                      </button>
                      <div className="mt-2.5 flex justify-end gap-2 border-t border-ld-border pt-2.5">
                        <button
                          type="button"
                          onClick={() => openDetail(session)}
                          className="flex items-center gap-1.5 rounded-lg border border-ld-border px-3 py-1 text-[11px] text-ld-text-sub"
                        >
                          <Eye size={12} />
                          Details
                        </button>
                        {canReorder && !isSel && (
                          <button
                            type="button"
                            onClick={() => setMovingSession(session)}
                            className="flex items-center gap-1.5 rounded-lg border border-ld-border px-3 py-1 text-[11px] text-ld-text-sub"
                          >
                            Move to another day
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {canReorder && daySessions.length > 1 && selectedId === null && (
                <div className="mt-3 flex items-center justify-center gap-1.5 py-2">
                  <span className="text-[11px] text-ld-text-muted">
                    Tap two sessions to swap order
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {movingSession &&
          weekSessions &&
          (() => {
            const category = categoryById.get(movingSession.category_id);
            if (!category) return null;
            return (
              <MoveSheet
                session={movingSession}
                category={category}
                categories={categories}
                weekSessions={weekSessions}
                week={week}
                fromDay={day}
                todayDayOfWeek={todayDayOfWeek}
                onMove={(newDay) => {
                  updateLocal((prev) =>
                    prev.map((s) =>
                      s.id === movingSession.id
                        ? { ...s, day_of_week: newDay }
                        : s
                    )
                  );
                  setMovingSession(null);
                }}
                onClose={() => setMovingSession(null)}
              />
            );
          })()}
      </Sheet>

      {detailSheet &&
        (() => {
          const category = categoryById.get(detailSheet.session.category_id);
          if (!category) return null;
          if (detailSheet.type === 'binary') {
            return (
              <BinarySheet
                session={detailSheet.session}
                category={category}
                readOnly={!canLog}
                onClose={() => setDetailSheet(null)}
                onSaved={(updated) => {
                  updateLocal((prev) =>
                    prev.map((s) => (s.id === updated.id ? updated : s))
                  );
                  setDetailSheet(null);
                }}
              />
            );
          }
          if (detailSheet.type === 'tracked') {
            return (
              <TrackedSessionSheet
                session={detailSheet.session}
                category={category}
                readOnly={!canLog}
                onClose={() => setDetailSheet(null)}
                onSaved={(updated) => {
                  updateLocal((prev) =>
                    prev.map((s) => (s.id === updated.id ? updated : s))
                  );
                  setDetailSheet(null);
                }}
              />
            );
          }
          return (
            <AiSessionSheet
              session={detailSheet.session}
              category={category}
              readOnly={!canLog}
              onClose={() => setDetailSheet(null)}
              onUpdate={(updated) => {
                updateLocal((prev) =>
                  prev.map((s) => (s.id === updated.id ? updated : s))
                );
                setDetailSheet({ type: 'ai', session: updated });
              }}
            />
          );
        })()}
    </>
  );
}
