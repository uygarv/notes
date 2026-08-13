import type { ComponentType } from 'react';
import type { OAuthProvider } from '@notes/schemas';

type OAuthProviderDetails = {
  name: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
};

export const oauthProviders: Record<OAuthProvider, OAuthProviderDetails> = {
  google: {
    name: 'Google',
    description: 'Use your Google account to sign in.',
    Icon: GoogleIcon,
  },
  github: {
    name: 'GitHub',
    description: 'Use your GitHub account to sign in.',
    Icon: GitHubIcon,
  },
};

function GoogleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}><path fill="currentColor" d="M21.35 12.27c0-.79-.07-1.55-.21-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.79h3.14c1.84-1.69 2.92-4.18 2.92-7.75Z" /><path fill="currentColor" d="M12 21.75c2.62 0 4.82-.87 6.43-2.35l-3.14-2.79c-.87.58-1.99.92-3.29.92-2.53 0-4.67-1.71-5.44-4.01H3.32v2.88A9.72 9.72 0 0 0 12 21.75Z" opacity=".75" /><path fill="currentColor" d="M6.56 13.52A5.85 5.85 0 0 1 6.25 12c0-.53.09-1.04.31-1.52V7.6H3.32A9.72 9.72 0 0 0 2.28 12c0 1.57.38 3.06 1.04 4.4l3.24-2.88Z" opacity=".55" /><path fill="currentColor" d="M12 6.47c1.42 0 2.69.49 3.69 1.44l2.77-2.77C16.81 3.59 14.62 2.25 12 2.25A9.72 9.72 0 0 0 3.32 7.6l3.24 2.88c.77-2.3 2.91-4.01 5.44-4.01Z" opacity=".9" /></svg>;
}

function GitHubIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor"><path d="M12 2.25a9.75 9.75 0 0 0-3.08 19c.49.09.67-.21.67-.47v-1.7c-2.73.59-3.31-1.16-3.31-1.16-.45-1.14-1.1-1.44-1.1-1.44-.9-.61.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.33 1.08 2.9.83.09-.65.35-1.08.63-1.33-2.18-.25-4.47-1.09-4.47-4.85 0-1.07.38-1.95 1.01-2.64-.1-.25-.44-1.25.1-2.61 0 0 .83-.27 2.7 1.01A9.32 9.32 0 0 1 12 6.4c.83 0 1.67.11 2.45.33 1.87-1.28 2.7-1.01 2.7-1.01.54 1.36.2 2.36.1 2.61.63.69 1.01 1.57 1.01 2.64 0 3.77-2.29 4.59-4.47 4.84.35.3.66.89.66 1.79v3.18c0 .26.18.57.68.47A9.75 9.75 0 0 0 12 2.25Z" /></svg>;
}
