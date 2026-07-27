import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '**.ytimg.com' },
    ],
  },
  transpilePackages: ['@syncroom/shared'],
};

export default nextConfig;
