import { dayLabel } from '@/lib/plan-context';
import type { DayType, NutritionPlan } from '@/types';

const DAY_TYPE_STYLES: Record<DayType, string> = {
  hard: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  moderate: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  rest: 'bg-gray-700/60 text-gray-400 border-gray-600',
};

const DAY_TYPE_LABEL: Record<DayType, string> = {
  hard: 'Hard',
  moderate: 'Moderate',
  rest: 'Rest',
};

type NutritionCardProps = {
  plan: NutritionPlan;
  showActions?: boolean;
  showMealBrief?: boolean;
  briefLoading?: boolean;
  recalcLoading?: boolean;
  onRegenerateBrief?: () => void;
  onRecalculate?: () => void;
};

export function NutritionCard({
  plan,
  showActions = false,
  showMealBrief = true,
  briefLoading = false,
  recalcLoading = false,
  onRegenerateBrief,
  onRecalculate,
}: NutritionCardProps) {
  const dayMap = plan.macro_guide.day_map;
  const dayTypes = plan.macro_guide.day_types;
  const busy = briefLoading || recalcLoading;

  return (
    <div className="rounded border border-gray-700 bg-gray-900 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Nutrition</h3>
        {plan.race_week && (
          <p className="mt-1 text-xs text-orange-300">
            Race week — fueling for performance, not a deficit
          </p>
        )}
      </div>

      <ul className="grid grid-cols-7 gap-1">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => {
          const type = (dayMap[String(d)] ?? 'rest') as DayType;
          return (
            <li
              key={d}
              className={`rounded border px-1 py-2 text-center ${DAY_TYPE_STYLES[type]}`}
            >
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                {dayLabel(d)}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold leading-tight">
                {DAY_TYPE_LABEL[type]}
              </p>
            </li>
          );
        })}
      </ul>

      <ul className="space-y-2">
        {(['hard', 'moderate', 'rest'] as DayType[]).map((type) => {
          const macros = dayTypes[type];
          return (
            <li
              key={type}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-gray-800 pt-2 text-sm"
            >
              <span className="font-medium text-white">
                {DAY_TYPE_LABEL[type]} day
              </span>
              <span className="text-gray-300 tabular-nums">
                {macros.calories} kcal · {macros.protein_g}g P ·{' '}
                {macros.carbs_g}g C · {macros.fat_g}g F
              </span>
            </li>
          );
        })}
      </ul>

      {showMealBrief && (
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Meal prep brief
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
            {plan.meal_prep_brief}
          </p>
        </div>
      )}

      {showActions && (
        <div className="flex flex-wrap gap-3 border-t border-gray-800 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={onRegenerateBrief}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-white disabled:opacity-50"
          >
            {briefLoading ? 'Regenerating…' : 'Regenerate brief'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRecalculate}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-white disabled:opacity-50"
          >
            {recalcLoading ? 'Recalculating…' : 'Recalculate'}
          </button>
        </div>
      )}
    </div>
  );
}
