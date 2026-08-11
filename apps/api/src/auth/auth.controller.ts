import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';

import { authContract } from '@notes/contracts';

import { OAuthProvider, OAuthStateType } from 'src/constants';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { OAuthGuard } from './guards/oauth.guard';
import { toUserResponse } from 'src/mappers/users.mapper';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  @TsRestHandler(authContract.login)
  @UseGuards(AuthGuard('local'))
  async loginHandler(@Request() req) {
    return tsRestHandler(authContract.login, async () => {
      const result = await this.authService.login(req.user);

      return {
        status: 200,
        body: result,
      };
    });
  }

  @TsRestHandler(authContract.signUp)
  async signUpHandler() {
    return tsRestHandler(authContract.signUp, async ({ body }) => {
      const user = await this.authService.createUser(
        body.email,
        body.password,
      );

      return {
        status: 201,
        body: toUserResponse(user),
      };
    });
  }

  @Get('auth/google')
  @UseGuards(OAuthGuard('google', OAuthProvider.GOOGLE,OAuthStateType.LOGIN))
  googleLogin() {}

  @Get('auth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req, @Query('state') state: string) {
    return this.oauthService.handleCallback(
      OAuthProvider.GOOGLE,
      state,
      req.user,
    );
  }

  @Get('auth/google/link')
  @UseGuards(AuthGuard('jwt'),OAuthGuard('google',OAuthProvider.GOOGLE,OAuthStateType.LINK))
  @ApiBearerAuth()
  async googleLink() {}

  @Get('auth/github')
  @UseGuards(OAuthGuard('github',OAuthProvider.GITHUB,OAuthStateType.LOGIN))
  githubLogin() {}

  @Get('auth/github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Request() req, @Query('state') state: string) {
    return this.oauthService.handleCallback(
      OAuthProvider.GITHUB,
      state,
      req.user,
    );
  }

  @Get('auth/github/link')
  @UseGuards(AuthGuard('jwt'),OAuthGuard('github',OAuthProvider.GITHUB,OAuthStateType.LINK))
  @ApiBearerAuth()
  githubLink() {}
}