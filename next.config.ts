import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
          {
            key: 'Permissions-Policy',
            value: 'microphone=(self), camera=(self)'
          }
        ],
      },
    ];
  },
};

export default nextConfig;