import { errorMessages } from '@notes/schemas';

export function getErrorMessage(code: string | null | undefined, fallback: string) {
  if (!code) return '';

  return code in errorMessages
    ? errorMessages[code as keyof typeof errorMessages]
    : fallback;
}

export const getAuthErrorMessage = getErrorMessage;