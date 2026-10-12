import { z } from 'zod';

export const createAccountCommandSchema = z.object({
  userId: z.string().trim().min(1),
  initialBalance: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export type CreateAccountCommand = z.infer<typeof createAccountCommandSchema>;
