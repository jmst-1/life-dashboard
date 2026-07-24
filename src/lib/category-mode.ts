import type { Category, CategoryMode, EffortType, TrackingType } from '@/types';

export function modeFromTrackingType(trackingType: TrackingType): CategoryMode {
  switch (trackingType) {
    case 'random_pick':
      return 'seeded';
    case 'session':
    case 'log_only':
    case 'count':
    case 'tracked':
      return 'tracked';
    case 'ai_plan':
    default:
      return 'ai';
  }
}

export function trackingTypeFromMode(mode: CategoryMode): TrackingType {
  switch (mode) {
    case 'seeded':
      return 'random_pick';
    case 'tracked':
      return 'tracked';
    case 'ai':
    default:
      return 'ai_plan';
  }
}

/** Resolve effective mode, preferring `mode` column when present. */
export function getCategoryMode(category: Category): CategoryMode {
  if (category.mode) return category.mode;
  return modeFromTrackingType(category.tracking_type);
}

export function getEffortType(category: Category): EffortType {
  return category.effort_type ?? 'duration';
}

export function isTimedSession(category: Category): boolean {
  if (getEffortType(category) === 'binary') return false;
  return category.timed_session ?? false;
}

export function colorDim(category: Category): string {
  if (category.color_dim) return category.color_dim;
  return `${category.color}18`;
}

export function modeLabel(mode: CategoryMode): string {
  switch (mode) {
    case 'ai':
      return 'AI coached';
    case 'seeded':
      return 'Seeded';
    case 'tracked':
      return 'Self-tracked';
  }
}

export function effortLabel(effort: EffortType): string {
  switch (effort) {
    case 'rpe':
      return 'RPE';
    case 'duration':
      return 'Duration';
    case 'binary':
      return 'Binary';
  }
}
