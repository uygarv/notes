import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'validation_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'internal_error',
  'network_error',
  'invalid_credentials',
  'current_password_invalid',
  'password_unchanged',
  'account_exists',
  'username_taken',
  'note_not_found',
  'tag_not_found',
  'tags_not_found',
  'use_password',
  'use_provider',
  'already_connected',
  'already_linked',
  'reset_token_invalid',
  'oauth_state_invalid',
  'oauth_provider_invalid',
  'oauth_email_unavailable',
  'oauth_failed',
]);

export const errorMessages = {
  validation_error: 'Some fields need your attention.',
  unauthorized: 'Sign in is required to continue.',
  forbidden: 'You do not have permission to do that.',
  not_found: 'The requested resource was not found.',
  conflict: 'This conflicts with existing data.',
  internal_error: 'Something went wrong. Please try again.',
  network_error: 'Unable to reach Notes. Check your connection and try again.',
  invalid_credentials: 'Invalid email or password.',
  current_password_invalid: 'Your current password is incorrect.',
  password_unchanged: 'Choose a new password that differs from your current password.',
  account_exists: 'An account with that email already exists. Sign in instead.',
  username_taken: 'That username is already taken.',
  note_not_found: 'This note no longer exists or is unavailable.',
  tag_not_found: 'This tag no longer exists or is unavailable.',
  tags_not_found: 'One or more selected tags are unavailable.',
  use_password: 'This account uses email and password. Sign in with your password, then link a provider from Settings.',
  use_provider: 'This account uses a connected provider. Sign in with that provider instead.',
  already_connected: 'That provider account is already connected to another Notes account.',
  already_linked: 'That provider is already connected to your account.',
  reset_token_invalid: 'This password reset link is invalid or has expired. Request a new one to continue.',
  oauth_state_invalid: 'Your sign-in session expired. Please start again.',
  oauth_provider_invalid: 'That sign-in provider did not match your request. Please try again.',
  oauth_email_unavailable: 'Your provider did not share an email address. Use another sign-in method.',
  oauth_failed: 'That sign-in could not be completed. Please try again or use your password.',
} as const;

export const errorSchema = z.object({
  code: errorCodeSchema,
});

export const validationIssueSchema = z.object({
  code: z.string(),
  path: z.array(z.string()),
  message: z.string(),
});

export const validationErrorSchema = z.object({
  code: z.literal('validation_error'),
  issues: z.array(validationIssueSchema),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorResponse = z.infer<typeof errorSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ValidationErrorResponse = z.infer<typeof validationErrorSchema>;
