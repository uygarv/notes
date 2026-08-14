import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@notes/schemas', '@notes/contracts'],
  env: {
    NEXT_PUBLIC_FORGOT_PASSWORD_ENABLED:
      process.env.FORGOT_PASSWORD_ENABLED === 'true' ? 'true' : 'false',
  },
};

export default nextConfig;
