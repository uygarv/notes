import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-github2";

import { OAuthProvider } from "src/constants";

@Injectable()
export class GitHubStrategy
    extends PassportStrategy(Strategy, 'github') {

    constructor() {
        super({
            clientID: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            callbackURL:
                `${process.env.APP_URL}/auth/github/callback`,
            scope: ['user:email'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
    ) {
        const email = profile.emails?.[0]?.value;

        if (!email) {
            throw new UnauthorizedException(
                'GitHub account has no email',
            );
        }

        return {
            provider: OAuthProvider.GITHUB,
            providerId: profile.id,
            email,
        };
    }
}