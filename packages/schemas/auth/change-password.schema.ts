import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8),
});

export type ChangePassword = z.infer<typeof changePasswordSchema>;
