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

  // Pages that don't require authentication and don't show sidebar
  const publicPages = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isPublicPage = pathname === '/' || publicPages.some(page => pathname?.startsWith(page))

  // Pages that show sidebar (all authenticated pages)
  const protectedPages = ['/dashboard', '/calls', '/analytics', '/templates', '/settings', '/help', '/invite']
  const isProtectedPage = protectedPages.some(page => pathname?.startsWith(page))

  // Log for debugging with more detail
  useEffect(() => {
    console.log('🔍 AuthLayout render state:', {
      loading,
      hasUser: !!user,
      userId: user?.id,
      pathname,
      isPublicPage,
      isProtectedPage,
      timestamp: new Date().toISOString()
    })
  }, [loading, user, pathname, isPublicPage, isProtectedPage])

  // Handle authentication and redirects
  useEffect(() => {
    if (!loading) {
      // If on a protected page without user, redirect to login
      if (isProtectedPage && !user) {
        console.log('AuthLayout: No user on protected page, redirecting to /login')
        router.replace('/login')
      }
      // If user is logged in and on login/signup pages, redirect to dashboard
      else if (user && (pathname === '/login' || pathname === '/signup')) {
        console.log('AuthLayout: User logged in on auth page, redirecting to /dashboard')
        router.replace('/dashboard')
      }
    }
  }, [user, loading, isProtectedPage, router, pathname])

  // For public pages, render without sidebar
  if (isPublicPage) {
    return (
      <>
        <div className="flex flex-col min-h-screen">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <CookieConsent />
      </>
    )
  }

  // For protected pages, show loading while auth is being checked
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

  // For protected pages with authenticated user, ALWAYS show sidebar
  if (user && isProtectedPage) {
    console.log('🎯 Rendering protected page with sidebar for user:', user.id)
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

  // For authenticated users on any other page (fallback to show sidebar)
  if (user && !isPublicPage) {
    console.log('🔄 Fallback: Rendering with sidebar for authenticated user on:', pathname)
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

  // For unauthenticated users or edge cases
  console.log('⚠️ Rendering without sidebar - user:', !!user, 'pathname:', pathname)
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">{children}</main>
      </div>
      <CookieConsent />
    </>
  )
}