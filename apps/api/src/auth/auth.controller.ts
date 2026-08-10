import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Body,
  Query,
  Patch,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { OAuthProvider, OAuthStateType } from "src/constants";
import { OAuthStateService } from "src/auth/oauth-state.service";

import { OAuthService } from "src/auth/oauth.service";
import { OAuthGuard } from "./guards/oauth.guard";

import { ApiBody } from "@nestjs/swagger";

@Controller({
    path: "auth",
})
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly oauthStateService: OAuthStateService,
        private readonly oauthService: OAuthService,
    ) {}

    @UseGuards(AuthGuard("local"))
    @ApiBody({
    schema: {
        type: 'object',
        properties: {
            email: {
                type: 'string',
                example: 'user@example.com',
            },
            password: {
                type: 'string',
                example: 'password123',
            },
        },
        required: ['email', 'password'],
    },
    })
    @Post("login")
    async login(@Request() req) {
        return this.authService.login(req.user);
    }

    @Post("sign-up")
    async signUp(@Body() body: CreateUserDto) {
        return this.authService.createUser(body.email, body.password);
    }

    @Get("google")
    @UseGuards(OAuthGuard('google', OAuthProvider.GOOGLE, OAuthStateType.LOGIN))
    googleLogin() {}

    @Get("google/callback")
    @UseGuards(AuthGuard("google"))
    async googleCallback(
        @Request() req,
        @Query("state") state: string,
    ) {
        return this.oauthService.handleCallback(
            OAuthProvider.GOOGLE,
            state,
            req.user,
        );
    }

    @Get('google/link')
    @UseGuards(AuthGuard("jwt"), OAuthGuard('google', OAuthProvider.GOOGLE, OAuthStateType.LINK))
    @ApiBearerAuth()
    async googleLink() {}

    @Get("github")
    @UseGuards(OAuthGuard('github', OAuthProvider.GITHUB, OAuthStateType.LOGIN))
    githubLogin() {}

    @Get('github/callback')
    @UseGuards(AuthGuard('github'))
    async githubCallback(
        @Request() req,
        @Query("state") state: string,
    ) {
        return this.oauthService.handleCallback(
            OAuthProvider.GITHUB,
            state,
            req.user,
        );
    }

    @Get('github/link')
    @UseGuards(AuthGuard("jwt"), OAuthGuard('github', OAuthProvider.GITHUB, OAuthStateType.LINK))
    @ApiBearerAuth()
    async githubLink() {}
}
