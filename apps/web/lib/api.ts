import { initClient } from '@ts-rest/core';
import { authContract, notesContract, tagsContract, usersContract } from '@notes/contracts';
import {
  errorMessages,
  errorSchema,
  validationErrorSchema,
  type ErrorCode,
  type ValidationIssue,
} from '@notes/schemas';

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
    public readonly code: ErrorCode,
    public readonly issues: ValidationIssue[] = [],
  ) {
    super(errorMessages[code]);
    this.name = 'ApiError';
  }
}

export function unwrap<T extends { status: number; body: unknown }>(response: T): T['body'] {
  if (response.status >= 200 && response.status < 300) {
    return response.body;
  }

  const validation = validationErrorSchema.safeParse(response.body);
  if (validation.success) {
    throw new ApiError(response.status, validation.data.code, validation.data.issues);
  }

  const apiError = errorSchema.safeParse(response.body);
  if (apiError.success) {
    throw new ApiError(response.status, apiError.data.code);
  }

  const code: ErrorCode = response.status === 0 ? 'network_error' : 'internal_error';
  throw new ApiError(response.status, code);
}

export function apiUrl(path: string) {
  return `${baseUrl}${path}`;
}
