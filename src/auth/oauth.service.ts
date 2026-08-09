import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";
import { OAuthProvider, OAuthStateType } from "src/constants";
import { OAuthStateService } from "src/auth/oauth-state.service";

@Injectable()
export class OAuthService {
    constructor(
        private readonly oauthStateService: OAuthStateService,
        private readonly authService: AuthService,
    ) {}

    async handleCallback(
        provider: OAuthProvider,
        stateToken: string,
        oauthUser: any,
    ) {
        const state =
            await this.oauthStateService.consumeState(stateToken);

        if (state.provider !== provider) {
            throw new UnauthorizedException(
                "Invalid OAuth provider",
            );
        }

        if (state.type === OAuthStateType.LINK) {
            return this.authService.linkOAuthAccount(
                state.userId!,
                oauthUser,
            );
        }

        const user =
            await this.authService.validateOAuthUser(
                oauthUser,
            );

        return this.authService.login(user);
    }
}