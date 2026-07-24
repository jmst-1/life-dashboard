import { z } from 'zod';

export const createInviteSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, 'Code must be at least 4 characters')
    .max(32)
    .optional(),
  max_uses: z.coerce.number().int().min(1).max(1000).default(1),
  expires_at: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.string().datetime({ offset: true }),
      z.null(),
    ])
    .optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
