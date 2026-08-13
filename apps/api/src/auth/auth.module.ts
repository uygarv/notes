import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { OAuthStateService } from './oauth-state.service';

import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GitHubStrategy } from './strategies/github.strategy';

import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';

import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PassportModule,
    RedisModule,
    UsersModule,
    EmailModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    OAuthService,
    OAuthStateService,

    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    GitHubStrategy,
  ],

  exports: [
    AuthService,
  ],
})
export class AuthModule {}
