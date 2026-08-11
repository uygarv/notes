import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';
import { loginSchema } from '@notes/schemas';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string) {
    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      throw new UnauthorizedException();
    }

    return this.authService.validateUser(result.data.email, result.data.password);
  }
}