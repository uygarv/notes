import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';

import { migrateSessionCookie } from './session-cookie';

@Injectable()
export class SessionCookieMigrationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: unknown }>();

    if (request.user) {
      migrateSessionCookie(
        http.getResponse<Response>(),
        request.cookies?.notes_access_token,
      );
    }

    return next.handle();
  }
}
