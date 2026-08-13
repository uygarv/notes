import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';

/**
 * The last-resort API response shape. Typed exception filters handle known
 * validation, HTTP, and Prisma failures before this filter is reached.
 */
@Catch()
export class FallbackExceptionFilter implements ExceptionFilter {
  catch(_exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'internal_error',
    });
  }
}
