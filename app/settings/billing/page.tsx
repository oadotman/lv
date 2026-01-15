'use client'

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Check,
  X,
  Calendar,
  DollarSign,
  Loader2,
  ArrowUp,
  ArrowDown,
  Info,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  PLANS,
  formatMinutes,
  formatPrice,
  getUsageStatus,
  calculateOverageCost
} from '@/lib/pricing'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BillingData {
  subscription: {
    plan: string
    status: 'active' | 'canceled' | 'paused' | 'trialing'
    billingCycle: 'monthly' | 'annual'
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    subscriptionId: string
  }
  usage: {
    minutesUsed: number
    minutesLimit: number
    usersActive: number
    usersLimit: number
  }
  payments: Array<{
    id: string
    date: string
    amount: number
    status: 'succeeded' | 'failed' | 'pending'
    description: string
  }>
}

export default function SubscriptionManagementPage() {
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [downgradeReason, setDowngradeReason] = useState('')
  const [downgradeEligibility, setDowngradeEligibility] = useState<any>(null)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchBillingData()
  }, [])

  const fetchBillingData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/billing/summary')
      if (!response.ok) throw new Error('Failed to fetch billing data')

      const data = await response.json()
      setBillingData(data)
    } catch (error) {
      console.error('Error fetching billing data:', error)
      toast.error('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  const checkDowngradeEligibility = async (targetPlan: string) => {
    try {
      const response = await fetch(`/api/subscription/downgrade?targetPlan=${targetPlan}`)
      const data = await response.json()
      setDowngradeEligibility(data)
      return data
    } catch (error) {
      console.error('Error checking downgrade eligibility:', error)
      return null
    }
  }

  const handlePlanChange = async (targetPlan: string, isUpgrade: boolean) => {
    if (isUpgrade) {
      // For upgrades, redirect to upgrade page
      router.push(`/upgrade?plan=${targetPlan}`)
    } else {
      // For downgrades, check eligibility first
      const eligibility = await checkDowngradeEligibility(targetPlan)
      if (eligibility) {
        setSelectedPlan(targetPlan)
        setDowngradeEligibility(eligibility)
        setShowDowngradeDialog(true)
      }
    }
  }

  const confirmDowngrade = async () => {
    if (!selectedPlan) return

    setProcessingAction('downgrade')
    try {
      const response = await fetch('/api/subscription/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPlan: selectedPlan,
          billingCycle,
          reason: downgradeReason
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to downgrade subscription')
      }

      toast.success(`Your plan will be downgraded to ${selectedPlan} at the end of your current billing period`)
      setShowDowngradeDialog(false)
      await fetchBillingData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to downgrade subscription')
    } finally {
      setProcessingAction(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return
    }

    setProcessingAction('cancel')
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to cancel subscription')

      toast.success('Subscription canceled. You retain access until the end of your billing period.')
      await fetchBillingData()
    } catch (error) {
      toast.error('Failed to cancel subscription')
    } finally {
      setProcessingAction(null)
    }
  }

  const openCustomerPortal = async () => {
    setProcessingAction('portal')
    try {
      const response = await fetch('/api/billing/portal')
      const { url } = await response.json()
      window.open(url, '_blank')
    } catch (error) {
      toast.error('Failed to open billing portal')
    } finally {
      setProcessingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!billingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-center">Unable to load billing information</p>
            <Button onClick={fetchBillingData} className="mt-4 w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentPlan = PLANS[billingData.subscription.plan as keyof typeof PLANS] || PLANS.free
  const usagePercent = billingData.usage.minutesLimit > 0
    ? (billingData.usage.minutesUsed / billingData.usage.minutesLimit) * 100
    : 0

  const planHierarchy = ['free', 'solo', 'starter', 'professional', 'enterprise']
  const currentPlanIndex = planHierarchy.indexOf(billingData.subscription.plan)
  const availableUpgrades = planHierarchy.slice(currentPlanIndex + 1)
  const availableDowngrades = planHierarchy.slice(0, currentPlanIndex)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-gray-600 mt-2">Manage your plan, billing, and usage</p>
      </div>

      {/* Current Plan Overview */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{currentPlan.name} Plan</CardTitle>
              <CardDescription>
                {billingData.subscription.billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
              </CardDescription>
            </div>
            <Badge className={cn(
              "text-sm px-3 py-1",
              billingData.subscription.status === 'active' ? 'bg-green-100 text-green-800' :
              billingData.subscription.status === 'canceled' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            )}>
              {billingData.subscription.status.charAt(0).toUpperCase() + billingData.subscription.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Usage Stats */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Minutes Used</span>
                  <span className="font-medium">
                    {formatMinutes(billingData.usage.minutesUsed)} / {formatMinutes(billingData.usage.minutesLimit)}
                  </span>
                </div>
                <Progress value={usagePercent} className="h-2" />
                {usagePercent > 80 && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You're approaching your usage limit. Consider upgrading your plan.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Team Members</span>
                  <span className="font-medium">
                    {billingData.usage.usersActive} / {billingData.usage.usersLimit || 'Unlimited'}
                  </span>
                </div>
                <Progress
                  value={billingData.usage.usersLimit > 0 ? (billingData.usage.usersActive / billingData.usage.usersLimit) * 100 : 0}
                  className="h-2"
                />
              </div>
            </div>

            {/* Billing Info */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Period Ends</span>
                <span className="font-medium">
                  {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Cost</span>
                <span className="font-medium text-xl">
                  ${billingData.subscription.billingCycle === 'annual'
                    ? Math.round(currentPlan.priceAnnual / 12)
                    : currentPlan.price}
                </span>
              </div>
              {billingData.subscription.cancelAtPeriodEnd && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Your subscription will end on {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Change Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Upgrade Options */}
        {availableUpgrades.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Upgrade Options
              </CardTitle>
              <CardDescription>
                Unlock more features and usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableUpgrades.map((planKey) => {
                const plan = PLANS[planKey as keyof typeof PLANS]
                return (
                  <div key={planKey} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h4 className="font-medium">{plan.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatMinutes(plan.maxMinutes)} minutes • {plan.maxMembers || 'Unlimited'} users
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${plan.price}/mo</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        onClick={() => handlePlanChange(planKey, true)}
                      >
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Upgrade
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Downgrade Options */}
        {availableDowngrades.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                Downgrade Options
              </CardTitle>
              <CardDescription>
                Reduce costs with a smaller plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableDowngrades.map((planKey) => {
                const plan = PLANS[planKey as keyof typeof PLANS]
                const savings = currentPlan.price - plan.price
                return (
                  <div key={planKey} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h4 className="font-medium">{plan.name}</h4>
                      <p className="text-sm text-gray-600">
                        {plan.maxMinutes > 0 ? `${formatMinutes(plan.maxMinutes)} minutes` : 'Limited usage'} •
                        {plan.maxMembers > 0 ? ` ${plan.maxMembers} users` : ' Single user'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${plan.price}/mo</p>
                      <p className="text-xs text-green-600">Save ${savings}/mo</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        onClick={() => handlePlanChange(planKey, false)}
                      >
                        <ArrowDown className="h-3 w-3 mr-1" />
                        Downgrade
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={openCustomerPortal}
              disabled={processingAction === 'portal'}
              variant="outline"
            >
              {processingAction === 'portal' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Payment Method
                </>
              )}
            </Button>

            {billingData.subscription.status === 'active' && !billingData.subscription.cancelAtPeriodEnd && (
              <Button
                onClick={handleCancelSubscription}
                disabled={processingAction === 'cancel'}
                variant="destructive"
              >
                {processingAction === 'cancel' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={() => router.push('/billing')}
              variant="outline"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              View Billing History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Downgrade Dialog */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Plan Downgrade</DialogTitle>
            <DialogDescription>
              Review the changes before downgrading your plan
            </DialogDescription>
          </DialogHeader>

          {downgradeEligibility && (
            <div className="space-y-4">
              {/* Eligibility Check */}
              {!downgradeEligibility.eligible && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Cannot Downgrade</AlertTitle>
                  <AlertDescription className="text-red-700">
                    {downgradeEligibility.issues?.map((issue: any, index: number) => (
                      <div key={index} className="mt-2">
                        • {issue.message}
                      </div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {/* Plan Comparison */}
              {downgradeEligibility.eligible && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium">Changes to your plan:</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly minutes:</span>
                        <span>
                          {formatMinutes(currentPlan.maxMinutes)} → {formatMinutes(downgradeEligibility.targetLimits.maxMinutes)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Team members:</span>
                        <span>
                          {currentPlan.maxMembers || 'Unlimited'} → {downgradeEligibility.targetLimits.members}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium text-green-600">
                        <span>Monthly savings:</span>
                        <span>${downgradeEligibility.savingsPerMonth}</span>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Your downgrade will take effect at the end of your current billing period.
                      You'll retain access to your current plan until then.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for downgrading (optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="Help us understand why you're downgrading..."
                      value={downgradeReason}
                      onChange={(e) => setDowngradeReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDowngradeDialog(false)}>
              Cancel
            </Button>
            {downgradeEligibility?.eligible && (
              <Button
                onClick={confirmDowngrade}
                disabled={processingAction === 'downgrade'}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {processingAction === 'downgrade' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Downgrade'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}