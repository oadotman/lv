import { MetadataRoute } from 'next'
import { getBlogFiles, getBlogPost } from '@/lib/blog'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://loadvoice.com'
  const currentDate = new Date()

  // Get all blog posts dynamically
  const blogFiles = getBlogFiles()
  const blogPosts = blogFiles
    .map(file => {
      const slug = file.replace('.mdx', '')
      const post = getBlogPost(slug)
      if (post && post.frontmatter.published) {
        return {
          url: `${baseUrl}/blog/${slug}`,
          lastModified: new Date(post.frontmatter.date),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }
      }
      return null
    })
    .filter(Boolean) as MetadataRoute.Sitemap

  // Define all public pages with optimized priorities for Google indexing
  const staticRoutes: MetadataRoute.Sitemap = [
    // ========== PRIMARY PAGES (Priority 1.0 - 0.9) ==========
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0, // Homepage - highest priority
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.95, // Critical for user access
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.95, // Critical for conversion
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9, // Important for conversion
    },
    {
      url: `${baseUrl}/features`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9, // Key product information
    },

    // ========== SECONDARY PAGES (Priority 0.8 - 0.7) ==========
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8, // Customer support
    },
    {
      url: `${baseUrl}/help`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8, // Support documentation
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: 'daily', // Blog index updates frequently
      priority: 0.75, // Content marketing hub
    },
    {
      url: `${baseUrl}/partners`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7, // Partner program
    },

    // ========== LOADVOICE SPECIFIC FEATURES (Priority 0.7 - 0.6) ==========
    {
      url: `${baseUrl}/extraction-inbox`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7, // Feature showcase
    },
    {
      url: `${baseUrl}/loads/demo`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7, // Demo page
    },
    {
      url: `${baseUrl}/carriers/verify`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.65, // Carrier verification feature
    },
    {
      url: `${baseUrl}/shippers`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.65, // Shipper information
    },

    // ========== PARTNER PAGES (Priority 0.6) ==========
    {
      url: `${baseUrl}/partners/apply`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/partners/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // ========== AUTH/ACCOUNT PAGES (Priority 0.5) ==========
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/reset-password`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.5,
    },

    // ========== LEGAL/COMPLIANCE PAGES (Priority 0.3) ==========
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/gdpr`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Combine static routes with blog posts
  return [...staticRoutes, ...blogPosts]
}