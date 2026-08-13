import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";
import { OAuthProvider, OAuthStateType } from "src/constants";
import { OAuthStateService } from "src/auth/oauth-state.service";

export type OAuthCallbackResult =
    | { type: 'login'; accessToken: string }
    | { type: 'link' };

export class OAuthCallbackFailure extends Error {
    constructor(
        public readonly stateType: OAuthStateType,
        public readonly originalError: unknown,
    ) {
        super('OAuth callback failed');
    }
}

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
    ): Promise<OAuthCallbackResult> {
        const state =
            await this.oauthStateService.consumeState(stateToken);

        if (state.provider !== provider) {
            throw new UnauthorizedException({
              code: 'oauth_provider_invalid',
            });
        }

        try {
            if (state.type === OAuthStateType.LINK) {
                await this.authService.linkOAuthAccount(
                    state.userId!,
                    oauthUser,
                );

                return { type: 'link' };
            }

            const user =
                await this.authService.validateOAuthUser(
                    oauthUser,
                );

            const { access_token: accessToken } =
                await this.authService.login(user);

            return { type: 'login', accessToken };
        } catch (error) {
            throw new OAuthCallbackFailure(state.type, error);
        }
    }
}
