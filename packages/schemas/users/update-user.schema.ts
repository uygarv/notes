import { z } from 'zod';

export const updateUserSchema = z.object({
  username: z.string().optional(),
});

export type UpdateUser = z.infer<typeof updateUserSchema>;