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
  metadataBase: new URL('https://loadvoice.com'),
  title: {
    default: "LoadVoice - Voice-Powered CRM for Freight Brokers",
    template: "%s | LoadVoice"
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'mask-icon', url: '/loadvoice-logo.svg', color: '#2563eb' },
    ],
  },
  description: "Voice-powered CRM for freight brokers. Automatically capture load details, carrier information, and customer data from phone calls. Save hours on data entry and never miss critical shipment information.",
  keywords: [
    "freight broker CRM",
    "transportation CRM",
    "load management software",
    "freight broker automation",
    "logistics CRM",
    "carrier management system",
    "freight call recording",
    "load tracking software",
    "broker TMS integration",
    "voice-powered logistics",
    "freight documentation automation",
    "carrier onboarding automation"
  ],
  authors: [{ name: "Loadvoice Team" }],
  creator: "Loadvoice",
  publisher: "Loadvoice",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://loadvoice.com',
  },
  openGraph: {
    title: "Loadvoice - Voice-Powered CRM for Freight Brokers",
    description: "Automatically capture load details, carrier info, and rates from phone calls. Built specifically for freight brokers to save hours on data entry.",
    url: 'https://loadvoice.com',
    siteName: 'Loadvoice',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://loadvoice.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Loadvoice - Voice-Powered CRM for Freight Brokers',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loadvoice - Voice-Powered CRM for Freight Brokers',
    description: 'Automatically capture load details and carrier info from calls. Built for freight brokers.',
    images: ['https://loadvoice.com/og-image.png'],
    creator: '@loadvoice',
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
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Consolidated structured data for Google rich results - no duplicates
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // WebSite schema without SearchAction (no search functionality yet)
      {
        "@type": "WebSite",
        "name": "LoadVoice",
        "url": "https://loadvoice.com",
        "description": "AI-powered call documentation platform for freight brokers"
      },
      // Organization schema for knowledge panel
      {
        "@type": "Organization",
        "name": "LoadVoice",
        "url": "https://loadvoice.com",
        "logo": "https://loadvoice.com/logo.png",
        "description": "AI-powered call documentation platform for freight brokers",
        "email": "support@loadvoice.com",
        "sameAs": [
          "https://twitter.com/loadvoice",
          "https://linkedin.com/company/loadvoice"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "support@loadvoice.com",
          "contactType": "customer support",
          "availableLanguage": "English",
          "url": "https://loadvoice.com/contact"
        }
      },
      // SoftwareApplication schema for product info
      {
        "@type": "SoftwareApplication",
        "name": "LoadVoice",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Voice-powered CRM for freight brokers that automatically captures load details, carrier information, rates, and customer requirements from phone calls.",
        "url": "https://loadvoice.com",
        "image": "https://loadvoice.com/og-image.png",
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "USD",
          "lowPrice": "0",
          "highPrice": "499",
          "offerCount": "5"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "500",
          "bestRating": "5"
        },
        "featureList": [
          "Voice-powered load data capture",
          "Automatic carrier information extraction",
          "Rate and lane tracking",
          "Load board integration ready",
          "Compliance documentation",
          "Multi-broker team support"
        ]
      },
      // Breadcrumb for better navigation understanding
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://loadvoice.com"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Features",
            "item": "https://loadvoice.com/features"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Pricing",
            "item": "https://loadvoice.com/pricing"
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": "Sign In",
            "item": "https://loadvoice.com/login"
          },
          {
            "@type": "ListItem",
            "position": 5,
            "name": "Get Started",
            "item": "https://loadvoice.com/signup"
          }
        ]
      }
    ]
  };

  return (
    <html lang="en" className="light antialiased" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://loadvoice.com" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
        <meta property="og:site_name" content="Loadvoice" />
        <meta property="og:url" content="https://loadvoice.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
