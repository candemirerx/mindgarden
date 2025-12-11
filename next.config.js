/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.110', '192.168.1.*', 'localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Performans optimizasyonları
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Bundle analizi için
  webpack: (config, { isServer }) => {
    // Tree shaking için
    config.optimization = {
      ...config.optimization,
      sideEffects: true,
    };
    return config;
  },
}

module.exports = nextConfig
