import { z } from 'zod';

const trackingTypeSchema = z.enum([
  'ai_plan',
  'random_pick',
  'session',
  'log_only',
  'count',
]);

const coachContextSchema = z
  .object({
    coaching_brief: z.string().optional(),
  })
  .passthrough()
  .optional();

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  icon: z.string().trim().min(1, 'Icon is required'),
  color: z.string().trim().min(1, 'Color is required'),
  tracking_type: trackingTypeSchema,
  ai_enabled: z.boolean(),
  affects_nutrition: z.boolean(),
  nutrition_met: z.number().positive('MET must be a positive number'),
  nutrition_hard_threshold_min: z
    .number()
    .int()
    .positive('Hard session threshold must be a positive number'),
  coach_context: coachContextSchema,
});

const nullableString = z.string().trim().nullable().optional();

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  icon: z.string().trim().min(1, 'Icon is required').optional(),
  color: z.string().trim().min(1, 'Color is required').optional(),
  ai_enabled: z.boolean().optional(),
  affects_nutrition: z.boolean().optional(),
  nutrition_met: z
    .number()
    .positive('MET must be a positive number')
    .optional(),
  nutrition_hard_threshold_min: z
    .number()
    .int()
    .positive('Hard session threshold must be a positive number')
    .optional(),
  coach_context: coachContextSchema,
  goal_event_name: nullableString,
  goal_event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .nullable()
    .optional(),
  goal_event_notes: nullableString,
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
