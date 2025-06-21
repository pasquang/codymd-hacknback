/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['caretracker.com'],
  },
  experimental: {
    typedRoutes: true,
  }
};

module.exports = nextConfig;