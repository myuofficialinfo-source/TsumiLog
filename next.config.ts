import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.cloudflare.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'steamcdn-a.akamaihd.net',
      },
      {
        protocol: 'https',
        hostname: 'shared.akamai.steamstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.akamai.steamstatic.com',
      },
    ],
  },
};

export default nextConfig;
