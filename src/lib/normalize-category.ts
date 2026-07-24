import type { Category, TaskTemplateItem } from '@/types';
import { modeFromTrackingType, trackingTypeFromMode } from '@/lib/category-mode';

/** Normalize a raw DB category row so v6 fields always exist. */
export function normalizeCategory(raw: Category): Category {
  const tracking_type = raw.tracking_type ?? 'ai_plan';
  const mode = raw.mode ?? modeFromTrackingType(tracking_type);
  const task_template = Array.isArray(raw.task_template)
    ? (raw.task_template as TaskTemplateItem[])
    : [];

  return {
    ...raw,
    tracking_type,
    mode,
    effort_type: raw.effort_type ?? 'duration',
    sessions_per_week: raw.sessions_per_week ?? 3,
    timed_session: raw.timed_session ?? false,
    task_template,
    color_dim: raw.color_dim ?? null,
  };
}

export function normalizeCategories(rows: Category[]): Category[] {
  return rows.map(normalizeCategory);
}

/** Ensure mode and tracking_type stay in sync on write. */
export function syncedModeFields(input: {
  mode?: Category['mode'];
  tracking_type?: Category['tracking_type'];
}): {
  mode: NonNullable<Category['mode']>;
  tracking_type: Category['tracking_type'];
} {
  if (input.mode) {
    return {
      mode: input.mode,
      tracking_type: trackingTypeFromMode(input.mode),
    };
  }
  const tracking_type = input.tracking_type ?? 'ai_plan';
  return {
    mode: modeFromTrackingType(tracking_type),
    tracking_type,
  };
}
