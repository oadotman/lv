"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, Sparkles, X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { OVERAGE_CONFIG } from '@/lib/overage';
import { initializePaddle, openPaddleCheckout } from '@/lib/paddle';

interface OverageData {
  minutesUsed: number;
  baseMinutes: number;
  purchasedOverageMinutes: number;
  totalAvailableMinutes: number;
  percentUsed: number;
  hasOverage: boolean;
  canUpload: boolean;
  organizationId: string;
}

interface OveragePack {
  id: string;
  minutes: number;
  price: number;
  paddlePriceId: string;
  savings: number;
  savingsPercent: number;
}

export function OverageBanner() {
  const [overage, setOverage] = useState<OverageData | null>(null);
  const [packs, setPacks] = useState<OveragePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [paddleReady, setPaddleReady] = useState(false);

  // Initialize Paddle on mount
  useEffect(() => {
    initializePaddle(() => {
      setPaddleReady(true);
    });
  }, []);

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
        setOverage({
          ...data,
          organizationId: userOrg.organization_id,
        });

        // Fetch available overage packs
        const packsResponse = await fetch('/api/overage/purchase');
        if (packsResponse.ok) {
          const packsData = await packsResponse.json();
          setPacks(packsData.packs || []);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching usage data:', error);
        setLoading(false);
      }
    }

    fetchUsageData();
  }, []);

  const handlePurchaseOverage = async (pack: OveragePack) => {
    if (!paddleReady || !overage) {
      alert('Payment system is loading. Please try again in a moment.');
      return;
    }

    try {
      // Get checkout data from API
      const response = await fetch('/api/overage/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packSize: pack.id,
          organizationId: overage.organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout');
      }

      const { checkout } = await response.json();

      // Open Paddle checkout
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      openPaddleCheckout({
        planId: checkout.priceId,
        email: user?.email,
        customData: checkout.customData,
        successCallback: () => {
          // Refresh usage data after successful purchase
          window.location.reload();
        },
      });
    } catch (error) {
      console.error('Error purchasing overage:', error);
      alert('Failed to open checkout. Please try again.');
    }
  };

  if (loading || !overage || dismissed) {
    return null;
  }

  // Show warning at 80% usage
  const shouldWarn = overage.percentUsed >= 80;

  // Show error at 100% usage (exceeded even with overages)
  const isBlocked = !overage.canUpload;

  if (!shouldWarn && !isBlocked) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Main Warning Banner */}
      {isBlocked ? (
        // BLOCKED: Exceeded all limits
        <div className="relative bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 rounded-2xl p-5 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 p-1.5 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
          <div className="flex items-start gap-4 pr-8">
            <div className="p-3 bg-red-500 rounded-xl shadow-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-1">
                Upload limit reached
              </h3>
              <p className="text-sm text-red-700 mb-3">
                You've used all {overage.totalAvailableMinutes} minutes this month
                {overage.hasOverage && ' (including overage packs)'}.
                Purchase additional overage to continue processing calls.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowPurchase(!showPurchase)}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-md rounded-xl font-semibold text-sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase Overage Pack
                </Button>
                <span className="text-xs text-red-600 font-medium">
                  Starting at ${OVERAGE_CONFIG.packs.small.price} for {OVERAGE_CONFIG.packs.small.minutes} minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // WARNING: Approaching limit
        <div className="relative bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-5 shadow-lg animate-in slide-in-from-top-2 duration-300">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 p-1.5 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-orange-600" />
          </button>
          <div className="flex items-start gap-4 pr-8">
            <div className="p-3 bg-orange-500 rounded-xl shadow-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-900 mb-1">
                {overage.percentUsed >= 95 ? "Almost at your limit" : "Approaching your limit"}
              </h3>
              <div className="space-y-2 mb-3">
                <p className="text-sm text-orange-700">
                  You've used <span className="font-bold">{Math.round(overage.minutesUsed)} minutes</span> of your <span className="font-bold">{overage.totalAvailableMinutes} total minutes</span> this month ({Math.round(overage.percentUsed)}%).
                </p>
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">Base plan:</span> {overage.baseMinutes} min
                  </div>
                  {overage.purchasedOverageMinutes > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">Overage packs:</span> {overage.purchasedOverageMinutes} min
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowPurchase(!showPurchase)}
                  className="bg-orange-600 hover:bg-orange-700 text-white shadow-md rounded-xl font-semibold text-sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {overage.hasOverage ? 'Buy More Minutes' : 'Purchase Overage Pack'}
                </Button>
                <span className="text-xs text-orange-600 font-medium">
                  Only ${OVERAGE_CONFIG.pricePerMinute}/minute
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overage Pack Purchase Options */}
      {showPurchase && packs.length > 0 && (
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50/30 rounded-2xl p-6 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="mb-4">
            <h4 className="text-xl font-bold text-slate-900 mb-2">
              Purchase Additional Minutes
            </h4>
            <p className="text-sm text-slate-600">
              Choose an overage pack to add more minutes to your account. Unused minutes carry over until the end of your billing period.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs.map((pack) => (
              <Card
                key={pack.id}
                className={`border-2 hover:border-orange-400 hover:shadow-xl transition-all duration-200 cursor-pointer ${
                  pack.id === 'medium' ? 'border-orange-300 bg-orange-50/50' : 'border-slate-200'
                }`}
                onClick={() => handlePurchaseOverage(pack)}
              >
                <div className="p-4">
                  {pack.id === 'medium' && (
                    <div className="text-xs font-bold text-orange-600 mb-2 uppercase tracking-wide">
                      Most Popular
                    </div>
                  )}
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    ${pack.price}
                  </div>
                  <div className="text-sm font-medium text-slate-600 mb-3">
                    {pack.minutes} minutes
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    ${(pack.price / pack.minutes).toFixed(3)}/min
                  </div>
                  {pack.savingsPercent > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold mb-3">
                      Save {pack.savingsPercent}%
                    </div>
                  )}
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-lg"
                    size="sm"
                  >
                    Select
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs text-blue-700">
              <span className="font-bold">Note:</span> Overage packs are valid until the end of your current billing period and reset monthly.
              Any usage beyond your total available minutes (base + purchased overages) will be billed at ${OVERAGE_CONFIG.pricePerMinute}/minute at the end of your billing cycle.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
