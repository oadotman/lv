"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatMinutes, formatOverageCharge } from '@/lib/simple-usage';

interface OverageData {
  minutesUsed: number;
  minutesLimit: number;
  overageMinutes: number;
  overageCharge: number;
  percentUsed: number;
  status: 'ok' | 'warning' | 'overage';
}

export function OverageBanner() {
  const [usage, setUsage] = useState<OverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchUsageData() {
      try {
        const supabase = createClient();

        // Get user's organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!userOrg?.organization_id) {
          setLoading(false);
          return;
        }

        // Fetch usage data from API
        const response = await fetch(`/api/usage?organizationId=${userOrg.organization_id}`);
        if (!response.ok) {
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.usage) {
          setUsage({
            minutesUsed: data.usage.minutesUsed,
            minutesLimit: data.usage.minutesLimit,
            overageMinutes: data.usage.overageMinutes,
            overageCharge: data.usage.overageCost,
            percentUsed: data.usage.percentUsed,
            status: data.usage.warningLevel === 'exceeded' ? 'overage' :
                   data.usage.warningLevel === 'high' ? 'warning' : 'ok'
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching usage data:', error);
        setLoading(false);
      }
    }

    fetchUsageData();
  }, []);

  if (loading || !usage || dismissed) {
    return null;
  }

  // Only show banner if warning or overage
  if (usage.status === 'ok') {
    return null;
  }

  const isOverage = usage.status === 'overage';

  return (
    <div className={`relative bg-gradient-to-r ${
      isOverage
        ? 'from-red-50 to-rose-50 border-2 border-red-300'
        : 'from-orange-50 to-amber-50 border-2 border-orange-300'
    } rounded-2xl p-5 shadow-lg animate-in slide-in-from-top-2 duration-300`}>
      <button
        onClick={() => setDismissed(true)}
        className={`absolute top-3 right-3 p-1.5 hover:${
          isOverage ? 'bg-red-100' : 'bg-orange-100'
        } rounded-lg transition-colors`}
      >
        <X className={`w-4 h-4 ${isOverage ? 'text-red-600' : 'text-orange-600'}`} />
      </button>
      <div className="flex items-start gap-4 pr-8">
        <div className={`p-3 ${
          isOverage ? 'bg-red-500' : 'bg-orange-500'
        } rounded-xl shadow-lg flex-shrink-0`}>
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${
            isOverage ? 'text-red-900' : 'text-orange-900'
          } mb-1`}>
            {isOverage ? "You're in overage" : "Approaching your limit"}
          </h3>
          <div className="space-y-2 mb-3">
            <p className={`text-sm ${isOverage ? 'text-red-700' : 'text-orange-700'}`}>
              You've used <span className="font-bold">{formatMinutes(usage.minutesUsed)}</span> of your <span className="font-bold">{formatMinutes(usage.minutesLimit)}</span> monthly allowance ({Math.round(usage.percentUsed)}%).
            </p>
            {isOverage && (
              <p className="text-sm text-red-700 font-medium">
                Overage: {formatMinutes(usage.overageMinutes)} • Additional cost: {formatOverageCharge(usage.overageCharge)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isOverage ? (
              <>
                <p className="text-xs text-red-600">
                  Additional minutes are charged at <span className="font-bold">$0.20/minute</span>.
                  Consider upgrading your plan to save on overage costs.
                </p>
                <Button
                  onClick={() => window.location.href = '/upgrade'}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-md rounded-xl font-semibold text-sm ml-auto"
                >
                  Upgrade Plan
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-orange-600">
                  {usage.minutesLimit - usage.minutesUsed} minutes remaining.
                  Overage is charged at <span className="font-bold">$0.20/minute</span>.
                </p>
                <Button
                  onClick={() => window.location.href = '/settings'}
                  className="bg-orange-600 hover:bg-orange-700 text-white shadow-md rounded-xl font-semibold text-sm ml-auto"
                >
                  View Usage
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}