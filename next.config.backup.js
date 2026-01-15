const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  reactStrictMode: true,

  // Enable standalone output for production deployment
  output: 'standalone',

  // Enable SWC minification (faster than Terser)
  swcMinify: true,

  // Compiler optimizations for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' && {
      exclude: ['error', 'warn'],
    },
  },

  // Suppress non-critical warnings and optimize chunks
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Suppress Edge Runtime warnings for Node.js runtime
      config.infrastructureLogging = {
        level: 'error',
      };
    } else {
      // Client-side optimizations for LoadVoice
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // React framework bundle
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // LoadVoice core libraries
            loadvoice: {
              name: 'loadvoice-core',
              test: /[\\/]lib[\\/](openai|assemblyai|supabase|analytics|performance).*\.(js|ts)$/,
              priority: 35,
              reuseExistingChunk: true,
            },
            // UI components bundle
            ui: {
              name: 'ui-components',
              test: /[\\/]components[\\/]ui[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            // Large libraries
            lib: {
              test(module) {
                return module.size() > 160000 &&
                  /node_modules[/\\]/.test(module.identifier())
              },
              name: 'large-libs',
              priority: 25,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Common chunks
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
            },
          },
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
        },
      }
    }
    return config;
  },

  // Optimize images
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Production-ready optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,

  // Enable experimental features for better performance
  experimental: {
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
    // Use lighter build analysis
    typedRoutes: false,
  },

  // Security Headers and Performance Caching
  async headers() {
    // Build CSP based on environment
    const isDev = process.env.NODE_ENV === 'development';

    // Content Security Policy
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://cdn.paddle.com https://sandbox-cdn.paddle.com https://app.posthog.com https://*.sentry.io",
      "style-src 'self' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com",
      "img-src 'self' data: blob: https://*.supabase.co https: https://cdn.paddle.com https://sandbox-cdn.paddle.com",
      "font-src 'self' data: https://cdn.paddle.com https://sandbox-cdn.paddle.com",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://api.assemblyai.com https://api.openai.com https://api.paddle.com https://sandbox-api.paddle.com https://buy.paddle.com https://cdn.paddle.com https://sandbox-cdn.paddle.com https://app.posthog.com https://*.sentry.io https://*.inngest.com",
      "media-src 'self' blob: https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src 'self' https://checkout.paddle.com https://sandbox-checkout.paddle.com https://buy.paddle.com",
      "upgrade-insecure-requests",
      isDev && "worker-src 'self' blob:", // Allow service workers in dev
    ].filter(Boolean).join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY' // Stricter than SAMEORIGIN
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self "https://buy.paddle.com" "https://checkout.paddle.com"), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          }
        ],
      },
      // LoadVoice: Cache static assets aggressively
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
      // LoadVoice: Cache images
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|gif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
      // LoadVoice: Cache fonts
      {
        source: '/:all*(woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      },
      // Internal processing endpoints - minimal headers to avoid HTTP parsing issues
      {
        source: '/api/calls/:id/process',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ],
      },
      // Special headers for API routes
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, private'
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow'
          }
        ],
      },
    ]
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps in production only
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
};

// Make sure adding Sentry options is the last code to run before exporting
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
