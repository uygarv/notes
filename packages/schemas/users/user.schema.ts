import { z } from 'zod';

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string().nullable(),
  profileImageUrl: z.string().url().nullable(),
  hasPassword: z.boolean(),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;
