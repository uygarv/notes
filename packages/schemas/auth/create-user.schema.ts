import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type CreateUser = z.infer<typeof createUserSchema>;