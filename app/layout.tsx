import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/AuthContext";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SynQall - CRM Data Entry Automation",
  description: "Upload your sales calls and get CRM-ready data instantly. No integrations required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light antialiased" suppressHydrationWarning>
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
