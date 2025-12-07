"use client";

import { useEffect, useState } from "react";
import { Clock, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

interface UsageData {
  minutesUsed: number;
  minutesLimit: number;
  percentUsed: number;
  callsProcessed: number;
  planType: string;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'exceeded';
  remainingMinutes: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export function UsageMeter() {
  const { organization } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage();
  }, [organization]); // Re-fetch when organization changes

  async function fetchUsage() {
    try {
      // Pass organizationId if available to ensure we get correct org's usage
      const url = organization?.id
        ? `/api/usage?organizationId=${organization.id}`
        : '/api/usage';

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage');
      }

      setUsage(data.usage);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching usage:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-[0px_1px_3px_rgba(0,0,0,0.08)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-violet-600" />
          <h3 className="text-lg font-semibold text-gray-900">Monthly Usage</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-14 bg-gray-100 rounded w-1/2"></div>
          <div className="h-2 bg-gray-100 rounded-full"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="bg-white rounded-2xl shadow-[0px_1px_3px_rgba(0,0,0,0.08)] p-8 border border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-red-700">Usage Error</h3>
        </div>
        <p className="text-sm text-red-600">Unable to load usage data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0px_1px_3px_rgba(0,0,0,0.08)] p-8">
      {/* Title Row */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 flex items-center justify-center">
          <Clock className="w-6 h-6 text-violet-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Monthly Usage</h3>
      </div>

      {/* Main Usage Display */}
      <div className="mt-6">
        <div className="flex items-baseline">
          <span className="text-[56px] font-bold text-slate-900 leading-none">
            {usage.minutesUsed}
          </span>
          <span className="ml-2 text-xl text-gray-500 font-normal">
            / {usage.minutesLimit} minutes
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-5">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full bg-emerald-500 transition-all duration-500 ease-out",
              usage.warningLevel === 'exceeded' && "bg-red-500",
              usage.warningLevel === 'high' && "bg-orange-500",
              usage.warningLevel === 'medium' && "bg-yellow-500"
            )}
            style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Remaining Minutes Text */}
      <div className="mt-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">
          {usage.remainingMinutes} minutes remaining this billing period
        </span>
      </div>
    </div>
  );
}
