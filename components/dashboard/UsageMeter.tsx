"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Clock, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  async function fetchUsage() {
    try {
      const response = await fetch('/api/usage');
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Monthly Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !usage) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Usage Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Unable to load usage data. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  // Determine color based on warning level
  const getColor = () => {
    switch (usage.warningLevel) {
      case 'exceeded':
        return {
          bg: 'bg-red-500',
          text: 'text-red-700',
          border: 'border-red-200',
          cardBg: 'bg-red-50',
        };
      case 'high':
        return {
          bg: 'bg-orange-500',
          text: 'text-orange-700',
          border: 'border-orange-200',
          cardBg: 'bg-orange-50',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          cardBg: 'bg-yellow-50',
        };
      case 'low':
        return {
          bg: 'bg-blue-500',
          text: 'text-blue-700',
          border: 'border-blue-200',
          cardBg: 'bg-blue-50',
        };
      default:
        return {
          bg: 'bg-green-500',
          text: 'text-green-700',
          border: 'border-green-200',
          cardBg: 'bg-green-50',
        };
    }
  };

  const colors = getColor();

  return (
    <Card className={`border-2 ${colors.border}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Monthly Usage
          </CardTitle>
          <Badge className="capitalize" variant="outline">
            {usage.planType === 'free' ? 'Free Plan' : usage.planType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">
              {usage.minutesUsed} / {usage.minutesLimit} minutes
            </span>
            <span className={`font-bold ${colors.text}`}>
              {usage.percentUsed}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bg} transition-all duration-500 ease-out`}
              style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {usage.remainingMinutes} minutes remaining this month
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Calls Processed</p>
            <p className="text-2xl font-bold text-gray-900">{usage.callsProcessed}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Plan Limit</p>
            <p className="text-2xl font-bold text-gray-900">{usage.minutesLimit}</p>
            <p className="text-xs text-gray-500">min/month</p>
          </div>
        </div>

        {/* Warning Messages */}
        {usage.warningLevel === 'exceeded' && (
          <div className={`p-3 ${colors.cardBg} border ${colors.border} rounded-lg`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`text-sm font-semibold ${colors.text}`}>
                  Monthly limit exceeded
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  You've used all {usage.minutesLimit} minutes this month. Upgrade your plan to process more calls.
                </p>
              </div>
            </div>
            <Button
              className="w-full mt-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => router.push('/settings?tab=billing')}
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        )}

        {usage.warningLevel === 'high' && (
          <div className={`p-3 ${colors.cardBg} border ${colors.border} rounded-lg`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`text-sm font-semibold ${colors.text}`}>
                  Approaching limit
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  You've used {usage.percentUsed}% of your monthly minutes. Consider upgrading to avoid interruption.
                </p>
              </div>
            </div>
            <Link href="/settings?tab=billing">
              <Button variant="outline" className="w-full mt-3" size="sm">
                View Plans
              </Button>
            </Link>
          </div>
        )}

        {usage.warningLevel === 'medium' && (
          <div className={`p-3 ${colors.cardBg} border ${colors.border} rounded-lg`}>
            <div className="flex items-start gap-2">
              <TrendingUp className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`text-sm font-semibold ${colors.text}`}>
                  80% used
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  You have {usage.remainingMinutes} minutes remaining this month.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade CTA for Free/Solo Plans */}
        {(usage.planType === 'free' || usage.planType === 'solo') && usage.warningLevel !== 'exceeded' && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-2">
              Need more minutes? Upgrade to a Team plan:
            </p>
            <Link href="/settings?tab=billing">
              <Button variant="outline" size="sm" className="w-full">
                <Crown className="w-4 h-4 mr-2" />
                See Plans
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
