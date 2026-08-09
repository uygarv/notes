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
          statusCode: 404,
          message: 'Resource not found',
        });
        break;

      case 'P2002':
        response.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'Unique constraint failed',
        });
        break;

      default:
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: 500,
          message: 'An error occured',
        });
    }
  }
}