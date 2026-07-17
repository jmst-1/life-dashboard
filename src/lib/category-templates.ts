import type { TrackingType } from '@/types';

export type CategoryTemplateId =
  | 'cycling'
  | 'strength'
  | 'mobility'
  | 'morning_stretch'
  | 'custom';

export type CategoryIconKey =
  | 'bike'
  | 'dumbbell'
  | 'person-standing'
  | 'sunrise'
  | 'footprints'
  | 'waves'
  | 'flame'
  | 'heart-pulse'
  | 'timer'
  | 'clipboard-list'
  | 'mountain'
  | 'activity'
  | 'stretch-horizontal'
  | 'target'
  | 'zap'
  | 'trophy'
  | 'medal'
  | 'music'
  | 'book-open'
  | 'coffee'
  | 'pencil'
  | 'gamepad-2'
  | 'snowflake'
  | 'sun'
  | 'moon'
  | 'tree-pine'
  | 'wind'
  | 'sailboat';

export type CategoryTemplateDefaults = {
  name: string;
  icon: CategoryIconKey;
  color: string;
  tracking_type: TrackingType;
  ai_enabled: boolean;
  affects_nutrition: boolean;
  nutrition_met: number;
  nutrition_hard_threshold_min: number;
  coach_context: Record<string, unknown>;
};

export type CategoryTemplate = {
  id: CategoryTemplateId;
  name: string;
  description: string;
  defaults: CategoryTemplateDefaults;
};

export const CATEGORY_ICON_PRESETS: readonly CategoryIconKey[] = [
  'bike',
  'dumbbell',
  'person-standing',
  'sunrise',
  'footprints',
  'waves',
  'flame',
  'heart-pulse',
  'timer',
  'clipboard-list',
  'mountain',
  'activity',
  'stretch-horizontal',
  'target',
  'zap',
  'trophy',
  'medal',
  'music',
  'book-open',
  'coffee',
  'pencil',
  'gamepad-2',
  'snowflake',
  'sun',
  'moon',
  'tree-pine',
  'wind',
  'sailboat',
] as const;

const ICON_KEY_SET = new Set<string>(CATEGORY_ICON_PRESETS);

const LEGACY_EMOJI_TO_ICON: Record<string, CategoryIconKey> = {
  '🚴': 'bike',
  '🏋️': 'dumbbell',
  '🧘': 'person-standing',
  '🌅': 'sunrise',
  '🏃': 'footprints',
  '🏊': 'waves',
  '🔥': 'flame',
  '💪': 'dumbbell',
  '📋': 'clipboard-list',
  '🎵': 'music',
  '📚': 'book-open',
  '⚡': 'zap',
  '🏔️': 'mountain',
  '❄️': 'snowflake',
  '☀️': 'sun',
  '🎯': 'target',
};

export function normalizeCategoryIcon(icon: string): CategoryIconKey {
  if (ICON_KEY_SET.has(icon)) {
    return icon as CategoryIconKey;
  }
  return LEGACY_EMOJI_TO_ICON[icon] ?? 'clipboard-list';
}

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    id: 'cycling',
    name: 'Cycling',
    description: 'AI-coached weekly rides with zone targets',
    defaults: {
      name: 'Cycling',
      icon: 'bike',
      color: '#F97316',
      tracking_type: 'ai_plan',
      ai_enabled: true,
      affects_nutrition: true,
      nutrition_met: 8,
      nutrition_hard_threshold_min: 90,
      coach_context: {},
    },
  },
  {
    id: 'strength',
    name: 'Strength',
    description: 'Full routines: exercises, sets, reps',
    defaults: {
      name: 'Strength',
      icon: 'dumbbell',
      color: '#8B5CF6',
      tracking_type: 'ai_plan',
      ai_enabled: true,
      affects_nutrition: true,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    },
  },
  {
    id: 'mobility',
    name: 'Mobility',
    description: 'Daily recovery sequences, matched to your training',
    defaults: {
      name: 'Mobility',
      icon: 'person-standing',
      color: '#06B6D4',
      tracking_type: 'random_pick',
      ai_enabled: false,
      affects_nutrition: false,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    },
  },
  {
    id: 'morning_stretch',
    name: 'Morning Stretch',
    description: 'A short wake-up routine every morning',
    defaults: {
      name: 'Morning Stretch',
      icon: 'sunrise',
      color: '#F59E0B',
      tracking_type: 'random_pick',
      ai_enabled: false,
      affects_nutrition: false,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    },
  },
];

export const CUSTOM_CATEGORY_DEFAULTS: CategoryTemplateDefaults = {
  name: '',
  icon: 'clipboard-list',
  color: '#94a3b8',
  tracking_type: 'ai_plan',
  ai_enabled: true,
  affects_nutrition: false,
  nutrition_met: 6,
  nutrition_hard_threshold_min: 60,
  coach_context: {},
};

export const CATEGORY_COLOR_PRESETS = [
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#6366F1',
  '#3B82F6',
  '#06B6D4',
  '#14B8A6',
  '#22C55E',
  '#84CC16',
  '#F59E0B',
  '#EAB308',
  '#A855F7',
  '#F43F5E',
  '#64748B',
  '#94a3b8',
] as const;

const NUTRITION_LOCKED_TEMPLATE_IDS: CategoryTemplateId[] = [
  'mobility',
  'morning_stretch',
];

export function lockNutritionToggle(
  templateId: CategoryTemplateId | null | undefined
): boolean {
  if (!templateId) return false;
  return NUTRITION_LOCKED_TEMPLATE_IDS.includes(templateId);
}

export function formatTrackingType(type: TrackingType): string {
  switch (type) {
    case 'ai_plan':
      return 'AI plan';
    case 'random_pick':
      return 'Random pick';
    case 'session':
      return 'Session';
    case 'log_only':
      return 'Log only';
    case 'count':
      return 'Count';
    default:
      return type;
  }
}

export function getTemplateById(
  id: CategoryTemplateId
): CategoryTemplate | undefined {
  return CATEGORY_TEMPLATES.find((t) => t.id === id);
}
