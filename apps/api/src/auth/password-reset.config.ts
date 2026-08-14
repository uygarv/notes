export function isPasswordResetEnabled() {
  return process.env.FORGOT_PASSWORD_ENABLED === 'true';
}
