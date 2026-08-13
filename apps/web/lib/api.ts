import { initClient } from '@ts-rest/core';
import { authContract, notesContract, tagsContract, usersContract } from '@notes/contracts';
import { errorSchema, validationErrorSchema, type ValidationIssue } from '@notes/schemas';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const clientArgs = {
  baseUrl,
  baseHeaders: {},
  credentials: 'include' as const,
};

export const api = {
  auth: initClient(authContract, clientArgs),
  notes: initClient(notesContract, clientArgs),
  tags: initClient(tagsContract, clientArgs),
  users: initClient(usersContract, clientArgs),
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues: ValidationIssue[] = [],
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function unwrap<T extends { status: number; body: unknown }>(response: T): T['body'] {
  if (response.status >= 200 && response.status < 300) {
    return response.body;
  }

  const validation = validationErrorSchema.safeParse(response.body);
  if (validation.success) {
    throw new ApiError(response.status, validation.data.message, validation.data.issues);
  }

  const apiError = errorSchema.safeParse(response.body);
  if (apiError.success) {
    throw new ApiError(response.status, apiError.data.message, [], apiError.data.code);
  }

  const message = typeof response.body === 'object'
    && response.body !== null
    && 'message' in response.body
    && typeof response.body.message === 'string'
    ? response.body.message
    : response.status === 0
      ? 'Unable to reach the Notes API. Check your connection and try again.'
      : 'Something went wrong. Please try again.';

  throw new ApiError(response.status, message);
}

export function apiUrl(path: string) {
  return `${baseUrl}${path}`;
}
