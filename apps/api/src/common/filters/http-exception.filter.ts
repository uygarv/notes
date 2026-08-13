import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { errorCodeSchema, type ErrorCode } from '@notes/schemas';

const statusCodes: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: 'validation_error',
  [HttpStatus.UNAUTHORIZED]: 'unauthorized',
  [HttpStatus.FORBIDDEN]: 'forbidden',
  [HttpStatus.NOT_FOUND]: 'not_found',
  [HttpStatus.CONFLICT]: 'conflict',
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.getStatus();
    const exceptionBody = exception.getResponse();
    const body = typeof exceptionBody === 'object' && exceptionBody !== null
      ? exceptionBody as { code?: unknown; issues?: unknown }
      : {};
    const parsedCode = errorCodeSchema.safeParse(body.code);
    const code = parsedCode.success ? parsedCode.data : statusCodes[status] ?? 'internal_error';

    response.status(status).json({
      code,
      ...(code === 'validation_error' && Array.isArray(body.issues) ? { issues: body.issues } : {}),
    });
  }
}
