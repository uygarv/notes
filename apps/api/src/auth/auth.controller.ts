import {
  Controller,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { Response } from 'express';

import { authContract } from '@notes/contracts';
import { errorCodeSchema, type ErrorCode } from '@notes/schemas';

import { OAuthProvider, OAuthStateType } from 'src/constants';
import { AuthService } from './auth.service';
import { OAuthCallbackFailure, OAuthService } from './oauth.service';
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
  async loginHandler(@Request() req, @Res({ passthrough: true }) response: Response) {
    return tsRestHandler(authContract.login, async () => {
      const result = await this.authService.login(req.user);
      this.setSessionCookie(response, result.access_token);

      return {
        status: 204,
        body: undefined,
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

  @TsRestHandler(authContract.forgotPassword)
  async forgotPasswordHandler() {
    return tsRestHandler(authContract.forgotPassword, async ({ body }) => {
      await this.authService.requestPasswordReset(body.email);

      return { status: 204, body: undefined };
    });
  }

  @TsRestHandler(authContract.resetPassword)
  async resetPasswordHandler(@Res({ passthrough: true }) response: Response) {
    return tsRestHandler(authContract.resetPassword, async ({ body }) => {
      await this.authService.resetPassword(body.token, body.password);
      this.clearSessionCookie(response);

      return { status: 204, body: undefined };
    });
  }

  @Get('auth/google')
  @UseGuards(OAuthGuard('google', OAuthProvider.GOOGLE,OAuthStateType.LOGIN))
  googleLogin() {}

  @Get('auth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Request() req,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    return this.handleOAuthCallback(
      OAuthProvider.GOOGLE,
      state,
      req.user,
      response,
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
  async githubCallback(
    @Request() req,
    @Query('state') state: string,
    @Res() response: Response,
  ) {
    return this.handleOAuthCallback(
      OAuthProvider.GITHUB,
      state,
      req.user,
      response,
    );
  }

  @Get('auth/github/link')
  @UseGuards(AuthGuard('jwt'),OAuthGuard('github',OAuthProvider.GITHUB,OAuthStateType.LINK))
  @ApiBearerAuth()
  githubLink() {}

  private setSessionCookie(response: Response, token: string) {
    response.cookie('notes_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN
        ? { domain: process.env.COOKIE_DOMAIN }
        : {}),
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @TsRestHandler(authContract.logout)
  @UseGuards(AuthGuard('jwt'))
  async logoutHandler(@Res({ passthrough: true }) response: Response) {
    return tsRestHandler(authContract.logout, async () => {
      this.clearSessionCookie(response);

      return { status: 204, body: undefined };
    });
  }

  private clearSessionCookie(response: Response) {
    response.clearCookie('notes_access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        ...(process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN
          ? { domain: process.env.COOKIE_DOMAIN }
          : {}),
    });
  }

  private async handleOAuthCallback(
    provider: OAuthProvider,
    state: string,
    oauthUser: unknown,
    response: Response,
  ) {
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3001';

    try {
      const result = await this.oauthService.handleCallback(
        provider,
        state,
        oauthUser,
      );

      if (result.type === 'login') {
        this.setSessionCookie(response, result.accessToken);
        return response.redirect(`${webUrl}/auth/callback`);
      }

      return response.redirect(`${webUrl}/settings?linked=${provider}`);
    } catch (error) {
      const callbackFailure = error instanceof OAuthCallbackFailure ? error : null;
      const originalError = callbackFailure?.originalError ?? error;
      const status = typeof originalError === 'object' && originalError && 'getStatus' in originalError
        ? (originalError as { getStatus(): number }).getStatus()
        : 500;
      const code = this.getOAuthErrorCode(originalError, status);

      if (callbackFailure?.stateType === OAuthStateType.LINK) {
        return response.redirect(`${webUrl}/settings?link_error=${code}`);
      }

      return response.redirect(`${webUrl}/login?error=${code}`);
    }
  }

  private getOAuthErrorCode(error: unknown, status: number): ErrorCode {
    if (typeof error === 'object' && error && 'getResponse' in error && typeof error.getResponse === 'function') {
      const body = error.getResponse();
      if (typeof body === 'object' && body && 'code' in body) {
        const code = errorCodeSchema.safeParse(body.code);
        if (code.success) return code.data;
      }
    }

    return status === 409 ? 'account_exists' : 'oauth_failed';
  }
}
