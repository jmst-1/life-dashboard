import type { Category, TrackingType } from '@/types';
import {
  normalizeCategoryIcon,
  type CategoryTemplateDefaults,
} from '@/lib/category-templates';

export type CategoryFormValues = {
  name: string;
  icon: string;
  color: string;
  tracking_type: TrackingType;
  ai_enabled: boolean;
  affects_nutrition: boolean;
  nutrition_met: number;
  nutrition_hard_threshold_min: number;
  coaching_brief: string;
};

export function categoryFormValuesFromDefaults(
  defaults: CategoryTemplateDefaults
): CategoryFormValues {
  return {
    name: defaults.name,
    icon: defaults.icon,
    color: defaults.color,
    tracking_type: defaults.tracking_type,
    ai_enabled: defaults.ai_enabled,
    affects_nutrition: defaults.affects_nutrition,
    nutrition_met: defaults.nutrition_met,
    nutrition_hard_threshold_min: defaults.nutrition_hard_threshold_min,
    coaching_brief:
      typeof defaults.coach_context.coaching_brief === 'string'
        ? defaults.coach_context.coaching_brief
        : '',
  };
}

export function categoryFormValuesFromCategory(
  category: Category
): CategoryFormValues {
  return {
    name: category.name,
    icon: normalizeCategoryIcon(category.icon),
    color: category.color,
    tracking_type: category.tracking_type,
    ai_enabled: category.ai_enabled,
    affects_nutrition: category.affects_nutrition,
    nutrition_met: category.nutrition_met,
    nutrition_hard_threshold_min: category.nutrition_hard_threshold_min,
    coaching_brief:
      typeof category.coach_context?.coaching_brief === 'string'
        ? category.coach_context.coaching_brief
        : '',
  };
}
