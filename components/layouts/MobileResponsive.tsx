'use client'

import React, { useState, useEffect } from 'react'
import { Menu, X, Home, Package, Truck, Building2, FileText, Inbox, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MobileNavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const mobileNavItems: MobileNavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Loads', href: '/loads', icon: Package },
  { title: 'Carriers', href: '/carriers', icon: Truck },
  { title: 'Shippers', href: '/shippers', icon: Building2 },
  { title: 'Rate Cons', href: '/rate-confirmations', icon: FileText },
  { title: 'Inbox', href: '/extraction-inbox', icon: Inbox },
]

// Mobile Navigation Bar
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <div className="flex flex-col gap-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-2 px-2">
              <Truck className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">LoadVoice</span>
            </Link>

            <div className="flex flex-col gap-1">
              {mobileNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )
              })}
            </div>

            <div className="mt-auto pt-4 border-t">
              <Link href="/extraction/new" onClick={() => setOpen(false)}>
                <Button className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  New Extraction
                </Button>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Mobile Bottom Navigation (Tab Bar)
export function MobileBottomNav() {
  const pathname = usePathname()

  const bottomNavItems = [
    { title: 'Dashboard', href: '/dashboard', icon: Home },
    { title: 'Loads', href: '/loads', icon: Package },
    { title: 'Extract', href: '/extraction/new', icon: Upload, isPrimary: true },
    { title: 'Carriers', href: '/carriers', icon: Truck },
    { title: 'Inbox', href: '/extraction-inbox', icon: Inbox },
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <div className="grid grid-cols-5 h-16">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center relative"
              >
                <div className="absolute -top-2 bg-blue-600 rounded-full p-3 shadow-lg">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs mt-3 text-blue-600 font-medium">
                  {item.title}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// Responsive Container
export function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-16 lg:pb-0">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}

// Mobile-optimized Card Grid
export function ResponsiveGrid({
  children,
  cols = { sm: 1, md: 2, lg: 3, xl: 4 }
}: {
  children: React.ReactNode
  cols?: { sm?: number; md?: number; lg?: number; xl?: number }
}) {
  const gridClass = cn(
    'grid gap-4',
    `grid-cols-${cols.sm || 1}`,
    `md:grid-cols-${cols.md || 2}`,
    `lg:grid-cols-${cols.lg || 3}`,
    `xl:grid-cols-${cols.xl || 4}`
  )

  return <div className={gridClass}>{children}</div>
}

// Mobile-optimized Table
export function ResponsiveTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            {children}
          </table>
        </div>
      </div>
    </div>
  )
}

// Mobile Header with Actions
export function MobileHeader({
  title,
  subtitle,
  action
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex gap-2">
          {action}
        </div>
      )}
    </div>
  )
}

// Swipeable Card for Mobile
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight
}: {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}) {
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setCurrentX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!isDragging) return

    const diff = currentX - startX
    const threshold = 100 // pixels

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (diff < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    }

    setStartX(0)
    setCurrentX(0)
    setIsDragging(false)
  }

  const translateX = isDragging ? currentX - startX : 0

  return (
    <div
      className="touch-pan-y select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${translateX}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {children}
    </div>
  )
}

// Responsive Stats Card
export function MobileStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend
}: {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  trend?: { value: number; isPositive: boolean }
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <span className={cn(
            'text-sm font-medium',
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          )}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-xs text-gray-500">{subtitle}</span>
      )}
    </div>
  )
}

// Floating Action Button for Mobile
export function MobileFAB({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed bottom-20 right-4 z-40 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
      aria-label="New Extraction"
    >
      <Upload className="h-6 w-6" />
    </button>
  )
}

// Responsive hook
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < 640)
      setIsTablet(width >= 640 && width < 1024)
      setIsDesktop(width >= 1024)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return { isMobile, isTablet, isDesktop }
}