import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(error: unknown, user: unknown): TUser {
    return (error ? null : user ?? null) as TUser;
  }
}
