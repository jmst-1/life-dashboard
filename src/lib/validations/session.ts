import { z } from 'zod';

export const updateSessionSchema = z
  .object({
    title: z.string().min(1).optional(),
    planned_duration_min: z.number().int().positive().nullable().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined || data.planned_duration_min !== undefined,
    { message: 'At least one of title or planned_duration_min is required' }
  );

export type UpdateSessionBody = z.infer<typeof updateSessionSchema>;

export const listSessionsQuerySchema = z.object({
  weekId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
