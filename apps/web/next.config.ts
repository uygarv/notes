import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@notes/schemas', '@notes/contracts'],
};

export default nextConfig;
