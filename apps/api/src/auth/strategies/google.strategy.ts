import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { OAuthProvider } from 'src/constants';
import { OAuthProfile } from '../interfaces/oauth-profile.interface';

@Injectable()
export class GoogleStrategy extends PassportStrategy(
  Strategy,
  'google',
) {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        `${process.env.APP_URL}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<OAuthProfile> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException({
        code: 'oauth_email_unavailable',
      });
    }

    return {
      provider: OAuthProvider.GOOGLE,
      providerId: profile.id,
      email,
    };
  }
}
