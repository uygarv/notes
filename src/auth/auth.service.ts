import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    if (!user) throw new UnauthorizedException();
    const { password: _, ...result } = user;
    return result;
  }

  async login(user: { id: number; email: string }) {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async createUser(email: string, password: string) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException("User already exists");
    }
    const user = await this.usersService.create(email, password);
    const { password: _, ...result } = user;
    return result;
  }

  async validateOAuthUser(profile: OAuthProfile) {
    const identity = await this.usersService.findByIdentity(
        profile.provider,
        profile.providerId,
    );

    if (identity) {
        return identity.user;
    }

    const existingUser = await this.usersService.findByEmail(
        profile.email,
    );

    if (existingUser) {
        throw new UnauthorizedException(
          `An account with this email already exists. Please sign in with your existing method first, then connect ${profile.provider}.`,
        );
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
