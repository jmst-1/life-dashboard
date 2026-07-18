import { z } from 'zod';

export const updateSessionSchema = z
  .object({
    title: z.string().min(1).optional(),
    planned_duration_min: z.number().int().positive().nullable().optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.planned_duration_min !== undefined ||
      data.day_of_week !== undefined,
    {
      message:
        'At least one of title, planned_duration_min, or day_of_week is required',
    }
  );

export type UpdateSessionBody = z.infer<typeof updateSessionSchema>;

export const listSessionsQuerySchema = z.object({
  weekId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

export const reorderSessionsSchema = z.object({
  weekId: z.string().uuid(),
  categoryId: z.string().uuid(),
  sessionIds: z.array(z.string().uuid()).min(2),
});

export type ReorderSessionsBody = z.infer<typeof reorderSessionsSchema>;

export const swapSessionDaysSchema = z.object({
  weekId: z.string().uuid(),
  sessionIdA: z.string().uuid(),
  sessionIdB: z.string().uuid(),
});

export type SwapSessionDaysBody = z.infer<typeof swapSessionDaysSchema>;

export const createSessionSchema = z.object({
  weekId: z.string().uuid(),
  session: z.object({
    id: z.string().uuid(),
    categoryId: z.string().uuid(),
    day_of_week: z.number().int().min(0).max(6),
    title: z.string().min(1),
    planned_duration_min: z.number().int().min(0).nullable(),
    sort_order: z.number().int(),
    description: z.string().nullable().optional(),
    session_type: z.string().optional(),
    zones: z.unknown().nullable().optional(),
    blocks: z.unknown().nullable().optional(),
  }),
});

export type CreateSessionBody = z.infer<typeof createSessionSchema>;

const exerciseLogSetSchema = z.object({
  set_num: z.number().int().positive(),
  reps: z.number().int().nonnegative().nullable(),
  weight_kg: z.number().nonnegative().nullable(),
  equipment: z.string().nullable(),
  notes: z.string().nullable(),
});

const exerciseLogEntrySchema = z.object({
  exercise_name: z.string().min(1),
  notes: z.string().nullable(),
  sets: z.array(exerciseLogSetSchema),
});

export const completeSessionSchema = z
  .object({
    actual_duration_min: z.number().int().nonnegative(),
    completed: z.boolean(),
    skipped: z.boolean(),
    actual_calories_kcal: z.number().int().nonnegative().nullable().optional(),
    execution_notes: z.string().nullable().optional(),
    skip_reason: z.string().nullable().optional(),
    exercise_log: z.array(exerciseLogEntrySchema).optional(),
  })
  .refine((data) => !(data.completed && data.skipped), {
    message: 'completed and skipped cannot both be true',
  });

export type CompleteSessionBody = z.infer<typeof completeSessionSchema>;
