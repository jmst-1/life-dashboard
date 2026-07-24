'use client';

import { parseISO } from 'date-fns';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Flame } from 'lucide-react';
import { dayLabel } from '@/lib/plan-context';
import type { DayType, NutritionPlan } from '@/types';

type NutritionTodayCardProps = {
  nutritionPlan: NutritionPlan | null;
  dayIso: string;
  intensityLabel?: string;
  activePhysCatNames: string[];
};

const DAY_TYPE_LABEL: Record<DayType, string> = {
  hard: 'Hard',
  moderate: 'Moderate',
  rest: 'Rest',
};

const DAY_TYPE_CLASS: Record<DayType, string> = {
  hard: 'text-ld-orange',
  moderate: 'text-ld-teal',
  rest: 'text-ld-text-muted',
};

/** Monday=0 .. Sunday=6, matching day_of_week storage. */
function dayOfWeekMon0FromIso(iso: string): number {
  const dow = parseISO(iso).getDay();
  return dow === 0 ? 6 : dow - 1;
}

/** Fallback when meal_prep_summary is missing (legacy plans). */
function fallbackSummaryFromBrief(brief: string): string {
  const cleaned = brief.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned];
  const take = sentences
    .slice(0, 2)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
  if (take.length <= 220) return take;
  return `${take.slice(0, 217).trimEnd()}…`;
}

export function NutritionTodayCard({
  nutritionPlan,
  dayIso,
  intensityLabel,
  activePhysCatNames,
}: NutritionTodayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);

  if (!nutritionPlan) {
    return (
      <div className="mb-4 rounded-2xl border border-ld-border bg-ld-surface p-4">
        <div className="mb-1 text-[11px] font-bold tracking-wide text-ld-text-muted">
          NUTRITION TODAY
        </div>
        <p className="text-[12px] leading-relaxed text-ld-text-sub">
          No nutrition plan generated for this week yet.
        </p>
      </div>
    );
  }

  const dow = dayOfWeekMon0FromIso(dayIso);
  const dayType = (nutritionPlan.macro_guide.day_map[String(dow)] ??
    'rest') as DayType;
  const targets = nutritionPlan.macro_guide.day_types[dayType];
  const label = intensityLabel ?? DAY_TYPE_LABEL[dayType];
  const brief = nutritionPlan.meal_prep_brief?.trim() ?? '';
  const summary =
    nutritionPlan.meal_prep_summary?.trim() ||
    (brief ? fallbackSummaryFromBrief(brief) : '');

  const subtitle =
    activePhysCatNames.length === 0
      ? 'Rest day — maintenance targets'
      : `${label} training · ${activePhysCatNames.join(', ')}`;

  return (
    <div className="mb-4 rounded-2xl border border-ld-border bg-ld-surface p-4">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5 text-[11px] font-bold tracking-wide text-ld-text-muted">
            NUTRITION TODAY
          </div>
          <div className="text-[12px] leading-tight text-ld-text-sub">
            {subtitle}
          </div>
        </div>
        <div className="flex shrink-0 items-baseline gap-1">
          <Flame size={14} className="text-ld-orange" />
          <span className="text-[26px] font-black text-ld-text">
            {targets.calories}
          </span>
          <span className="text-[12px] text-ld-text-sub">kcal</span>
        </div>
      </div>
      <div className="flex gap-2">
        {[
          { label: 'Protein', value: targets.protein_g, className: 'text-ld-orange' },
          { label: 'Carbs', value: targets.carbs_g, className: 'text-ld-teal' },
          { label: 'Fat', value: targets.fat_g, className: 'text-ld-purple' },
        ].map((m) => (
          <div
            key={m.label}
            className="flex-1 rounded-[10px] border border-ld-border bg-ld-surface-high py-2.5 text-center"
          >
            <div className={`text-[16px] font-extrabold ${m.className}`}>
              {m.value}
              <span className="text-[11px]">g</span>
            </div>
            <div className="mt-0.5 text-[10px] text-ld-text-muted">
              {m.label}
            </div>
          </div>
        ))}
      </div>
      {nutritionPlan.race_week && (
        <p className="mt-3 text-[11px] text-ld-orange">
          Race week — fueling for performance, not a deficit.
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          if (expanded) setShowFull(false);
        }}
        className="mt-3.5 flex w-full items-center justify-between rounded-xl border border-ld-border bg-ld-surface-high px-3.5 py-2.5 text-left"
      >
        <span className="text-[12px] font-bold text-ld-text-sub">
          Meal prep plan
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-ld-text-muted" />
        ) : (
          <ChevronRight size={14} className="text-ld-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="scrollbar-none flex gap-1 overflow-x-auto pb-1">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => {
              const dt = (nutritionPlan.macro_guide.day_map[String(d)] ??
                'rest') as DayType;
              const cal = nutritionPlan.macro_guide.day_types[dt].calories;
              const isToday = d === dow;
              return (
                <div
                  key={d}
                  className="min-w-[52px] flex-1 rounded-lg border px-1.5 py-2 text-center"
                  style={{
                    borderColor: isToday
                      ? 'var(--ld-orange)'
                      : 'var(--ld-border)',
                    background: isToday
                      ? 'var(--ld-orange-dim)'
                      : 'var(--ld-surface-high)',
                  }}
                >
                  <div className="text-[9px] font-bold text-ld-text-muted">
                    {dayLabel(d)}
                  </div>
                  <div
                    className={`mt-0.5 text-[10px] font-bold ${DAY_TYPE_CLASS[dt]}`}
                  >
                    {DAY_TYPE_LABEL[dt]}
                  </div>
                  <div className="mt-0.5 text-[11px] font-extrabold text-ld-text">
                    {cal}
                  </div>
                </div>
              );
            })}
          </div>

          {summary ? (
            <p className="text-[13px] leading-relaxed text-ld-text-sub">
              {summary}
            </p>
          ) : (
            <p className="text-[12px] text-ld-text-muted">
              No meal-prep brief for this week.
            </p>
          )}

          {brief && (
            <>
              <button
                type="button"
                onClick={() => setShowFull((v) => !v)}
                className="text-[12px] font-bold text-ld-orange"
              >
                {showFull ? 'Show less' : 'Show full'}
              </button>
              {showFull && (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ld-text-sub">
                  {brief}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
