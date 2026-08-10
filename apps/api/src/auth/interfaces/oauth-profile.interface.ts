import { OAuthProvider } from "src/constants";

export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
}