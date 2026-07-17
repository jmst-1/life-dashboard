export type TrackingType = 'ai_plan' | 'random_pick' | 'session' | 'log_only' | 'count';
export type SessionRenderer = 'cycling' | 'strength' | 'movement' | 'generic';
export type DayType = 'hard' | 'moderate' | 'rest';
export type TrainingPhase = 'base' | 'build' | 'peak' | 'taper' | 'race_week' | 'recovery';

export type CyclingZone = { name: string; duration_min: number; pct_ftp_low: number; pct_ftp_high: number };
export type StrengthExercise = { name: string; sets: number; reps: string; notes: string };
export type StrengthBlock = { name: string; duration_min: number; exercises: StrengthExercise[] };
export type RoutineStep = { order: number; name: string; duration_sec: number; cue: string };
export type ExerciseLogSet = { set_num: number; reps: number | null; weight_kg: number | null; equipment: string | null; notes: string | null };
export type ExerciseLogEntry = { exercise_name: string; sets: ExerciseLogSet[] };

export type Profile = {
  id: string;
  display_name: string | null;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  biological_sex: 'male' | 'female' | null;
  activity_level: 'sedentary' | 'moderate' | 'active';
  target_rate_kg_per_week: number;
  deficit_strategy: 'cycling' | 'uniform';
  tdee_override: number | null;
  dietary_notes: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type WeightLog = {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_date: string;
  notes: string | null;
  created_at: string;
};

/** Cycling coach_context keys: ftp, phase, goals, equipment_notes, injury_notes */
export type CyclingCoachContext = {
  ftp?: number;
  phase?: TrainingPhase;
  goals?: string;
  equipment_notes?: string;
  injury_notes?: string;
};

/** Strength coach_context keys: level, equipment, goals, injury_notes */
export type StrengthCoachContext = {
  level?: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string;
  goals?: string;
  injury_notes?: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  tracking_type: TrackingType;
  ai_enabled: boolean;
  status: 'active' | 'archived';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB coach context is open-ended
  coach_context: Record<string, any>;
  affects_nutrition: boolean;
  nutrition_met: number;
  nutrition_hard_threshold_min: number;
  goal_event_name: string | null;
  goal_event_date: string | null;
  goal_event_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Week = {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  planning_notes: string | null;
  status: 'planning' | 'active' | 'complete';
  score_overall: number | null;
  score_breakdown: Record<string, number> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB time summary is open-ended
  time_summary: Record<string, any> | null;
  weight_kg_snapshot: number | null;
  coach_commentary: string | null;
  created_at: string;
};

export type Session = {
  id: string;
  week_id: string;
  user_id: string;
  category_id: string;
  day_of_week: number;
  planned_date: string | null;
  title: string;
  description: string | null;
  planned_duration_min: number | null;
  zones: CyclingZone[] | null;
  blocks: StrengthBlock[] | null;
  routine_steps: RoutineStep[] | null;
  exercise_log: ExerciseLogEntry[] | null;
  session_type: string;
  sort_order: number;
  completed: boolean;
  skipped: boolean;
  skip_reason: string | null;
  actual_duration_min: number | null;
  actual_calories_kcal: number | null;
  execution_notes: string | null;
  completed_at: string | null;
  library_entry_id: string | null;
  created_at: string;
};

export type MovementLibraryEntry = {
  id: string;
  user_id: string | null;
  library_type: 'mobility' | 'stretch';
  name: string;
  target_area: 'hips' | 'spine' | 'shoulders' | 'ankles' | 'hamstrings' | 'full_body';
  duration_min: number;
  equipment: 'none' | 'band' | 'foam_roller' | 'yoga_mat';
  steps: RoutineStep[];
  active: boolean;
  created_at: string;
};

export type WeekReview = {
  id: string;
  week_id: string;
  user_id: string;
  category_id: string;
  score: number | null;
  planned_min: number | null;
  actual_min: number | null;
  planned_sessions: number | null;
  completed_sessions: number | null;
  skipped_sessions: number | null;
  missed_sessions: number | null;
  completion_rate: number | null;
  created_at: string;
};

export type NutritionPlan = {
  id: string;
  week_id: string;
  user_id: string;
  weight_kg: number;
  goal_weight_kg: number | null;
  deficit_strategy: string;
  baseline_tdee: number;
  weekly_deficit_target: number;
  race_week: boolean;
  training_calories_map: Record<string, number>;
  macro_guide: {
    day_types: Record<DayType, { calories: number; protein_g: number; carbs_g: number; fat_g: number; notes: string }>;
    day_map: Record<string, DayType>;
  };
  meal_prep_brief: string;
  generated_at: string;
  created_at: string;
};
