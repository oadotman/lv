"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { initializePaddle, openPaddleCheckout, getPaddleOverageId, OVERAGE_PACKS } from "@/lib/paddle";
import { getUsageStatus, formatMinutes, getPlanDetails } from "@/lib/pricing";
import { AlertCircle, Clock, Zap, TrendingUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

export default function OveragePage() {
  const router = useRouter();
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [paddleLoaded, setPaddleLoaded] = useState(false);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [minutesTotal, setMinutesTotal] = useState(0);

  // Initialize Paddle
  useEffect(() => {
    initializePaddle(() => {
      setPaddleLoaded(true);
    });
  }, []);

  // Get usage data
  useEffect(() => {
    async function fetchUsageData() {
      if (organization) {
        try {
          // Fetch the full organization data with usage info
          const response = await fetch('/api/usage');
          const data = await response.json();

          if (data.usage) {
            setMinutesUsed(data.usage.minutesUsed || 0);
            setMinutesTotal(data.usage.minutesLimit || 0);
          } else {
            // Fallback to plan defaults
            const planDetails = getPlanDetails(organization.plan_type as any);
            setMinutesUsed(0);
            setMinutesTotal(planDetails.maxMinutes);
          }
        } catch (error) {
          console.error('Error fetching usage:', error);
          // Fallback to plan defaults
          const planDetails = getPlanDetails(organization.plan_type as any);
          setMinutesUsed(0);
          setMinutesTotal(planDetails.maxMinutes);
        }
      }
    }

    fetchUsageData();
  }, [organization]);

  const usagePercentage = Math.min((minutesUsed / minutesTotal) * 100, 100);
  const usageStatus = organization ? getUsageStatus(minutesUsed, organization.plan_type as any) : null;
  const remainingMinutes = Math.max(minutesTotal - minutesUsed, 0);

  const handlePurchaseOverage = async (packId: string, minutes: number) => {
    if (!paddleLoaded) {
      toast({
        title: "Loading...",
        description: "Payment system is loading. Please try again in a moment.",
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "Email Required",
        description: "Please ensure you're logged in with a valid email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSelectedPack(packId);

    try {
      const priceId = getPaddleOverageId(minutes as 500 | 1000 | 2500 | 5000);

      if (!priceId) {
        throw new Error('Invalid overage pack selection');
      }

      // Open Paddle checkout for overage
      openPaddleCheckout({
        planId: priceId,
        email: user.email,
        customData: {
          organization_id: organization?.id,
          user_id: user.id,
          overage_minutes: minutes,
          type: 'overage'
        },
        successCallback: () => {
          toast({
            title: "Success!",
            description: `${minutes.toLocaleString()} minutes have been added to your account.`,
          });

          // Refresh the page to show updated usage
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        },
        closeCallback: () => {
          setLoading(false);
          setSelectedPack(null);
        }
      });

    } catch (error) {
      console.error('Overage purchase error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate checkout. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      setSelectedPack(null);
    }
  };

  // Don't show for free plan users
  if (organization?.plan_type === 'free') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-blue-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Upgrade to Purchase Minutes</CardTitle>
              <CardDescription>
                Overage minutes are only available for paid plans. Upgrade to unlock this feature.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button onClick={() => router.push('/upgrade')} size="lg">
                View Plans
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Buy Additional Minutes
          </h1>
          <p className="text-xl text-gray-600">
            Running low on minutes? Add more to keep your team productive
          </p>
        </div>

        {/* Current Usage Card */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Current Month Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatMinutes(minutesUsed)} / {formatMinutes(minutesTotal)}
                </p>
                <p className="text-sm text-gray-600">
                  {formatMinutes(remainingMinutes)} remaining
                </p>
              </div>
              <Badge
                className={cn(
                  "text-white",
                  usageStatus?.status === 'ok' && "bg-green-600",
                  usageStatus?.status === 'warning' && "bg-yellow-600",
                  usageStatus?.status === 'critical' && "bg-orange-600",
                  usageStatus?.status === 'overage' && "bg-red-600"
                )}
              >
                {usagePercentage.toFixed(0)}% Used
              </Badge>
            </div>

            <Progress value={usagePercentage} className="h-3" />

            {usageStatus?.status === 'critical' && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-900">Running Low</AlertTitle>
                <AlertDescription className="text-orange-700">
                  You've used {usagePercentage.toFixed(0)}% of your monthly allowance.
                  Consider purchasing additional minutes to avoid service interruption.
                </AlertDescription>
              </Alert>
            )}

            {usageStatus?.status === 'overage' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-900">Out of Minutes</AlertTitle>
                <AlertDescription className="text-red-700">
                  You've exceeded your monthly allowance. Purchase additional minutes to continue processing calls.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Overage Packs */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Choose a Minutes Pack
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {OVERAGE_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={cn(
                  "relative transition-all duration-200 hover:shadow-xl",
                  pack.popular && "border-blue-600 shadow-lg scale-105"
                )}
              >
                {pack.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <Package className="w-10 h-10 mx-auto mb-2 text-blue-600" />
                  <CardTitle className="text-xl">{pack.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {pack.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="text-center space-y-4">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      ${pack.price}
                    </p>
                    <p className="text-sm text-gray-600">
                      ${pack.pricePerMinute}/minute
                    </p>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span>Instant activation</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span>Never expires</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handlePurchaseOverage(pack.id, pack.minutes)}
                    disabled={loading}
                    className={cn(
                      "w-full",
                      pack.popular && "bg-blue-600 hover:bg-blue-700"
                    )}
                  >
                    {loading && selectedPack === pack.id
                      ? "Processing..."
                      : `Add ${pack.minutes.toLocaleString()} Minutes`}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">How Overage Minutes Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-blue-800">
            <p>• Overage minutes are added to your current month's allowance immediately</p>
            <p>• Unused overage minutes roll over to the next month</p>
            <p>• All minutes are charged at $0.02 per minute</p>
            <p>• No commitment - buy only what you need</p>
            <p>• Your regular plan minutes are used first each month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}