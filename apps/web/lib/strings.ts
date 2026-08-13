export const authErrorMessages = {
  invalid_credentials: 'Invalid email or password.',
  use_password: 'This account uses email and password. Sign in with your password, then link a provider from Settings.',
  use_provider: 'This account uses a connected provider. Sign in with that provider instead.',
  already_connected: 'That provider account is already connected to another Notes account.',
  already_linked: 'That provider is already connected to your account.',
  account_exists: 'An account with that email already exists. Sign in with your original method first.',
  oauth_failed: 'That sign-in could not be completed. Please try again or use your password.',
} as const;

export function getAuthErrorMessage(code: string | null | undefined, fallback: string) {
  if (!code) return '';

  return code in authErrorMessages
    ? authErrorMessages[code as keyof typeof authErrorMessages]
    : fallback;
}
