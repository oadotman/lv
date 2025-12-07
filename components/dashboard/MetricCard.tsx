'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  icon: LucideIcon
  iconBgColor: string
  cardBgColor: string
  label: string
  value: string | number
  unit?: string
  subText: string
  trend?: {
    value: string
    isPositive: boolean
  }
  additionalInfo?: string
  statusIndicator?: {
    isActive: boolean
    text: string
  }
}

export function MetricCard({
  icon: Icon,
  iconBgColor,
  cardBgColor,
  label,
  value,
  unit,
  subText,
  trend,
  additionalInfo,
  statusIndicator
}: MetricCardProps) {
  return (
    <div className={cn("rounded-2xl p-6", cardBgColor)}>
      {/* Icon Container */}
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBgColor)}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Label */}
      <div className="mt-4">
        <p className="text-[11px] font-semibold tracking-[0.5px] text-gray-500 uppercase">
          {label}
        </p>
      </div>

      {/* Main Value */}
      <div className="mt-2 flex items-baseline">
        <span className="text-[40px] font-bold text-slate-900">
          {value}
        </span>
        {unit && (
          <span className="ml-2 text-xl font-normal text-slate-900">
            {unit}
          </span>
        )}
      </div>

      {/* Sub Text */}
      <p className="mt-2 text-sm text-gray-500">
        {subText}
      </p>

      {/* Additional Info (for Time Saved card) */}
      {additionalInfo && (
        <p className={cn("mt-1 text-[13px] font-medium", trend?.isPositive ? "text-emerald-600" : "text-gray-500")}>
          {additionalInfo}
        </p>
      )}

      {/* Trend or Status Indicator */}
      {trend && (
        <div className="mt-2 flex items-center">
          <span className={cn(
            "text-[13px] font-medium flex items-center",
            trend.isPositive ? "text-emerald-600" : "text-red-500"
          )}>
            <span className="mr-1">{trend.isPositive ? '↑' : '↓'}</span>
            {trend.value}
          </span>
        </div>
      )}

      {statusIndicator && (
        <div className="mt-2 flex items-center">
          <span className={cn(
            "w-2 h-2 rounded-full mr-1.5",
            statusIndicator.isActive ? "bg-emerald-500" : "bg-gray-300"
          )} />
          <span className={cn(
            "text-[13px]",
            statusIndicator.isActive ? "text-emerald-600" : "text-gray-500"
          )}>
            {statusIndicator.text}
          </span>
        </div>
      )}
    </div>
  )
}