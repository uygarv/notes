import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request) => request?.cookies?.notes_access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: number; email: string; tokenVersion?: number }) {
    if (!await this.usersService.isTokenVersionCurrent(payload.sub, payload.tokenVersion ?? 0)) {
      throw new UnauthorizedException({
        code: 'unauthorized',
      });
    }

    return { userId: payload.sub, email: payload.email };
  }
}
