'use client';

import { useState } from 'react';
import { dayLabel } from '@/lib/plan-context';
import type { DayType, NutritionPlan } from '@/types';

const DAY_TYPE_LABEL: Record<DayType, string> = {
  hard: 'Hard',
  moderate: 'Moderate',
  rest: 'Rest',
};

type WeekDayMacrosProps = {
  plan: NutritionPlan;
  selectedDay: number;
};

export function WeekDayMacros({ plan, selectedDay }: WeekDayMacrosProps) {
  const [showBrief, setShowBrief] = useState(false);
  const dayMap = plan.macro_guide.day_map;
  const dayTypes = plan.macro_guide.day_types;
  const type = (dayMap[String(selectedDay)] ?? 'rest') as DayType;
  const macros = dayTypes[type];

  return (
    <div className="rounded border border-gray-700 bg-gray-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Nutrition</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {dayLabel(selectedDay)} · {DAY_TYPE_LABEL[type]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBrief((v) => !v)}
          className="shrink-0 text-xs text-gray-400 underline underline-offset-2 hover:text-white"
        >
          {showBrief ? 'Hide meal prep' : 'Meal prep'}
        </button>
      </div>

      <p className="text-sm text-gray-200 tabular-nums">
        {macros.calories} kcal · {macros.protein_g}g P · {macros.carbs_g}g C ·{' '}
        {macros.fat_g}g F
      </p>

      {showBrief && (
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Meal prep brief
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
            {plan.meal_prep_brief}
          </p>
        </div>
      )}
    </div>
  );
}
