import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { z, ZodError, ZodType } from 'zod';

type ValidationIssueCode =
  | 'required'
  | 'invalid_type'
  | 'unrecognized_keys'
  | 'too_small'
  | 'too_big'
  | 'invalid_format'
  | 'invalid_value'
  | 'invalid_union'
  | 'invalid_key'
  | 'invalid_element'
  | 'not_multiple_of'
  | 'custom';

interface ValidationIssue {
  code: ValidationIssueCode;
  path: (string | number)[];
  message: string;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (
      metadata.type !== 'body' &&
      metadata.type !== 'query' &&
      metadata.type !== 'param'
    ) {
      return value;
    }

    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      issues: this.formatErrors(result.error, value),
    });
  }

  private formatErrors(
    error: ZodError,
    input: unknown,
  ): ValidationIssue[] {
    return error.issues.flatMap((issue): ValidationIssue[] => {
      if (issue.code === 'unrecognized_keys') {
        return issue.keys.map((key) => ({
          code: 'unrecognized_keys',
          path: [key],
          message: `${key} is not allowed`,
        }));
      }

      const path = issue.path.filter(
        (part): part is string | number =>
          typeof part === 'string' || typeof part === 'number',
      );

      return [
        {
          code: this.getIssueCode(issue, input),
          path,
          message: this.formatMessage(issue, input),
        },
      ];
    });
  }

  private getIssueCode(
    issue: z.core.$ZodIssue,
    input: unknown,
  ): ValidationIssueCode {
    if (
      issue.code === 'invalid_type' &&
      !this.fieldExists(input, issue.path)
    ) {
      return 'required';
    }

    return issue.code;
  }

  private formatMessage(
    issue: z.core.$ZodIssue,
    input: unknown,
  ): string {
    if (
      issue.code === 'invalid_type' &&
      !this.fieldExists(input, issue.path)
    ) {
      return `${issue.path.join('.')} is required`;
    }

    return issue.message;
  }

  private fieldExists(input: unknown, path: PropertyKey[]): boolean {
    let current: unknown = input;

    for (const key of path) {
      if (
        current === null ||
        typeof current !== 'object' ||
        !Object.prototype.hasOwnProperty.call(current, key)
      ) {
        return false;
      }

      current = (current as Record<PropertyKey, unknown>)[key];
    }

    return true;
  }
}