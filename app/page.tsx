"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Root Page - Redirect Handler
 *
 * This page handles the root route (/) by redirecting users based on their auth state:
 * - Authenticated users → redirected to dashboard (managed by AuthLayout)
 * - Unauthenticated users → redirected to /landing page
 *
 * The actual dashboard is backed up in page-backup.tsx for reference.
 */
export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is logged in, redirect to dashboard
        router.replace('/dashboard');
      } else {
        // User is not logged in, redirect to landing page
        router.replace('/landing');
      }
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-violet-600 dark:text-violet-400 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}
