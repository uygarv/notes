import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { OAuthProfile } from './interfaces/oauth-profile.interface';
import { RedisService } from 'src/redis/redis.service';
import { EmailService } from 'src/email/email.service';

const passwordResetTtlSeconds = 15 * 60;
const passwordResetThrottleSeconds = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.validateCredentials(email, password);
    if (!user) {
      throw new UnauthorizedException({
        code: 'invalid_credentials',
      });
    }
    return user;
  }

  async login(user: { id: number; email: string; tokenVersion: number }) {
    const payload = { sub: user.id, email: user.email, tokenVersion: user.tokenVersion };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async createUser(email: string, password: string) {
    const exists = await this.usersService.userExistsByEmail(email);
    if (exists) {
      throw new ConflictException({
        code: 'account_exists',
      });
    }
    const user = await this.usersService.create(email, password);
    return user;
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const requestKey = `password-reset:request:${this.hashValue(normalizedEmail)}`;

    if (await this.redisService.get(requestKey)) {
      return;
    }

    await this.redisService.set(requestKey, '1', passwordResetThrottleSeconds);
    const user = await this.usersService.findPasswordResetUser(normalizedEmail);

    if (!user?.password) {
      return;
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashValue(token);
    await this.redisService.set(`password-reset:token:${tokenHash}`, String(user.id), passwordResetTtlSeconds);

    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      await this.redisService.delete(`password-reset:token:${tokenHash}`);
      this.logger.error('Unable to send password reset email', error instanceof Error ? error.stack : undefined);
    }
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashValue(token);
    const userId = await this.redisService.getAndDelete(`password-reset:token:${tokenHash}`);

    if (!userId) {
      throw new BadRequestException({
        code: 'reset_token_invalid',
      });
    }

    await this.usersService.resetPassword(Number(userId), password);
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
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
