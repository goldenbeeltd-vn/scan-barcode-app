/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // PWA configuration will be added via next-pwa plugin if needed
  // For now, we'll handle PWA manually with our service worker
};

module.exports = nextConfig;
