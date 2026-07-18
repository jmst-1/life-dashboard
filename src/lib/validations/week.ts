import { z } from 'zod';

export const updateWeekSchema = z
  .object({
    planning_notes: z.string().nullable().optional(),
    status: z.enum(['planning', 'active', 'complete']).optional(),
    weight_kg_snapshot: z.number().positive().nullable().optional(),
  })
  .refine(
    (data) =>
      data.planning_notes !== undefined ||
      data.status !== undefined ||
      data.weight_kg_snapshot !== undefined,
    {
      message:
        'At least one of planning_notes, status, or weight_kg_snapshot is required',
    }
  );

export type UpdateWeekBody = z.infer<typeof updateWeekSchema>;
