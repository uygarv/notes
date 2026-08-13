import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { PrismaClientKnownRequestError  } from '@prisma/client/runtime/library';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ) {
    const response = host.switchToHttp().getResponse();

    switch (exception.code) {
      case 'P2025':
        response.status(HttpStatus.NOT_FOUND).json({
          code: 'not_found',
        });
        break;

      case 'P2002':
        response.status(HttpStatus.CONFLICT).json({
          code: 'conflict',
        });
        break;

      default:
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          code: 'internal_error',
        });
    }
  }
}
