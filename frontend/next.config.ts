/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const backendUrl = process.env.NODE_ENV === 'production'
      ? 'https://bypass-tienz.onrender.com/api/:path*'
      : 'http://localhost:3001/api/:path*';

    return [
      {
        source: '/api/:path*',
        destination: backendUrl,
      },
    ]
  },
};

module.exports = nextConfig;
