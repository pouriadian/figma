import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    const base=(process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    return [{source:'/uploads/:path*',destination:`${base}/public-media/:path*`}];
  },
};
export default nextConfig;
