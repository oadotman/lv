/**
 * LoadVoice Lazy Loading Utilities
 * Dynamic imports and code splitting for optimal performance
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Loading skeleton for lazy loaded components
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 w-48 bg-gray-200 rounded"></div>
    </div>
  </div>
)

// Dashboard components
export const DashboardStats = dynamic(
  () => import('@/components/dashboard/DashboardStats'),
  {
    loading: () => <LoadingFallback />,
    ssr: true, // Keep SSR for SEO
  }
)

export const RecentExtractions = dynamic(
  () => import('@/components/dashboard/RecentExtractions'),
  {
    loading: () => <LoadingFallback />,
    ssr: false, // Client-side only
  }
)

export const LoadsOverview = dynamic(
  () => import('@/components/dashboard/LoadsOverview'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

// Load management components
export const LoadsTable = dynamic(
  () => import('@/components/loads/LoadsTable'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const LoadDetails = dynamic(
  () => import('@/components/loads/LoadDetails'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const LoadForm = dynamic(
  () => import('@/components/loads/LoadForm'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

// Carrier components
export const CarriersTable = dynamic(
  () => import('@/components/carriers/CarriersTable'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const CarrierDetails = dynamic(
  () => import('@/components/carriers/CarrierDetails'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

// Extraction components - critical path, preload
export const ExtractionFlow = dynamic(
  () => import('@/components/extraction/ExtractionFlow').then(mod => mod.ExtractionFlow),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const ExtractionInbox = dynamic(
  () => import('@/components/extraction/ExtractionInbox'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

// Heavy components - lazy load on demand
export const RateConfirmationViewer = dynamic(
  () => import('@/components/loads/RateConfirmationViewer'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const AudioPlayer = dynamic(
  () => import('@/components/calls/AudioPlayer'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const TranscriptViewer = dynamic(
  () => import('@/components/calls/TranscriptViewer'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

// Charts - heavy library
export const PerformanceChart = dynamic(
  () => import('@/components/charts/PerformanceChart'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const LaneAnalytics = dynamic(
  () => import('@/components/charts/LaneAnalytics'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

// Modals - not needed on initial load
export const UploadModal = dynamic(
  () => import('@/components/modals/UploadModal').then(mod => mod.UploadModal),
  {
    loading: () => null,
    ssr: false,
  }
)

export const LoadEditModal = dynamic(
  () => import('@/components/modals/LoadEditModal'),
  {
    loading: () => null,
    ssr: false,
  }
)

export const CarrierSearchModal = dynamic(
  () => import('@/components/modals/CarrierSearchModal'),
  {
    loading: () => null,
    ssr: false,
  }
)

// Settings pages - rarely accessed
export const BillingSettings = dynamic(
  () => import('@/app/settings/billing/page'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const TeamSettings = dynamic(
  () => import('@/app/settings/team/page'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

export const IntegrationsSettings = dynamic(
  () => import('@/app/settings/integrations/page'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
)

/**
 * Preload component for critical paths
 */
export function preloadComponent(
  componentName:
    | 'ExtractionFlow'
    | 'LoadsTable'
    | 'DashboardStats'
    | 'UploadModal'
) {
  switch (componentName) {
    case 'ExtractionFlow':
      import('@/components/extraction/ExtractionFlow')
      break
    case 'LoadsTable':
      import('@/components/loads/LoadsTable')
      break
    case 'DashboardStats':
      import('@/components/dashboard/DashboardStats')
      break
    case 'UploadModal':
      import('@/components/modals/UploadModal')
      break
  }
}

/**
 * Prefetch data for upcoming navigation
 */
export async function prefetchPageData(route: string) {
  // Use Next.js router prefetch
  if (typeof window !== 'undefined') {
    const router = await import('next/navigation').then(mod => mod.useRouter)
    // Router will be called in component context
  }
}

/**
 * Load critical CSS
 */
export function loadCriticalCSS() {
  if (typeof window !== 'undefined') {
    // Load critical CSS for above-the-fold content
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = '/styles/critical.css'
    document.head.appendChild(link)
  }
}

/**
 * Progressive image loading
 */
export function progressiveImage(src: string, placeholder: string) {
  return {
    src: placeholder,
    'data-src': src,
    className: 'progressive-image',
    loading: 'lazy' as const,
  }
}

/**
 * Resource hints for better performance
 */
export function addResourceHints() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Preconnect to critical domains
    const domains = [
      'https://api.assemblyai.com',
      'https://api.openai.com',
      'https://cdn.paddle.com',
    ]

    domains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = domain
      document.head.appendChild(link)
    })

    // DNS prefetch for other domains
    const dnsDomains = [
      'https://app.posthog.com',
      'https://sentry.io',
    ]

    dnsDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = domain
      document.head.appendChild(link)
    })
  }
}

/**
 * Web Vitals optimization
 */
export function optimizeWebVitals() {
  if (typeof window !== 'undefined') {
    // Optimize Largest Contentful Paint (LCP)
    const images = document.querySelectorAll('img[loading="lazy"]')
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            img.src = img.dataset.src || img.src
            imageObserver.unobserve(img)
          }
        })
      })

      images.forEach(img => imageObserver.observe(img))
    }

    // Optimize First Input Delay (FID)
    document.addEventListener('click', () => {
      // Preload interactive components on first interaction
      preloadComponent('UploadModal')
      preloadComponent('LoadsTable')
    }, { once: true })

    // Optimize Cumulative Layout Shift (CLS)
    // Add dimensions to images and videos
    document.querySelectorAll('img:not([width])').forEach(img => {
      const imgElement = img as HTMLImageElement
      if (imgElement.naturalWidth) {
        imgElement.width = imgElement.naturalWidth
        imgElement.height = imgElement.naturalHeight
      }
    })
  }
}

// Initialize optimizations
if (typeof window !== 'undefined') {
  // Run on page load
  window.addEventListener('load', () => {
    optimizeWebVitals()
    addResourceHints()
  })

  // Preload critical components for common user paths
  setTimeout(() => {
    preloadComponent('ExtractionFlow')
    preloadComponent('DashboardStats')
  }, 2000)
}