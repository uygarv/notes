import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { TsRestRequestValidationError } from '@ts-rest/nest';

import type { ValidationErrorResponse } from '@notes/schemas';

@Catch(TsRestRequestValidationError)
export class TsRestValidationFilter implements ExceptionFilter {
  catch(
    exception: TsRestRequestValidationError,
    host: ArgumentsHost,
  ) {
    const response = host.switchToHttp().getResponse();

    const errors = [
      exception.pathParams,
      exception.headers,
      exception.query,
      exception.body,
    ].filter(
      (error): error is NonNullable<typeof error> =>
        error !== null,
    );

    const issues = errors.flatMap((error) =>
      error.issues.map((issue) => {
        const path = issue.path?.map(String) ?? [];
        const field = path.join('.');

        return {
          code: this.getErrorCode(issue.message),
          path,
          message: this.formatMessage(issue.message, field),
        };
      }),
    );

    const body: ValidationErrorResponse = {
      code: 'validation_error',
      issues,
    };

    response.status(400).json(body);
  }

  private getErrorCode(message: string): string {
    if (message.includes('received undefined')) {
      return 'required';
    }

    if (message.includes('expected')) {
      return 'invalid_type';
    }

    return 'validation_error';
  }

  private formatMessage(
    message: string,
    field: string,
  ): string {
    if (message.includes('received undefined')) {
      return `${field} is required`;
    }

    if (message.includes('expected string')) {
      return `${field} should be a string`;
    }

    if (message.includes('expected number')) {
      return `${field} should be a number`;
    }

    if (message.includes('expected boolean')) {
      return `${field} should be a boolean`;
    }

    if (message.includes('expected array')) {
      return `${field} should be an array`;
    }

    return message;
  }
}
