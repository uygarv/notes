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
    if (!user) throw new UnauthorizedException();
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

    const exists = await this.usersService.userExistsByEmail(
        profile.email,
    );

    if (exists) {
        throw new ConflictException(
          `An account with this email already exists. Please sign in with your existing method first, then link this provider.`,
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
