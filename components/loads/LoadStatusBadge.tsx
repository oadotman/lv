'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LoadStatus } from '@/lib/types';
import {
  FileText,
  Search,
  Truck,
  Navigation,
  Package,
  CheckCircle2,
  XCircle
} from 'lucide-react';

// Status configuration with colors, labels, and icons
export const LOAD_STATUS_CONFIG: Record<LoadStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  quoted: {
    label: 'Quoted',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: FileText,
    description: 'Rate quoted to shipper, awaiting confirmation'
  },
  needs_carrier: {
    label: 'Needs Carrier',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    icon: Search,
    description: 'Load confirmed, searching for carrier'
  },
  dispatched: {
    label: 'Dispatched',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: Truck,
    description: 'Carrier assigned, waiting for pickup'
  },
  in_transit: {
    label: 'In Transit',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: Navigation,
    description: 'Load picked up, en route to delivery'
  },
  delivered: {
    label: 'Delivered',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: Package,
    description: 'Load delivered, awaiting paperwork'
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    icon: CheckCircle2,
    description: 'All paperwork received, ready for billing'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: XCircle,
    description: 'Load cancelled'
  }
};

interface LoadStatusBadgeProps {
  status: LoadStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDescription?: boolean;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export function LoadStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  showDescription = false,
  className,
  onClick,
  interactive = false
}: LoadStatusBadgeProps) {
  const config = LOAD_STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <Badge
        variant="outline"
        className={cn(
          sizeClasses[size],
          config.color,
          config.bgColor,
          config.borderColor,
          'font-semibold border-2',
          interactive && 'cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-1.5">
          {showIcon && <Icon className={iconSizes[size]} />}
          <span>{config.label}</span>
        </div>
      </Badge>
      {showDescription && (
        <span className="text-xs text-gray-500 italic">
          {config.description}
        </span>
      )}
    </div>
  );
}

// Status indicator dot for compact displays
interface LoadStatusDotProps {
  status: LoadStatus;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function LoadStatusDot({
  status,
  size = 'md',
  showTooltip = true,
  className
}: LoadStatusDotProps) {
  const config = LOAD_STATUS_CONFIG[status];

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const dotElement = (
    <div
      className={cn(
        'rounded-full',
        sizeClasses[size],
        config.bgColor,
        'ring-2 ring-offset-1',
        config.borderColor.replace('border', 'ring'),
        className
      )}
      aria-label={config.label}
    />
  );

  if (showTooltip) {
    return (
      <div className="group relative inline-block">
        {dotElement}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
            {config.label}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return dotElement;
}

// Status progress indicator showing workflow progression
interface LoadStatusProgressProps {
  currentStatus: LoadStatus;
  showLabels?: boolean;
  className?: string;
}

export function LoadStatusProgress({
  currentStatus,
  showLabels = true,
  className
}: LoadStatusProgressProps) {
  const statuses: LoadStatus[] = [
    'quoted',
    'needs_carrier',
    'dispatched',
    'in_transit',
    'delivered',
    'completed'
  ];

  const currentIndex = statuses.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {statuses.map((status, index) => {
          const config = LOAD_STATUS_CONFIG[status];
          const Icon = config.icon;
          const isCompleted = !isCancelled && index <= currentIndex;
          const isCurrent = !isCancelled && index === currentIndex;

          return (
            <React.Fragment key={status}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isCancelled
                      ? 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                      : isCompleted
                      ? `${config.bgColor} ${config.color} border-2 ${config.borderColor}`
                      : 'bg-gray-50 text-gray-400 border-2 border-gray-200'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {showLabels && (
                  <span
                    className={cn(
                      'text-xs mt-1 font-medium',
                      isCancelled
                        ? 'text-gray-400'
                        : isCurrent
                        ? config.color.replace('text-', 'text-')
                        : isCompleted
                        ? 'text-gray-700'
                        : 'text-gray-400'
                    )}
                  >
                    {config.label}
                  </span>
                )}
              </div>
              {index < statuses.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2',
                    isCancelled
                      ? 'bg-gray-200'
                      : index < currentIndex
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {isCancelled && (
        <div className="mt-4 flex justify-center">
          <LoadStatusBadge status="cancelled" size="md" />
        </div>
      )}
    </div>
  );
}

// Export status list for use in other components
export const LOAD_STATUSES = Object.keys(LOAD_STATUS_CONFIG) as LoadStatus[];

// Export user-friendly labels
export const LOAD_STATUS_LABELS = Object.entries(LOAD_STATUS_CONFIG).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [key]: value.label
  }),
  {} as Record<LoadStatus, string>
);