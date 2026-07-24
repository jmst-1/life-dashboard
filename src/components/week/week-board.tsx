'use client';

import { dayLabel } from '@/lib/plan-context';
import type { Category, DayType, NutritionPlan, Session } from '@/types';
import { WeekSessionChip } from './week-session-chip';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const DAY_TYPE_STYLES: Record<DayType, string> = {
  hard: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  moderate: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  rest: 'bg-gray-700/60 text-gray-400 border-gray-600',
};

const DAY_TYPE_LABEL: Record<DayType, string> = {
  hard: 'Hard',
  moderate: 'Mod',
  rest: 'Rest',
};

type WeekBoardProps = {
  sessionsByDay: Record<number, Session[]>;
  categoryById: Map<string, Category>;
  nutritionPlan: NutritionPlan | null;
  todayDayOfWeek: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  todayIso: string;
  canEdit: boolean;
  shufflingId: string | null;
  onOpenSession: (session: Session) => void;
  onShuffleSession: (session: Session) => void;
};

export function WeekBoard({
  sessionsByDay,
  categoryById,
  nutritionPlan,
  todayDayOfWeek,
  selectedDay,
  onSelectDay,
  todayIso,
  canEdit,
  shufflingId,
  onOpenSession,
  onShuffleSession,
}: WeekBoardProps) {
  const dayMap = nutritionPlan?.macro_guide.day_map;

  return (
    <div className="space-y-2">
      {nutritionPlan?.race_week && (
        <p className="text-xs text-orange-300">
          Race week — fueling for performance, not a deficit
        </p>
      )}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => {
          const isToday = day === todayDayOfWeek;
          const isSelected = day === selectedDay;
          const type = dayMap
            ? ((dayMap[String(day)] ?? 'rest') as DayType)
            : null;
          const daySessions = sessionsByDay[day] ?? [];

          return (
            <div
              key={day}
              className={`flex min-w-0 flex-col gap-1 rounded border p-1 ${
                isSelected
                  ? 'border-white/50 bg-gray-900'
                  : 'border-gray-800 bg-gray-950/40'
              } ${isToday && !isSelected ? 'ring-1 ring-white/30' : ''}`}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className="w-full space-y-0.5 text-center"
                aria-pressed={isSelected}
                aria-label={`${dayLabel(day)}${
                  type ? `, ${DAY_TYPE_LABEL[type]}` : ''
                }`}
              >
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    isToday ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {dayLabel(day)}
                </p>
                {type ? (
                  <p
                    className={`rounded border px-0.5 py-0.5 text-[9px] font-semibold leading-tight ${DAY_TYPE_STYLES[type]}`}
                  >
                    {DAY_TYPE_LABEL[type]}
                  </p>
                ) : (
                  <p className="text-[9px] text-gray-600">—</p>
                )}
              </button>

              <ul className="flex flex-col gap-1">
                {daySessions.map((session) => {
                  const category = categoryById.get(session.category_id);
                  if (!category) return null;
                  return (
                    <li key={session.id}>
                      <WeekSessionChip
                        session={session}
                        category={category}
                        todayIso={todayIso}
                        canEdit={canEdit}
                        onOpen={() => onOpenSession(session)}
                        onShuffle={
                          canEdit &&
                          !session.completed &&
                          !session.skipped
                            ? () => onShuffleSession(session)
                            : undefined
                        }
                        shuffleLoading={shufflingId === session.id}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
