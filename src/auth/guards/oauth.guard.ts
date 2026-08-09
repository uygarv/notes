import { ExecutionContext, Injectable, Type } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OAuthProvider, OAuthStateType } from "src/constants";
import { OAuthStateService } from "src/auth/oauth-state.service";

export function OAuthGuard(
    strategy: string,
    provider: OAuthProvider,
    type: OAuthStateType,
): Type {
    @Injectable()
    class OAuthGuardMixin extends AuthGuard(strategy) {

        constructor(
            private readonly oauthStateService: OAuthStateService,
        ) {
            super();
        }

        async canActivate(
            context: ExecutionContext,
        ): Promise<boolean> {

            const request =
                context.switchToHttp().getRequest();

            const state =
                await this.oauthStateService.createState({
                    type,
                    provider,

                    ...(type === OAuthStateType.LINK && {
                        userId: request.user.userId,
                    }),
                });

            request.oauthState = state;

            return (await super.canActivate(context)) as boolean;
        }

        getAuthenticateOptions(
            context: ExecutionContext,
        ) {
            const request =
                context.switchToHttp().getRequest();

            return {
                state: request.oauthState,
            };
        }
    }

    return OAuthGuardMixin;
}