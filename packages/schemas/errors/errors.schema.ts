import { z } from 'zod';

export const errorSchema = z.object({
  message: z.string(),
});

export const validationIssueSchema = z.object({
  code: z.string(),
  path: z.array(z.string()),
  message: z.string(),
});

export const validationErrorSchema = z.object({
  message: z.string(),
  issues: z.array(validationIssueSchema),
});

export type ErrorResponse = z.infer<typeof errorSchema>
export type ValidationIssue = z.infer<typeof validationIssueSchema>
export type ValidationErrorResponse = z.infer<typeof validationErrorSchema>