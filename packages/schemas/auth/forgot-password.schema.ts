import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
