/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Simplified experimental features - merged from both declarations
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-select',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns'
    ],
    typedRoutes: false,
  },

  // Simplified output - remove standalone for now
  // output: 'standalone',

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' && {
      exclude: ['error', 'warn'],
    },
  },

  // Simplified webpack config - remove complex optimizations for now
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.infrastructureLogging = {
        level: 'error',
      };
    }
    return config;
  },

  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;