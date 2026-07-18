import type {
  Category,
  CyclingZone,
  DayType,
  Profile,
  Session,
} from '@/types';

export function bmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female'
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  moderate: 1.375,
  active: 1.55,
};

export function baselineTDEE(profile: Profile): number {
  if (profile.tdee_override) return profile.tdee_override;
  const b = bmr(
    profile.current_weight_kg!,
    profile.height_cm!,
    profile.age!,
    profile.biological_sex!
  );
  return Math.round(b * ACTIVITY_MULTIPLIER[profile.activity_level]);
}

const CYCLING_MET: Record<string, number> = {
  recovery: 4,
  endurance: 8,
  tempo_sweetspot: 9,
  threshold_vo2: 11,
};

export function pickCyclingMET(zones: CyclingZone[] | null): number {
  if (!zones || zones.length === 0) return CYCLING_MET.endurance;
  const hasThreshold = zones.some((z) =>
    ['threshold', 'vo2', 'sweetspot'].some((t) =>
      z.name.toLowerCase().includes(t)
    )
  );
  return hasThreshold ? CYCLING_MET.threshold_vo2 : CYCLING_MET.endurance;
}

export function estimateCalories(
  session: Session,
  category: Category,
  weightKg: number
): number {
  if (session.actual_calories_kcal) return session.actual_calories_kcal;
  const met =
    category.name === 'Cycling'
      ? pickCyclingMET(session.zones)
      : category.nutrition_met;
  return Math.round(
    (met * 3.5 * weightKg) / 200 * (session.planned_duration_min ?? 0)
  );
}

export function isHardSession(session: Session, category: Category): boolean {
  if (category.name === 'Cycling') {
    return (
      !!session.zones?.some((z) =>
        ['threshold', 'vo2', 'sweetspot'].some((t) =>
          z.name.toLowerCase().includes(t)
        )
      ) || (session.planned_duration_min ?? 0) >= 90
    );
  }
  return (session.planned_duration_min ?? 0) >= category.nutrition_hard_threshold_min;
}

export type DaySessions = { session: Session; category: Category }[];

export function classifyDayType(daySessions: DaySessions): DayType {
  const contributing = daySessions.filter(
    ({ category }) => category.affects_nutrition
  );
  if (contributing.length === 0) return 'rest';
  const anyHard = contributing.some(({ session, category }) =>
    isHardSession(session, category)
  );
  if (anyHard || contributing.length >= 2) return 'hard';
  return 'moderate';
}

export function weeklyDeficitTarget(profile: Profile): number {
  return Math.round(profile.target_rate_kg_per_week * 7700);
}

export function isRaceWeek(
  weekStart: Date,
  weekEnd: Date,
  categories: Category[]
): boolean {
  return categories.some(
    (c) =>
      c.affects_nutrition &&
      c.goal_event_date &&
      new Date(c.goal_event_date) >= weekStart &&
      new Date(c.goal_event_date) <= weekEnd
  );
}

export function buildCalorieTargets(
  profile: Profile,
  dayMap: Record<number, DayType>,
  trainingCalByDay: Record<number, number>,
  raceWeek: boolean
): Record<number, number> {
  const baseline = baselineTDEE(profile);
  const dayTDEE = (d: number) => baseline + (trainingCalByDay[d] ?? 0);

  if (raceWeek) {
    return Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((d) => [d, Math.round(dayTDEE(d))])
    );
  }

  const weeklyDeficit = weeklyDeficitTarget(profile);

  if (profile.deficit_strategy === 'uniform') {
    const dailyDeficit = Math.round(weeklyDeficit / 7);
    return Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((d) => [
        d,
        Math.round(dayTDEE(d) - dailyDeficit),
      ])
    );
  }

  const hardDays = Object.entries(dayMap)
    .filter(([, t]) => t === 'hard')
    .map(([d]) => Number(d));
  const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !hardDays.includes(d));
  const perDayDeficit = otherDays.length
    ? Math.round(weeklyDeficit / otherDays.length)
    : 0;
  const targets: Record<number, number> = {};
  for (const d of [0, 1, 2, 3, 4, 5, 6]) {
    targets[d] = hardDays.includes(d)
      ? Math.round(dayTDEE(d))
      : Math.round(dayTDEE(d) - perDayDeficit);
  }
  return targets;
}

export type MacroGuide = {
  day_types: Record<
    DayType,
    {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      notes: string;
    }
  >;
  day_map: Record<number, DayType>;
};

/** Rest-day target with zero training — used when the week has no rest days. */
function restDayCalories(
  profile: Profile,
  dayMap: Record<number, DayType>,
  raceWeek: boolean
): number {
  const baseline = baselineTDEE(profile);
  if (raceWeek) return baseline;

  const weeklyDeficit = weeklyDeficitTarget(profile);
  if (profile.deficit_strategy === 'uniform') {
    return Math.round(baseline - Math.round(weeklyDeficit / 7));
  }

  const hardDays = Object.entries(dayMap)
    .filter(([, t]) => t === 'hard')
    .map(([d]) => Number(d));
  const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !hardDays.includes(d));
  const perDayDeficit = otherDays.length
    ? Math.round(weeklyDeficit / otherDays.length)
    : 0;
  return Math.round(baseline - perDayDeficit);
}

export function buildMacroGuide(
  profile: Profile,
  dayMap: Record<number, DayType>,
  calorieTargets: Record<number, number>,
  raceWeek: boolean
): MacroGuide {
  const proteinG = Math.round(2.0 * profile.current_weight_kg!);
  const fatG = Math.round(0.7 * profile.current_weight_kg!);
  const proteinCal = proteinG * 4;
  const fatCal = fatG * 9;
  const minCal = proteinCal + fatCal;

  const byType = {} as MacroGuide['day_types'];
  for (const type of ['hard', 'moderate', 'rest'] as DayType[]) {
    const days = Object.entries(dayMap)
      .filter(([, t]) => t === type)
      .map(([d]) => Number(d));
    let avgCal = 0;
    if (days.length) {
      avgCal = Math.round(
        days.reduce((s, d) => s + calorieTargets[d], 0) / days.length
      );
    } else if (type === 'rest') {
      avgCal = restDayCalories(profile, dayMap, raceWeek);
    }
    const carbsG = Math.max(Math.round((avgCal - minCal) / 4), 0);
    const calories = proteinCal + carbsG * 4 + fatCal;
    byType[type] = {
      calories,
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
      notes: raceWeek
        ? 'Race week — maintenance calories, carbs up for glycogen'
        : type === 'hard'
          ? 'Maintenance — fuel the session'
          : type === 'rest'
            ? 'Deepest deficit — lower carbs, protein stays high'
            : 'Moderate deficit',
    };
  }
  return { day_types: byType, day_map: dayMap };
}
