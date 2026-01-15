import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Truck, Package, FileText } from 'lucide-react'

// Dashboard card skeleton
export function DashboardCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

// Table row skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

// Load card skeleton
export function LoadCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-36" />
        <div className="flex items-center gap-4 mt-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}

// Full page loading
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

// Extraction loading animation
export function ExtractionLoader({ stage = 'uploading' }: { stage?: string }) {
  const stages = {
    uploading: { icon: Package, text: 'Uploading call recording...', progress: 25 },
    transcribing: { icon: FileText, text: 'Transcribing audio...', progress: 50 },
    extracting: { icon: Truck, text: 'Extracting freight data...', progress: 75 },
    saving: { icon: Package, text: 'Saving to CRM...', progress: 90 }
  }

  const currentStage = stages[stage as keyof typeof stages] || stages.uploading
  const Icon = currentStage.icon

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping" />
        <div className="relative bg-white rounded-full p-4 shadow-lg">
          <Icon className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
      </div>
      <p className="mt-6 text-lg font-medium">{currentStage.text}</p>
      <div className="w-64 mt-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{currentStage.progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${currentStage.progress}%` }}
          />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        This usually takes less than 60 seconds
      </p>
    </div>
  )
}

// Success animation
export function SuccessAnimation({ message = 'Success!' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-ping" />
        <div className="relative bg-green-100 rounded-full p-4">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <p className="mt-4 text-lg font-medium">{message}</p>
    </div>
  )
}

// Error state
export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again later',
  onRetry
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-red-100 rounded-full p-4 mb-4">
        <svg
          className="h-8 w-8 text-red-600"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

// Empty state
export function EmptyState({
  icon: Icon = Package,
  title = 'No data yet',
  description = 'Get started by adding your first item',
  actionLabel = 'Get Started',
  onAction
}: {
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="bg-gray-100 rounded-full p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// Shimmer effect for text loading
export function ShimmerText({ width = 'w-32', height = 'h-4' }: { width?: string; height?: string }) {
  return (
    <div className={`${width} ${height} bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-shimmer`} />
  )
}

// Add the shimmer animation to your global CSS:
// @keyframes shimmer {
//   0% { background-position: -200% center; }
//   100% { background-position: 200% center; }
// }
// .animate-shimmer {
//   animation: shimmer 2s ease-in-out infinite;
//   background-size: 200% 100%;
// }