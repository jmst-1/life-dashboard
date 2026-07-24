import type {
  CategoryMode,
  EffortType,
  TaskTemplateItem,
  TrackingType,
} from '@/types';
import { trackingTypeFromMode } from '@/lib/category-mode';
import { PRODUCT_CONFIG, PRODUCT_MODE } from '@/lib/product-config';

export type CategoryTemplateId =
  | 'cycling'
  | 'strength'
  | 'mobility'
  | 'morning_stretch'
  | 'running'
  | 'swimming'
  | 'triathlon'
  | 'korean'
  | 'piano'
  | 'finance'
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
  | 'sailboat'
  | 'trending-up';

export type CategoryTemplateDefaults = {
  name: string;
  icon: CategoryIconKey;
  color: string;
  color_dim?: string;
  tracking_type: TrackingType;
  mode: CategoryMode;
  effort_type: EffortType;
  sessions_per_week: number;
  timed_session: boolean;
  task_template: TaskTemplateItem[];
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
  /** Seeded modes are system-only — not user-selectable in create flow. */
  systemOnly?: boolean;
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
  'trending-up',
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

function defaultsFor(
  mode: CategoryMode,
  partial: Omit<
    CategoryTemplateDefaults,
    'tracking_type' | 'mode' | 'ai_enabled'
  > & { ai_enabled?: boolean }
): CategoryTemplateDefaults {
  return {
    ...partial,
    mode,
    tracking_type: trackingTypeFromMode(mode),
    ai_enabled: partial.ai_enabled ?? mode === 'ai',
  };
}

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    id: 'cycling',
    name: 'Cycling',
    description: 'Road, indoor, MTB',
    defaults: defaultsFor('ai', {
      name: 'Cycling',
      icon: 'bike',
      color: '#F07820',
      color_dim: '#3D1F08',
      effort_type: 'rpe',
      sessions_per_week: 3,
      timed_session: false,
      task_template: [],
      affects_nutrition: true,
      nutrition_met: 8,
      nutrition_hard_threshold_min: 90,
      coach_context: {},
    }),
  },
  {
    id: 'strength',
    name: 'Strength',
    description: 'Gym, bodyweight',
    defaults: defaultsFor('ai', {
      name: 'Strength',
      icon: 'dumbbell',
      color: '#8B7FE8',
      color_dim: '#251E5A',
      effort_type: 'rpe',
      sessions_per_week: 3,
      timed_session: false,
      task_template: [],
      affects_nutrition: true,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    }),
  },
  {
    id: 'mobility',
    name: 'Mobility',
    description: 'Stretching, yoga',
    defaults: defaultsFor('seeded', {
      name: 'Mobility',
      icon: 'person-standing',
      color: '#28C4C4',
      color_dim: '#0D3D3D',
      effort_type: 'duration',
      sessions_per_week: 4,
      timed_session: true,
      task_template: [],
      ai_enabled: false,
      affects_nutrition: false,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    }),
    systemOnly: false,
  },
  {
    id: 'morning_stretch',
    name: 'Morning Stretch',
    description: 'A short wake-up routine every morning',
    defaults: defaultsFor('seeded', {
      name: 'Morning Stretch',
      icon: 'sunrise',
      color: '#F59E0B',
      color_dim: '#2A1F05',
      effort_type: 'duration',
      sessions_per_week: 7,
      timed_session: true,
      task_template: [],
      ai_enabled: false,
      affects_nutrition: false,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    }),
    systemOnly: true,
  },
  {
    id: 'running',
    name: 'Running',
    description: 'Road, trail',
    defaults: defaultsFor('ai', {
      name: 'Running',
      icon: 'footprints',
      color: '#22C55E',
      color_dim: '#0D2A1A',
      effort_type: 'rpe',
      sessions_per_week: 3,
      timed_session: false,
      task_template: [],
      affects_nutrition: true,
      nutrition_met: 9,
      nutrition_hard_threshold_min: 45,
      coach_context: {},
    }),
  },
  {
    id: 'swimming',
    name: 'Swimming',
    description: 'Pool, open water',
    defaults: defaultsFor('ai', {
      name: 'Swimming',
      icon: 'waves',
      color: '#28C4C4',
      color_dim: '#0D3D3D',
      effort_type: 'rpe',
      sessions_per_week: 3,
      timed_session: false,
      task_template: [],
      affects_nutrition: true,
      nutrition_met: 8,
      nutrition_hard_threshold_min: 45,
      coach_context: {},
    }),
  },
  {
    id: 'triathlon',
    name: 'Triathlon',
    description: 'Swim, bike, run',
    defaults: defaultsFor('ai', {
      name: 'Triathlon',
      icon: 'medal',
      color: '#F472B6',
      color_dim: '#3D1228',
      effort_type: 'rpe',
      sessions_per_week: 5,
      timed_session: false,
      task_template: [],
      affects_nutrition: true,
      nutrition_met: 9,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    }),
  },
  {
    id: 'korean',
    name: 'Korean',
    description: 'Language study',
    defaults: defaultsFor('tracked', {
      name: 'Korean',
      icon: 'book-open',
      color: '#60A5FA',
      color_dim: '#0D1F3D',
      effort_type: 'duration',
      sessions_per_week: 5,
      timed_session: true,
      task_template: [
        { id: 'k1', label: 'Anki deck review', duration: '10 min' },
        { id: 'k2', label: 'TTMIK lesson audio', duration: '10 min' },
        { id: 'k3', label: 'Write 5 sentences', duration: '5 min' },
      ],
      ai_enabled: false,
      affects_nutrition: false,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    }),
  },
  {
    id: 'piano',
    name: 'Piano',
    description: 'Practice & theory',
    defaults: defaultsFor('tracked', {
      name: 'Piano',
      icon: 'music',
      color: '#F59E0B',
      color_dim: '#2A1F05',
      effort_type: 'duration',
      sessions_per_week: 4,
      timed_session: true,
      task_template: [
        { id: 'p1', label: 'Scales warm-up', duration: '5 min' },
        { id: 'p2', label: 'Shell voicings drill', duration: '15 min' },
        { id: 'p3', label: 'Apply to ii-V-I', duration: '10 min' },
      ],
      ai_enabled: false,
      affects_nutrition: false,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    }),
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Portfolio, budget',
    defaults: defaultsFor('tracked', {
      name: 'Finance',
      icon: 'trending-up',
      color: '#A78BFA',
      color_dim: '#1E1245',
      effort_type: 'binary',
      sessions_per_week: 1,
      timed_session: false,
      task_template: [],
      ai_enabled: false,
      affects_nutrition: false,
      nutrition_met: 6,
      nutrition_hard_threshold_min: 60,
      coach_context: {},
    }),
  },
];

export const CUSTOM_CATEGORY_DEFAULTS: CategoryTemplateDefaults = defaultsFor(
  'tracked',
  {
    name: '',
    icon: 'clipboard-list',
    color: '#94a3b8',
    effort_type: 'duration',
    sessions_per_week: 3,
    timed_session: false,
    task_template: [],
    ai_enabled: false,
    affects_nutrition: false,
    nutrition_met: 6,
    nutrition_hard_threshold_min: 60,
    coach_context: {},
  }
);

export const CATEGORY_COLOR_PRESETS = [
  '#F07820',
  '#8B7FE8',
  '#28C4C4',
  '#60A5FA',
  '#F59E0B',
  '#22C55E',
  '#F472B6',
  '#A78BFA',
  '#FB923C',
  '#34D399',
] as const;

const NUTRITION_LOCKED_TEMPLATE_IDS: CategoryTemplateId[] = [
  'mobility',
  'morning_stretch',
  'korean',
  'piano',
  'finance',
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
      return 'Seeded';
    case 'tracked':
      return 'Self-tracked';
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

/** Presets shown in onboarding / add-category (excludes system-only; filtered by PRODUCT_MODE). */
export function getSelectableTemplates(): CategoryTemplate[] {
  const allowed = new Set(PRODUCT_CONFIG[PRODUCT_MODE].starterCategories);
  return CATEGORY_TEMPLATES.filter(
    (t) => !t.systemOnly && allowed.has(t.id)
  );
}
