import { z } from 'zod';

export const createWeightLogSchema = z.object({
  weight_kg: z.number().positive('Weight must be positive'),
  logged_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes: z.string().nullable().optional(),
});

export type CreateWeightLogBody = z.infer<typeof createWeightLogSchema>;
