'use client'

import { useAuth } from '@/lib/AuthContext'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { CookieConsent } from './CookieConsent'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Auth pages that don't need sidebar or authentication
  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isAuthPage = authPages.some(page => pathname?.startsWith(page))

  // Public pages that don't require authentication (like landing page)
  const publicPages = ['/landing']
  const isPublicPage = publicPages.some(page => pathname?.startsWith(page))

  // Handle redirects based on auth state
  useEffect(() => {
    console.log('AuthLayout: Checking redirects', { loading, hasUser: !!user, isAuthPage, isPublicPage, pathname })

    if (!loading) {
      // If user is logged in and on an auth page, redirect to dashboard
      if (user && isAuthPage) {
        console.log('AuthLayout: User logged in on auth page, redirecting to /')
        router.replace('/')
      }
      // If user is NOT logged in and NOT on an auth page or public page, redirect to landing
      else if (!user && !isAuthPage && !isPublicPage) {
        console.log('AuthLayout: No user on protected page, redirecting to /landing')
        router.replace('/landing')
      }
    }
  }, [user, loading, isAuthPage, isPublicPage, router, pathname])

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Render auth pages and public pages without sidebar but with footer
  if (isAuthPage || isPublicPage) {
    return (
      <>
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">{children}</main>
          {!isPublicPage && <Footer />}
        </div>
        <CookieConsent />
      </>
    )
  }

  // Render protected pages with sidebar (only if user is authenticated)
  if (user) {
    return (
      <>
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <Sidebar />
          <div className="flex-1 lg:ml-56 transition-all duration-300 ease-out flex flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
        <CookieConsent />
      </>
    )
  }

  // Show nothing while redirecting (this prevents flash of unauthorized content)
  return null
}
