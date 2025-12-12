"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { PLANS, type PlanType } from "@/lib/pricing";
import { initializePaddle, openPaddleCheckout, getPaddlePlanId } from "@/lib/paddle";
import { Check, Sparkles, Loader2, CreditCard, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function UpgradePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [paddleLoaded, setPaddleLoaded] = useState(false);

  // Initialize Paddle when component mounts
  useEffect(() => {
    initializePaddle(() => {
      setPaddleLoaded(true);
    });
  }, []);

  // Check for pre-selected plan from query params
  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam) {
      // Auto-scroll to the plan if it exists
      setTimeout(() => {
        const element = document.getElementById(`plan-${planParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [searchParams]);

  // Determine current plan
  const currentPlan = organization?.plan_type || 'free';

  // Filter plans based on current plan
  const getAvailablePlans = () => {
    const planHierarchy: PlanType[] = ['free', 'solo', 'starter', 'professional', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan as PlanType);

    // Show only plans higher than current
    return planHierarchy
      .slice(currentIndex + 1)
      .filter(plan => plan !== 'custom'); // Don't show custom plan
  };

  const availablePlans = getAvailablePlans();

  const handleUpgrade = async (planId: PlanType) => {
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
    setSelectedPlan(planId);

    try {
      const priceId = getPaddlePlanId(planId, billingPeriod);

      if (!priceId) {
        throw new Error('Invalid plan selection');
      }

      // Open Paddle checkout
      openPaddleCheckout({
        planId: priceId,
        email: user.email,
        customData: {
          organization_id: organization?.id,
          user_id: user.id,
          plan_type: planId,
          billing_period: billingPeriod
        },
        successCallback: () => {
          toast({
            title: "Success!",
            description: "Your subscription has been activated.",
          });

          // Redirect to dashboard after successful payment
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        },
        closeCallback: () => {
          setLoading(false);
          setSelectedPlan(null);
        }
      });

    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate checkout. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  if (currentPlan === 'enterprise') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-violet-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              You're on the Enterprise Plan
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              You already have access to all features and unlimited usage.
            </p>
            <Button onClick={() => router.push('/dashboard')} size="lg">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            Current Plan: {PLANS[currentPlan as PlanType].name}
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose the perfect plan to scale your sales operations
          </p>

          {/* Billing Period Toggle */}
          <div className="flex justify-center mb-8">
            <ToggleGroup
              type="single"
              value={billingPeriod}
              onValueChange={(value) => value && setBillingPeriod(value as 'monthly' | 'annual')}
              className="bg-gray-100 p-1 rounded-lg"
            >
              <ToggleGroupItem
                value="monthly"
                className="px-8 py-2 data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="annual"
                className="px-8 py-2 data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm rounded-md font-medium text-gray-600 hover:text-gray-900 transition-all"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Annual
                <Badge className="ml-2 bg-green-100 text-green-800 font-semibold">Save 17%</Badge>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {availablePlans.map((planId) => {
            const plan = PLANS[planId];
            const isPopular = plan.isPopular;
            const isLoading = loading && selectedPlan === planId;

            return (
              <Card
                key={planId}
                id={`plan-${planId}`}
                className={cn(
                  "relative transition-all duration-200",
                  isPopular && "border-violet-600 shadow-xl scale-105"
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-600 text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold">
                      ${billingPeriod === 'monthly' ? plan.price : Math.round(plan.priceAnnual / 12)}
                      <span className="text-base font-normal text-gray-600">/month</span>
                    </div>
                    <CardDescription>
                      {billingPeriod === 'monthly'
                        ? `Billed monthly`
                        : `$${plan.priceAnnual} billed annually`}
                    </CardDescription>
                    {billingPeriod === 'annual' && plan.price > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Save ${(plan.price * 12) - plan.priceAnnual} per year
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handleUpgrade(planId)}
                    disabled={loading}
                    className={cn(
                      "w-full text-white font-semibold",
                      isPopular
                        ? "bg-violet-600 hover:bg-violet-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    )}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Upgrade to {plan.name}</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="text-center text-gray-600">
          <p className="mb-2">
            All plans include a 14-day money-back guarantee
          </p>
          <p className="text-sm">
            Need help choosing? <a href="/help" className="text-violet-600 hover:underline">Contact our sales team</a>
          </p>
        </div>
      </div>
    </div>
  );
}