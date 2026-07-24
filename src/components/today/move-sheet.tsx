'use client';

import { useState } from 'react';
import { ChevronRight, Info } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { Pill } from '@/components/ui/pill';
import { Sheet } from '@/components/ui/sheet';
import { classifyDayType, type DaySessions } from '@/lib/nutrition';
import { dayLabel } from '@/lib/plan-context';
import type { Category, Session, Week } from '@/types';

type MoveSheetProps = {
  session: Session;
  category: Category;
  weekSessions: Session[];
  categories: Category[];
  week?: Week | null;
  fromDay: number;
  todayDayOfWeek?: number;
  onMove: (dayOfWeek: number) => void;
  onClose: () => void;
};

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

const DAY_TYPE_LABEL: Record<string, string> = {
  hard: 'Hard',
  moderate: 'Mod',
  rest: 'Rest',
};

const DAY_TYPE_CLASS: Record<string, string> = {
  hard: 'text-ld-orange',
  moderate: 'text-ld-teal',
  rest: 'text-ld-text-muted',
};

export function MoveSheet({
  session,
  category,
  weekSessions,
  categories,
  week,
  fromDay,
  todayDayOfWeek,
  onMove,
  onClose,
}: MoveSheetProps) {
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  async function handleMove(day: number) {
    if (moving || day === fromDay) return;
    setMoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_of_week: day }),
      });
      if (res.ok) {
        onMove(day);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed to move session');
      }
    } catch {
      setError('Failed to move session. Please try again.');
    } finally {
      setMoving(false);
    }
  }

  return (
    <Sheet onClose={onClose}>
      <div className="pt-1">
        <div className="mb-1.5 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border"
            style={{
              background: category.color_dim ?? `${category.color}18`,
              borderColor: `${category.color}55`,
            }}
          >
            <CategoryGlyph icon={category.icon} color={category.color} size={17} />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-ld-text">
              Move session
            </div>
            <div className="mt-0.5 text-[11px] text-ld-text-sub">
              {session.title}
              {week ? ` · Week of ${week.week_start}` : ''}
            </div>
          </div>
        </div>
        {error && (
          <div className="mb-3 rounded-[10px] border border-ld-red/40 bg-ld-red-dim px-3 py-2 text-[12px] text-ld-red">
            {error}
          </div>
        )}
        <div className="my-3.5 flex items-center gap-2 rounded-[10px] border border-ld-border bg-ld-surface-high px-3 py-2">
          <Info size={12} className="shrink-0 text-ld-text-muted" />
          <span className="text-[11px] text-ld-text-muted">
            Moving from{' '}
            <span className="font-bold text-ld-text">
              {dayLabel(fromDay)}
            </span>
            . Tap a destination day.
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {DAYS.map((day) => {
            const isFrom = day === fromDay;
            const isToday = day === todayDayOfWeek;
            const daySessions = weekSessions.filter(
              (s) => s.day_of_week === day && s.id !== session.id
            );
            const daySessionsWithCat: DaySessions = daySessions
              .map((s) => {
                const cat = categoryById.get(s.category_id);
                return cat ? { session: s, category: cat } : null;
              })
              .filter((x): x is DaySessions[number] => x !== null);
            const dayType = classifyDayType(daySessionsWithCat);
            const sameCatSessions = daySessions.filter(
              (s) => s.category_id === session.category_id
            );

            return (
              <button
                key={day}
                type="button"
                disabled={isFrom || moving}
                onClick={() => handleMove(day)}
                className="flex items-center gap-3.5 rounded-[14px] border p-3.5 text-left transition-colors"
                style={{
                  background: isFrom
                    ? 'var(--ld-surface-pop)'
                    : 'var(--ld-surface-high)',
                  borderColor: isFrom
                    ? `${category.color}55`
                    : 'var(--ld-border)',
                  cursor: isFrom ? 'default' : 'pointer',
                }}
              >
                <div className="w-11 shrink-0">
                  <div
                    className={`text-[12px] font-extrabold ${
                      isToday ? 'text-ld-orange' : 'text-ld-text'
                    }`}
                  >
                    {dayLabel(day)}
                  </div>
                  <div
                    className={`mt-0.5 text-[10px] font-bold ${DAY_TYPE_CLASS[dayType]}`}
                  >
                    {DAY_TYPE_LABEL[dayType]}
                  </div>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {daySessions.length === 0 ? (
                    <span className="text-[11px] text-ld-text-muted">
                      Empty
                    </span>
                  ) : (
                    daySessions.map((s) => {
                      const cat = categoryById.get(s.category_id);
                      if (!cat) return null;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-1 rounded-[6px] border px-1.5 py-0.5"
                          style={{
                            background: `${cat.color_dim ?? cat.color}33`,
                            borderColor: `${cat.color}33`,
                          }}
                        >
                          <CategoryGlyph icon={cat.icon} color={cat.color} size={9} />
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: cat.color }}
                          >
                            {cat.name}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                {isFrom ? (
                  <Pill label="HERE" color={category.color} />
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    {sameCatSessions.length > 0 && (
                      <div
                        title="Same category already here"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: category.color }}
                      />
                    )}
                    <ChevronRight size={14} className="text-ld-text-muted" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-1.5 px-1 py-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: category.color }}
          />
          <span className="text-[11px] text-ld-text-muted">
            This category already exists on that day
          </span>
        </div>
      </div>
    </Sheet>
  );
}
