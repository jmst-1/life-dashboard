import { classifyDayType, type DaySessions } from '@/lib/nutrition';
import type {
  Category,
  DayType,
  MovementLibraryEntry,
  Session,
} from '@/types';

type TargetArea =
  | 'hips'
  | 'spine'
  | 'shoulders'
  | 'ankles'
  | 'hamstrings'
  | 'full_body';

const MOBILITY_DAY_AFFINITY: Record<
  DayType,
  { areas: TargetArea[]; duration_min: [number, number] }
> = {
  hard: { areas: ['hips', 'hamstrings', 'spine'], duration_min: [8, 10] },
  moderate: { areas: ['shoulders', 'ankles', 'spine'], duration_min: [10, 12] },
  rest: { areas: ['full_body', 'hips', 'shoulders'], duration_min: [15, 20] },
};

const STRETCH_CONFIG = {
  areas: ['full_body', 'spine', 'shoulders'] as TargetArea[],
  duration_min: [5, 10] as [number, number],
};

export function pickWeeklyRoutines(
  library: MovementLibraryEntry[],
  libraryType: 'mobility' | 'stretch',
  dayMap: Record<number, DayType>,
  recentEntryIds: string[]
): Record<number, MovementLibraryEntry> {
  const picks: Record<number, MovementLibraryEntry> = {};
  const usedThisWeek = new Set<string>();

  for (const day of [0, 1, 2, 3, 4, 5, 6] as const) {
    const config =
      libraryType === 'stretch'
        ? STRETCH_CONFIG
        : MOBILITY_DAY_AFFINITY[dayMap[day]];

    let pool = library.filter(
      (e) =>
        e.library_type === libraryType &&
        e.active &&
        config.areas.includes(e.target_area as TargetArea) &&
        e.duration_min >= config.duration_min[0] &&
        e.duration_min <= config.duration_min[1] &&
        !recentEntryIds.includes(e.id) &&
        !usedThisWeek.has(e.id)
    );
    if (pool.length === 0)
      pool = library.filter(
        (e) =>
          e.library_type === libraryType &&
          e.active &&
          !usedThisWeek.has(e.id)
      );
    if (pool.length === 0)
      pool = library.filter(
        (e) => e.library_type === libraryType && e.active
      );

    const picked = pool[Math.floor(Math.random() * pool.length)];
    picks[day] = picked;
    usedThisWeek.add(picked.id);
  }
  return picks;
}

export function pickRerollEntry(
  library: MovementLibraryEntry[],
  libraryType: 'mobility' | 'stretch',
  currentId: string | null,
  recentEntryIds: string[]
): MovementLibraryEntry | null {
  let pool = library.filter(
    (e) =>
      e.library_type === libraryType &&
      e.active &&
      e.id !== currentId &&
      !recentEntryIds.includes(e.id)
  );
  if (pool.length === 0) {
    pool = library.filter(
      (e) =>
        e.library_type === libraryType &&
        e.active &&
        e.id !== currentId
    );
  }
  if (pool.length === 0) {
    pool = library.filter(
      (e) => e.library_type === libraryType && e.active
    );
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function libraryTypeFromCategoryName(
  name: string
): 'mobility' | 'stretch' {
  return name.toLowerCase().includes('stretch') ? 'stretch' : 'mobility';
}

function groupSessionsByDay(
  sessions: Session[],
  categoriesById: Record<string, Category>
): Record<number, DaySessions> {
  const byDay: Record<number, DaySessions> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  for (const session of sessions) {
    const category = categoriesById[session.category_id];
    if (!category) continue;
    const day = session.day_of_week;
    if (day < 0 || day > 6) continue;
    byDay[day].push({ session, category });
  }
  return byDay;
}

/** Build day hardness map from week sessions; all moderate if no ai_plan sessions yet. */
export function buildMovementDayMap(
  sessions: Session[],
  categories: Category[]
): Record<number, DayType> {
  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const aiPlanCategoryIds = new Set(
    categories.filter((c) => c.tracking_type === 'ai_plan').map((c) => c.id)
  );
  const hasAiPlanSessions = sessions.some((s) =>
    aiPlanCategoryIds.has(s.category_id)
  );

  if (!hasAiPlanSessions) {
    return {
      0: 'moderate',
      1: 'moderate',
      2: 'moderate',
      3: 'moderate',
      4: 'moderate',
      5: 'moderate',
      6: 'moderate',
    };
  }

  const byDay = groupSessionsByDay(sessions, categoriesById);
  const dayMap: Record<number, DayType> = {};
  for (const d of [0, 1, 2, 3, 4, 5, 6]) {
    dayMap[d] = classifyDayType(byDay[d]);
  }
  return dayMap;
}
