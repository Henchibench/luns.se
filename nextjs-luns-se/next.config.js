/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Experimental features for Next.js 15+
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://api-modern:8000/:path*',
      },
    ];
  },
}

module.exports = nextConfig 