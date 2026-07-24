'use client';

import { differenceInCalendarWeeks, format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Moon,
  Plus,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { AheadDaySheet } from '@/components/ahead/ahead-day-sheet';
import { PlanSheet } from '@/components/ahead/plan-sheet';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { useSetHeader } from '@/components/layout/header-context';
import { Pill } from '@/components/ui/pill';
import { classifyDayType, type DaySessions } from '@/lib/nutrition';
import { dayLabel } from '@/lib/plan-context';
import { isRestSession } from '@/lib/session-utils';
import type { Category, GoalEvent, Session, Week } from '@/types';

type AheadViewProps = {
  currentWeek: Week;
  weeks: Week[];
  categories: Category[];
  goalEvents: GoalEvent[];
  sessionsByWeekId: Record<string, Session[]>;
  currentWeightKg: number | null;
  initialPlanOpen: boolean;
};

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const DAY_TYPE_LABEL: Record<string, string> = {
  hard: 'Hard',
  moderate: 'Mod',
  rest: '—',
};

const DAY_TYPE_CLASS: Record<string, string> = {
  hard: 'text-ld-orange',
  moderate: 'text-ld-teal',
  rest: 'text-ld-text-muted',
};

function todayDayOfWeekMon0(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function canPlanWeek(week: Week, currentWeekStart: string): boolean {
  return week.status === 'planning' && week.week_start >= currentWeekStart;
}

export function AheadView({
  currentWeek,
  weeks,
  categories,
  goalEvents,
  sessionsByWeekId: initialSessionsByWeekId,
  currentWeightKg,
  initialPlanOpen,
}: AheadViewProps) {
  const [sessionsByWeekId, setSessionsByWeekId] = useState(
    initialSessionsByWeekId
  );
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(
    currentWeek.id
  );
  const [daySheet, setDaySheet] = useState<{ week: Week; day: number } | null>(
    null
  );
  const [planWeek, setPlanWeek] = useState<Week | null>(
    initialPlanOpen && canPlanWeek(currentWeek, currentWeek.week_start)
      ? currentWeek
      : null
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const currentIndex = weeks.findIndex((w) => w.id === currentWeek.id);
  const nextWeek =
    currentIndex >= 0 ? weeks[currentIndex + 1] ?? null : null;
  const isSunday = new Date().getDay() === 0;
  const showSundayNudge =
    isSunday && !!nextWeek && canPlanWeek(nextWeek, currentWeek.week_start);

  const nearestUnplanned =
    weeks.find((w) => canPlanWeek(w, currentWeek.week_start)) ?? null;

  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const upcomingGoalEvents = goalEvents
    .filter((g) => g.event_date >= todayIso)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 3);

  const monthLabel = format(parseISO(currentWeek.week_start), 'MMMM yyyy');
  const todayDow = todayDayOfWeekMon0();

  function sessionsForWeek(weekId: string): Session[] {
    return sessionsByWeekId[weekId] ?? [];
  }

  function sessionsByDayForWeek(weekId: string): Record<number, Session[]> {
    const byDay: Record<number, Session[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    for (const s of sessionsForWeek(weekId)) {
      if (isRestSession(s)) continue;
      if (s.day_of_week >= 0 && s.day_of_week <= 6) {
        byDay[s.day_of_week].push(s);
      }
    }
    return byDay;
  }

  function updateWeekSessions(weekId: string, updated: Session[]) {
    setSessionsByWeekId((prev) => ({ ...prev, [weekId]: updated }));
  }

  useSetHeader({ title: 'Ahead' });

  return (
    <div className="px-5 pt-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="text-[13px] text-ld-text-sub">{monthLabel}</div>
        {nearestUnplanned && (
          <button
            type="button"
            onClick={() => setPlanWeek(nearestUnplanned)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ld-orange px-4 py-2.5 text-[13px] font-extrabold text-white"
          >
            <Sparkles size={13} />
            Plan week
          </button>
        )}
      </div>

      {showSundayNudge && nextWeek && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-ld-orange/30 bg-ld-orange-dim/60 px-4 py-3">
          <Moon size={16} className="shrink-0 text-ld-orange" />
          <div className="flex-1">
            <div className="text-[13px] font-bold text-ld-orange">
              Next week isn&apos;t planned yet
            </div>
            <div className="text-[11px] text-ld-text-sub">
              Sunday evening — good time to plan ahead.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPlanWeek(nextWeek)}
            className="shrink-0 rounded-lg bg-ld-orange px-3.5 py-2 text-[12px] font-bold text-white"
          >
            Plan →
          </button>
        </div>
      )}

      {upcomingGoalEvents.map((event) => {
        const weeksOut = Math.max(
          0,
          differenceInCalendarWeeks(parseISO(event.event_date), new Date())
        );
        return (
          <div
            key={event.id}
            className="mb-4 flex items-center gap-3 rounded-2xl border border-ld-amber/40 bg-ld-amber-dim px-4 py-3"
          >
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-ld-amber/50 bg-ld-amber/15">
              <Trophy size={16} className="text-ld-amber" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-ld-amber">
                {event.label}
              </div>
              <div className="text-[11px] text-ld-text-sub">
                {format(parseISO(event.event_date), 'd MMM')}
                {event.distances.length > 0
                  ? ` · ${event.distances.join(' / ')}`
                  : ''}
                {` · ${weeksOut === 0 ? 'this week' : `${weeksOut} week${weeksOut === 1 ? '' : 's'} out`}`}
              </div>
            </div>
          </div>
        );
      })}

      <div className="mb-8 flex flex-col gap-2.5">
        {weeks.map((week) => {
          const isExpanded = expandedWeekId === week.id;
          const isCurrent = week.id === currentWeek.id;
          const isUnplanned = week.status === 'planning';
          const plannable = canPlanWeek(week, currentWeek.week_start);
          const weekSessions = sessionsForWeek(week.id);
          const byDay = sessionsByDayForWeek(week.id);
          const involvedCategoryIds = !isUnplanned
            ? new Set(weekSessions.map((s) => s.category_id))
            : week.score_breakdown
              ? new Set(Object.keys(week.score_breakdown))
              : new Set<string>();

          return (
            <div
              key={week.id}
              className="overflow-hidden rounded-2xl border bg-ld-surface"
              style={{
                borderColor: isCurrent
                  ? 'var(--ld-orange)'
                  : 'var(--ld-border)',
              }}
            >
              <div className="flex w-full items-center gap-2 px-4 py-3.5">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedWeekId(isExpanded ? null : week.id)
                  }
                  className="flex min-w-0 flex-1 items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {isCurrent && (
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-ld-orange" />
                    )}
                    <div className="text-left">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span
                          className={`text-[13px] font-bold ${
                            isCurrent ? 'text-ld-text' : 'text-ld-text-sub'
                          }`}
                        >
                          Week of {format(parseISO(week.week_start), 'MMM d')}
                        </span>
                        {isCurrent && (
                          <Pill label="NOW" color="var(--ld-orange)" />
                        )}
                        {!isCurrent && week.status === 'complete' && (
                          <Pill
                            label={`${week.score_overall ?? 0} pts`}
                            color="var(--ld-text-muted)"
                          />
                        )}
                        {!isCurrent && isUnplanned && (
                          <Pill
                            label="UNPLANNED"
                            color="var(--ld-text-muted)"
                          />
                        )}
                        {!isCurrent &&
                          week.status === 'active' &&
                          !isUnplanned && (
                            <Pill label="PLANNED" color="var(--ld-green)" />
                          )}
                      </div>
                      <div className="text-[11px] text-ld-text-muted">
                        {format(parseISO(week.week_start), 'MMM d')} –{' '}
                        {format(parseISO(week.week_end), 'MMM d')}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {!isUnplanned && involvedCategoryIds.size > 0 && (
                      <div className="flex gap-1">
                        {categories
                          .filter((c) => involvedCategoryIds.has(c.id))
                          .map((c) => (
                            <div
                              key={c.id}
                              className="h-[7px] w-[7px] rounded-full"
                              style={{ background: c.color }}
                            />
                          ))}
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-ld-text-muted" />
                    ) : (
                      <ChevronRight size={14} className="text-ld-text-muted" />
                    )}
                  </div>
                </button>
                {plannable && (
                  <button
                    type="button"
                    onClick={() => setPlanWeek(week)}
                    className="shrink-0 rounded-lg bg-ld-orange px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    Plan →
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-ld-border px-3 py-3.5">
                  {isUnplanned ? (
                    <div>
                      {plannable ? (
                        <>
                          <div className="mb-3 flex gap-1">
                            {DAYS.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setPlanWeek(week)}
                                className="flex flex-1 flex-col items-center gap-1.5 rounded-[10px] border border-dashed border-ld-border bg-ld-surface-high py-2"
                              >
                                <span className="text-[8px] font-bold tracking-wide text-ld-text-muted">
                                  {dayLabel(d)}
                                </span>
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ld-border">
                                  <Plus
                                    size={10}
                                    className="text-ld-text-muted"
                                  />
                                </span>
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPlanWeek(week)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ld-orange py-3 text-[13px] font-extrabold text-white"
                          >
                            <Sparkles size={13} />
                            Generate week plan
                          </button>
                        </>
                      ) : (
                        <p className="py-4 text-center text-[13px] text-ld-text-sub">
                          Past weeks can&apos;t be planned.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1">
                        {DAYS.map((d) => {
                          const daySessionsForType: DaySessions = byDay[d]
                            .map((s) => {
                              const cat = categoryById.get(s.category_id);
                              return cat
                                ? { session: s, category: cat }
                                : null;
                            })
                            .filter(
                              (x): x is DaySessions[number] => x !== null
                            );
                          const dayType = classifyDayType(daySessionsForType);
                          const isToday = isCurrent && d === todayDow;
                          const daySessions = byDay[d];

                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDaySheet({ week, day: d })}
                              className="flex flex-1 flex-col items-center gap-1.5 rounded-[10px] py-2"
                              style={{
                                background: isToday
                                  ? 'var(--ld-surface-pop)'
                                  : 'transparent',
                                border: isToday
                                  ? '1px solid var(--ld-orange)'
                                  : '1px solid transparent',
                              }}
                            >
                              <span
                                className={`text-[8px] font-bold tracking-wide ${
                                  isToday
                                    ? 'text-ld-orange'
                                    : 'text-ld-text-muted'
                                }`}
                              >
                                {dayLabel(d)}
                              </span>
                              <span
                                className={`text-[7px] font-bold ${DAY_TYPE_CLASS[dayType]}`}
                              >
                                {DAY_TYPE_LABEL[dayType]}
                              </span>
                              <div className="flex flex-col items-center gap-1">
                                {daySessions.length === 0 ? (
                                  <span className="text-[9px] text-ld-text-muted">
                                    —
                                  </span>
                                ) : (
                                  daySessions.slice(0, 3).map((s) => {
                                    const cat = categoryById.get(
                                      s.category_id
                                    );
                                    if (!cat) return null;
                                    return (
                                      <div
                                        key={s.id}
                                        className="relative flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border"
                                        style={{
                                          background:
                                            cat.color_dim ?? `${cat.color}18`,
                                          borderColor: `${cat.color}${
                                            s.completed ? '88' : '44'
                                          }`,
                                        }}
                                      >
                                        <CategoryGlyph
                                          icon={cat.icon}
                                          color={cat.color}
                                          size={10}
                                        />
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2.5 flex items-center justify-center gap-1.5">
                        <span className="text-[10px] text-ld-text-muted">
                          Tap a day to view session details
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {daySheet && (
        <AheadDaySheet
          week={daySheet.week}
          day={daySheet.day}
          categories={categories}
          weekSessions={
            daySheet.week.status === 'planning'
              ? null
              : sessionsForWeek(daySheet.week.id)
          }
          currentWeekStart={currentWeek.week_start}
          todayDayOfWeek={todayDow}
          onClose={() => setDaySheet(null)}
          onSessionsUpdate={(updated) =>
            updateWeekSessions(daySheet.week.id, updated)
          }
          onPlanWeek={
            canPlanWeek(daySheet.week, currentWeek.week_start)
              ? () => {
                  setPlanWeek(daySheet.week);
                  setDaySheet(null);
                }
              : undefined
          }
        />
      )}

      {planWeek && canPlanWeek(planWeek, currentWeek.week_start) && (
        <PlanSheet
          week={planWeek}
          categories={categories}
          currentWeightKg={currentWeightKg}
          onClose={() => setPlanWeek(null)}
          onDone={() => {
            setPlanWeek(null);
            window.location.assign('/ahead');
          }}
        />
      )}
    </div>
  );
}
