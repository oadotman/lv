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
  openGraph: {
    title: "SynQall - AI-Powered CRM Data Entry Automation",
    description: "Upload sales calls and get CRM-ready data instantly. Save 15+ minutes per call with AI-powered transcription and data extraction.",
    url: 'https://synqall.com',
    siteName: 'SynQall',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png', // You should create this image (1200x630px)
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
    images: ['/og-image.png'], // Same as OG image
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
  return (
    <html lang="en" className="light antialiased" suppressHydrationWarning>
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
