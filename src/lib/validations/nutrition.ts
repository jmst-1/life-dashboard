import { z } from 'zod';

export const generateNutritionBodySchema = z.object({
  weekId: z.string().uuid(),
  mode: z.enum(['full', 'brief_only']).optional().default('full'),
});

export type GenerateNutritionBody = z.infer<typeof generateNutritionBodySchema>;
