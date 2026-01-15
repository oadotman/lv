'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, CheckCircle } from 'lucide-react';
import { initializePaddle, openPaddleCheckout } from '@/lib/paddle';

export default function PayOveragePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paddleReady, setPaddleReady] = useState(false);
  const [overageData, setOverageData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize Paddle
    initializePaddle(() => {
      setPaddleReady(true);
    });

    // Fetch overage debt status
    fetchOverageStatus();
  }, []);

  const fetchOverageStatus = async () => {
    try {
      const response = await fetch('/api/overage/check');
      if (!response.ok) throw new Error('Failed to fetch overage status');

      const data = await response.json();
      setOverageData(data);

      // Redirect if no debt
      if (!data.hasDebt) {
        router.push('/settings');
      }
    } catch (err) {
      console.error('Error fetching overage:', err);
      setError('Failed to load overage information');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paddleReady || !overageData) return;

    setProcessing(true);
    setError('');

    try {
      // Create Paddle checkout for exact overage amount
      const response = await fetch('/api/overage/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: overageData.amount,
          minutes: overageData.currentOverageMinutes,
        }),
      });

      if (!response.ok) throw new Error('Failed to create checkout');

      const { checkoutUrl, checkoutId } = await response.json();

      // Open Paddle checkout
      if (checkoutUrl.startsWith('http')) {
        // External URL - redirect
        window.location.href = checkoutUrl;
      } else {
        // Paddle checkout ID - open overlay
        openPaddleCheckout({
          planId: checkoutId, // Using checkoutId as planId
          successCallback: () => {
            // Refresh and redirect on success
            window.location.href = '/settings?payment=success';
          },
        });
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to start payment process. Please try again.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!overageData?.hasDebt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Payment Required</h1>
          <p className="text-gray-600 mb-6">You don't have any overage charges at this time.</p>
          <Button onClick={() => router.push('/settings')}>
            Back to Settings
          </Button>
        </Card>
      </div>
    );
  }

  const isBlocked = overageData.amount >= 20;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Alert Banner */}
        {isBlocked && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Account Limited</h3>
              <p className="text-sm text-red-700 mt-1">
                You've reached the $20 overage cap. Your account is limited until payment is made.
              </p>
            </div>
          </div>
        )}

        {/* Main Payment Card */}
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Overage Payment Required</h1>
            <p className="text-gray-600">
              Your account has exceeded its monthly minute allowance
            </p>
          </div>

          {/* Usage Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-lg mb-4">Usage Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Overage Minutes:</span>
                <span className="font-medium">{overageData.currentOverageMinutes} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rate:</span>
                <span className="font-medium">$0.20 per minute</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Total Due:</span>
                <span className="font-bold text-xl text-indigo-600">
                  ${overageData.amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Restrictions Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-amber-900 mb-2">Account Restrictions</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Cannot upgrade plan until payment is made</li>
              <li>• Cannot add new team members</li>
              <li>• Cannot process new calls if at $20 cap</li>
            </ul>
          </div>

          {/* Payment Button */}
          <div className="space-y-4">
            <Button
              onClick={handlePayment}
              disabled={processing || !paddleReady}
              className="w-full h-12 text-lg font-semibold"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay ${overageData.amount.toFixed(2)} Now
                </>
              )}
            </Button>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div className="text-center text-sm text-gray-500">
              Secure payment processed by Paddle
            </div>
          </div>

          {/* Due Date Warning */}
          {overageData.dueDate && (
            <div className="mt-6 text-center text-sm text-gray-600">
              Payment due by: {new Date(overageData.dueDate).toLocaleDateString()}
            </div>
          )}
        </Card>

        {/* Upgrade Suggestion */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Avoid Future Overages</h3>
          <p className="text-sm text-blue-800 mb-3">
            Consider upgrading your plan to get more minutes and avoid overage charges.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push('/upgrade')}
            disabled={overageData.mustPayFirst}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            View Upgrade Options
            {overageData.mustPayFirst && ' (Pay First)'}
          </Button>
        </Card>
      </div>
    </div>
  );
}