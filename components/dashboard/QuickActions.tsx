'use client'

import React from 'react'
import Link from 'next/link'
import { Phone, Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsProps {
  onProcessNewCall: () => void
}

export function QuickActions({ onProcessNewCall }: QuickActionsProps) {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">
        Quick Actions
      </h2>

      <div className="grid grid-cols-3 gap-4">
        {/* View All Calls Button */}
        <Link
          href="/calls"
          className={cn(
            "h-[72px] rounded-xl border-[1.5px] border-gray-200 bg-white",
            "flex flex-col items-center justify-center gap-3",
            "hover:border-blue-500 transition-colors duration-200",
            "group"
          )}
        >
          <Phone className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
          <span className="text-[15px] font-medium text-gray-700">
            View All Calls
          </span>
        </Link>

        {/* Process New Call Button - Primary Action */}
        <button
          onClick={onProcessNewCall}
          className={cn(
            "h-[72px] rounded-xl",
            "bg-gradient-to-b from-blue-600 to-sky-700",
            "flex flex-col items-center justify-center gap-3",
            "hover:from-blue-700 hover:to-sky-800",
            "hover:shadow-lg hover:-translate-y-0.5",
            "transition-all duration-200",
            "group"
          )}
        >
          <Plus className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
          <span className="text-[15px] font-semibold text-white">
            Process New Call
          </span>
        </button>

        {/* Manage Templates Button */}
        <Link
          href="/templates"
          className={cn(
            "h-[72px] rounded-xl border-[1.5px] border-gray-200 bg-white",
            "flex flex-col items-center justify-center gap-3",
            "hover:border-blue-500 transition-colors duration-200",
            "group"
          )}
        >
          <FileText className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
          <span className="text-[15px] font-medium text-gray-700">
            Manage Templates
          </span>
        </Link>
      </div>
    </div>
  )
}