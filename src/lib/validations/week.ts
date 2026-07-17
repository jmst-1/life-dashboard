import { z } from 'zod';

export const updateWeekSchema = z
  .object({
    planning_notes: z.string().nullable().optional(),
    status: z.enum(['planning', 'active', 'complete']).optional(),
  })
  .refine(
    (data) => data.planning_notes !== undefined || data.status !== undefined,
    { message: 'At least one of planning_notes or status is required' }
  );

export type UpdateWeekBody = z.infer<typeof updateWeekSchema>;
