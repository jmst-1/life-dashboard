import { z } from 'zod';

export const generatePlanBodySchema = z.object({
  weekId: z.string().uuid(),
  categoryId: z.string().uuid(),
  planningNotes: z.string().nullable().optional(),
  activeCategoryIds: z.array(z.string().uuid()).optional(),
});

export type GeneratePlanBody = z.infer<typeof generatePlanBodySchema>;

export const generateMovementBodySchema = z.object({
  weekId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export type GenerateMovementBody = z.infer<typeof generateMovementBodySchema>;

export const rerollMovementBodySchema = z.object({
  sessionId: z.string().uuid(),
});

export type RerollMovementBody = z.infer<typeof rerollMovementBodySchema>;

const cyclingZoneSchema = z.object({
  name: z.string(),
  duration_min: z.number(),
  pct_ftp_low: z.number(),
  pct_ftp_high: z.number(),
});

const strengthExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.string(),
  notes: z.string(),
});

const strengthBlockSchema = z.object({
  name: z.string(),
  duration_min: z.number(),
  exercises: z.array(strengthExerciseSchema),
});

const baseSessionSchema = z.object({
  day: z.number().int().min(0).max(6),
  title: z.string().min(1),
  // Rest days legitimately use duration_min: 0 (Claude returns this often).
  duration_min: z.number().min(0),
  description: z.string().optional().default(''),
  coaching_note: z.string().optional().default(''),
});

export const cyclingPlanResponseSchema = z.object({
  week_theme: z.string(),
  week_note: z.string().optional().default(''),
  sessions: z.array(
    baseSessionSchema.extend({
      zones: z.array(cyclingZoneSchema).optional().default([]),
    })
  ),
});

export const strengthPlanResponseSchema = z.object({
  week_theme: z.string(),
  week_note: z.string().optional().default(''),
  sessions: z.array(
    baseSessionSchema.extend({
      blocks: z.array(strengthBlockSchema).optional().default([]),
    })
  ),
});

export const genericPlanResponseSchema = z.object({
  week_theme: z.string(),
  week_note: z.string().optional().default(''),
  sessions: z.array(baseSessionSchema),
});

export type CyclingPlanResponse = z.infer<typeof cyclingPlanResponseSchema>;
export type StrengthPlanResponse = z.infer<typeof strengthPlanResponseSchema>;
export type GenericPlanResponse = z.infer<typeof genericPlanResponseSchema>;
export type PlanResponse =
  | CyclingPlanResponse
  | StrengthPlanResponse
  | GenericPlanResponse;
