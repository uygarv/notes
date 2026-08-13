import { z } from 'zod';

export const oauthProviderSchema = z.enum(['google', 'github']);

export const identityProviderSchema = z.object({
  provider: oauthProviderSchema,
  linked: z.boolean(),
});

export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
export type IdentityProvider = z.infer<typeof identityProviderSchema>;
