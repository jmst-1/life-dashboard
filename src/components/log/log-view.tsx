'use client';

import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CategoryGlyph } from '@/components/categories/category-glyph';
import { useSetHeader } from '@/components/layout/header-context';
import { WeightTrendChart } from '@/components/log/weight-trend-chart';
import { computeWeekScore, scoreBandColor } from '@/lib/week-score';
import type { Category, Session, Week, WeightLog } from '@/types';

type LogViewProps = {
  currentWeek: Week;
  pastWeeks: Week[];
  categories: Category[];
  currentWeekSessions: Session[];
  weightLogs: WeightLog[];
  goalWeightKg: number | null;
};

const MAX_TREND_BAR_HEIGHT = 60;

export function LogView({
  currentWeek,
  pastWeeks,
  categories,
  currentWeekSessions,
  weightLogs,
  goalWeightKg,
}: LogViewProps) {
  const router = useRouter();
  const [expandedWeekId, setExpandedWeekId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const { overall: currentOverall, segments: currentSegments } = useMemo(
    () => computeWeekScore(categories, currentWeekSessions),
    [categories, currentWeekSessions]
  );

  const completedPastWeeks = pastWeeks
    .filter((w) => w.status === 'complete')
    .sort((a, b) => b.week_start.localeCompare(a.week_start));

  const trend = useMemo(() => {
    const lastThree = [...completedPastWeeks].slice(0, 3).reverse();
    return [
      ...lastThree.map((w) => ({
        label: format(parseISO(w.week_start), 'MMM d'),
        score: w.score_overall ?? 0,
        current: false,
      })),
      {
        label: 'This wk',
        score: currentOverall,
        current: true,
      },
    ];
  }, [completedPastWeeks, currentOverall]);

  async function handleCloseWeek() {
    if (closing) return;
    setClosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/weeks/${currentWeek.id}/review`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Failed to close week');
        setClosing(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setClosing(false);
    }
  }

  useSetHeader({ title: 'Log' });

  return (
    <div className="px-5 pt-4">
      <p className="mb-5 text-[13px] text-ld-text-sub">
        Past weeks and trends.
      </p>

      <WeightTrendChart logs={weightLogs} goalWeightKg={goalWeightKg} />

      <div className="mb-5 rounded-2xl border border-ld-border bg-ld-surface p-4">
        <div className="mb-3.5 text-[11px] font-bold tracking-wide text-ld-text-muted">
          SCORE TREND
        </div>
        <div className="flex items-end gap-2.5" style={{ height: 88 }}>
          {trend.map((t, i) => (
            <div
              key={`${t.label}-${i}`}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span
                className="text-[11px] font-bold"
                style={{ color: t.current ? 'var(--ld-orange)' : undefined }}
              >
                <span className={t.current ? '' : 'text-ld-text-sub'}>
                  {t.score}
                </span>
              </span>
              <div
                className="w-full rounded-t-[5px] border"
                style={{
                  height: `${Math.max(4, (t.score / 100) * MAX_TREND_BAR_HEIGHT)}px`,
                  background: t.current
                    ? 'var(--ld-orange)'
                    : 'var(--ld-surface-pop)',
                  borderColor: t.current
                    ? 'var(--ld-orange)'
                    : 'var(--ld-border)',
                }}
              />
              <span className="text-[9px] text-ld-text-muted">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3 rounded-2xl border border-ld-orange/20 bg-ld-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold text-ld-text">
              This week
            </div>
            <div className="text-[11px] text-ld-text-sub">
              {format(parseISO(currentWeek.week_start), 'MMM d')} –{' '}
              {format(parseISO(currentWeek.week_end), 'MMM d')} ·{' '}
              {currentWeek.status === 'active' ? 'In progress' : currentWeek.status}
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-[28px] font-black"
              style={{ color: scoreBandColor(currentOverall) }}
            >
              {currentOverall}
            </div>
            <div className="text-[9px] tracking-wide text-ld-text-muted">
              SCORE
            </div>
          </div>
        </div>
        {currentSegments.length > 0 && (
          <div className="flex gap-1.5">
            {currentSegments.map((seg) => {
              const cat = categoryById.get(seg.categoryId);
              if (!cat) return null;
              return (
                <div
                  key={seg.categoryId}
                  className="flex-1 rounded-[9px] border border-ld-border bg-ld-surface-high py-2 text-center"
                >
                  <CategoryGlyph
                    icon={cat.icon}
                    color={cat.color}
                    size={13}
                    className="mx-auto"
                  />
                  <div className="mt-0.5 text-[8px] text-ld-text-muted">
                    {seg.completedSessions}/{seg.plannedSessions}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {currentWeek.status === 'active' && (
          <button
            type="button"
            onClick={() => void handleCloseWeek()}
            disabled={closing}
            className="mt-3.5 w-full rounded-xl border border-ld-border py-2.5 text-[12px] font-bold text-ld-text-sub disabled:opacity-60"
          >
            {closing ? 'Closing week…' : 'Close week & score'}
          </button>
        )}
        {error && (
          <p className="mt-2 text-[11px] text-ld-red" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="mb-8 flex flex-col gap-2.5">
        {completedPastWeeks.map((week) => {
          const isExpanded = expandedWeekId === week.id;
          const breakdown = week.score_breakdown ?? {};
          return (
            <div
              key={week.id}
              className="overflow-hidden rounded-2xl border border-ld-border bg-ld-surface"
            >
              <button
                type="button"
                onClick={() => setExpandedWeekId(isExpanded ? null : week.id)}
                className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] border border-ld-orange/20 bg-ld-orange-dim">
                  <span className="text-[19px] font-black text-ld-orange">
                    {week.score_overall ?? 0}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="mb-0.5 text-[13px] font-bold text-ld-text">
                    {format(parseISO(week.week_start), 'MMM d')} –{' '}
                    {format(parseISO(week.week_end), 'MMM d')}
                  </div>
                  {week.coach_commentary && (
                    <div className="line-clamp-1 text-[11px] text-ld-text-sub">
                      {week.coach_commentary}
                    </div>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown size={14} className="text-ld-text-muted" />
                ) : (
                  <ChevronRight size={14} className="text-ld-text-muted" />
                )}
              </button>
              {isExpanded && (
                <div className="border-t border-ld-border px-4 py-3.5">
                  {week.coach_commentary && (
                    <p className="mb-3 text-[12px] leading-relaxed text-ld-text-sub">
                      {week.coach_commentary}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(breakdown).map(([categoryId, score]) => {
                      const cat = categoryById.get(categoryId);
                      if (!cat) return null;
                      return (
                        <div
                          key={categoryId}
                          className="flex items-center gap-1.5 rounded-[9px] border px-3 py-2"
                          style={{ borderColor: `${cat.color}33` }}
                        >
                          <CategoryGlyph icon={cat.icon} color={cat.color} size={12} />
                          <span className="text-[11px] text-ld-text-sub">
                            {Math.round(score)}
                          </span>
                        </div>
                      );
                    })}
                    {Object.keys(breakdown).length === 0 && (
                      <span className="text-[12px] text-ld-text-muted">
                        No category breakdown recorded.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {completedPastWeeks.length === 0 && (
          <p className="text-[13px] text-ld-text-sub">
            No completed weeks yet.
          </p>
        )}
      </div>
    </div>
  );
}
