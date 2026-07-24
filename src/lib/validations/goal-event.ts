import { z } from 'zod';

export const goalEventTypeSchema = z.enum([
  'cycling',
  'duathlon',
  'triathlon',
  'run',
  'other',
]);

export const createGoalEventSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(120),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  event_type: goalEventTypeSchema.default('other'),
  distances: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
});

export const updateGoalEventSchema = createGoalEventSchema.partial();

export type CreateGoalEventInput = z.infer<typeof createGoalEventSchema>;
export type UpdateGoalEventInput = z.infer<typeof updateGoalEventSchema>;
