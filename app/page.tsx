'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('🏠 HomePage: Checking auth state', {
      loading,
      hasUser: !!user,
      userId: user?.id,
      timestamp: new Date().toISOString()
    })

    // Only redirect when loading is complete
    if (!loading) {
      if (user) {
        console.log('🏠 HomePage: User authenticated, redirecting to /dashboard')
        router.replace('/dashboard')
      } else {
        console.log('🏠 HomePage: No user, redirecting to /landing')
        router.replace('/landing')
      }
    }
  }, [user, loading, router])

  // Show loading while determining where to redirect
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}