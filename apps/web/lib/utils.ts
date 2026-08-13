import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { errorMessages } from '@notes/schemas';
import { ApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/strings';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

/** Turns the TipTap document HTML used by notes into a compact list preview/search value. */
export function toPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatApiError(error: unknown) {
  if (error instanceof ApiError) return getErrorMessage(error.code, error.message);
  return errorMessages.internal_error;
}
