import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Body,
  Query,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { OAuthProvider, OAuthStateType } from "src/constants";
import { OAuthStateService } from "src/auth/oauth-state.service";

import { OAuthService } from "src/auth/oauth.service";
import { OAuthGuard } from "./guards/oauth.guard";

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
    async githubLink() {}

    @UseGuards(AuthGuard("jwt"))
    @Get("me")
    getProfile(@Request() req) {
        return req.user;
    }
}
