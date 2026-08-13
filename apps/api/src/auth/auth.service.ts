import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { OAuthProfile } from './interfaces/oauth-profile.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.validateCredentials(email, password);
    if (!user) {
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: 'Invalid email or password.',
      });
    }
    return user;
  }

  async login(user: { id: number; email: string }) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async createUser(email: string, password: string) {
    const exists = await this.usersService.userExistsByEmail(email);
    if (exists) {
      throw new ConflictException("User already exists");
    }
    const user = await this.usersService.create(email, password);
    return user;
  }

  async validateOAuthUser(profile: OAuthProfile) {
    const identity = await this.usersService.findByIdentity(
        profile.provider,
        profile.providerId,
    );

    if (identity) {
        return identity.user;
    }

    const existingAccount = await this.usersService.findAuthenticationMethods(
      profile.email,
    );

    if (existingAccount) {
      const usesPassword = Boolean(existingAccount.password);
      throw new ConflictException({
        code: usesPassword ? 'use_password' : 'use_provider',
        message: usesPassword
          ? 'This account uses email and password. Sign in with your password, then link this provider from Settings.'
          : 'This email is already associated with another provider. Sign in with that provider first.',
      });
    }

    return this.usersService.createOAuthUser({
        email: profile.email,
        provider: profile.provider,
        providerId: profile.providerId,
    });
  }
  async linkOAuthAccount(userId: number, profile: OAuthProfile) {
    return this.usersService.linkOAuthAccount(
        userId,
        profile,
    );
  }
}
