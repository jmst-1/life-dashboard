import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1).nullable().optional(),
  current_weight_kg: z.number().positive('Current weight must be positive').optional(),
  goal_weight_kg: z.number().positive('Goal weight must be positive').nullable().optional(),
  height_cm: z.number().positive('Height must be positive').optional(),
  age: z.number().int().positive('Age must be a positive integer').optional(),
  biological_sex: z.enum(['male', 'female']).nullable().optional(),
  activity_level: z.enum(['sedentary', 'moderate', 'active']).optional(),
  target_rate_kg_per_week: z
    .union([
      z.literal(0.25),
      z.literal(0.5),
      z.literal(0.75),
      z.literal(1.0),
    ])
    .optional(),
  deficit_strategy: z.enum(['cycling', 'uniform']).optional(),
  tdee_override: z.number().positive().nullable().optional(),
  dietary_notes: z.string().nullable().optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
