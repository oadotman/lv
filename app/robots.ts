import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://loadvoice.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/calls/',
          '/loads/',
          '/carriers/',
          '/shippers/',
          '/lanes/',
          '/settings/',
          '/analytics/',
          '/team/',
          '/referrals/',
          '/api/',
          '/_next/',
          '/static/',
          '/admin/',
          '/partners/dashboard/',
          '/onboarding/',
          '/upgrade/',
          '/overage/',
          '/billing/',
          '/pay-overage/',
          '/invite/',
          '/invite-signup/',
        ],
      },
      {
        userAgent: 'Twitterbot',
        allow: '/',
      },
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      {
        userAgent: 'LinkedInBot',
        allow: '/',
      },
      {
        userAgent: 'WhatsApp',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}