import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/AuthContext";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://synqall.com'),
  title: {
    default: "SynQall - AI-Powered CRM Data Entry Automation for Sales Teams",
    template: "%s | SynQall"
  },
  description: "Transform sales calls into CRM-ready data instantly with AI. Save 15+ minutes per call. Upload audio, get transcripts, extract key insights. No CRM integration required. Try free!",
  keywords: [
    "CRM automation",
    "sales call transcription",
    "AI data entry",
    "sales productivity",
    "call recording software",
    "CRM data extraction",
    "sales automation tool",
    "call analytics",
    "AssemblyAI transcription",
    "OpenAI integration"
  ],
  authors: [{ name: "SynQall Team" }],
  creator: "SynQall",
  publisher: "SynQall",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://synqall.com',
  },
  openGraph: {
    title: "SynQall - AI-Powered CRM Data Entry Automation",
    description: "Upload sales calls and get CRM-ready data instantly. Save 15+ minutes per call with AI-powered transcription and data extraction.",
    url: 'https://synqall.com',
    siteName: 'SynQall',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://synqall.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SynQall - CRM Data Entry Automation',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SynQall - AI-Powered CRM Data Entry Automation',
    description: 'Transform sales calls into CRM-ready data instantly. Save 15+ minutes per call.',
    images: ['https://synqall.com/og-image.png'],
    creator: '@synqall',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'android-chrome',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome',
        url: '/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Structured data for Google rich results with sitelinks
  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SynQall",
    "url": "https://synqall.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://synqall.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "sameAs": [
      "https://twitter.com/synqall",
      "https://linkedin.com/company/synqall"
    ]
  };

  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SynQall",
    "url": "https://synqall.com",
    "logo": "https://synqall.com/logo.png",
    "description": "AI-powered CRM data entry automation platform",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+1-support-number",
      "contactType": "Customer Support",
      "availableLanguage": "English"
    }
  };

  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SynQall",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "AI-powered CRM data entry automation that transforms sales calls into CRM-ready data instantly. Save 15+ minutes per call with automatic transcription and data extraction.",
    "url": "https://synqall.com",
    "image": "https://synqall.com/og-image.png",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "0",
      "highPrice": "499",
      "offerCount": "3"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "100",
      "bestRating": "5"
    },
    "featureList": [
      "AI-powered call transcription",
      "Automatic CRM data extraction",
      "No CRM integration required",
      "GDPR compliant",
      "Team collaboration",
      "Custom templates"
    ]
  };

  // Breadcrumb for better navigation understanding
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://synqall.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Pricing",
        "item": "https://synqall.com/pricing"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Sign In",
        "item": "https://synqall.com/signin"
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "Get Started",
        "item": "https://synqall.com/signup"
      },
      {
        "@type": "ListItem",
        "position": 5,
        "name": "Partners",
        "item": "https://synqall.com/partners"
      }
    ]
  };

  const allStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      websiteStructuredData,
      organizationStructuredData,
      softwareStructuredData,
      breadcrumbStructuredData
    ]
  };

  return (
    <html lang="en" className="light antialiased" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#7c3aed" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(allStructuredData) }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider>
            <AnalyticsProvider>
              <AuthProvider>
                <AuthLayout>
                  {children}
                </AuthLayout>
                <Toaster />
              </AuthProvider>
            </AnalyticsProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
