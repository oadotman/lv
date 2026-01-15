'use client'

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  TrendingUp,
  Download,
  AlertCircle,
  Check,
  X,
  Calendar,
  DollarSign,
  Zap,
  Users,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PLANS,
  formatMinutes,
  formatPrice,
  getUsageStatus,
  calculateOverageCost
} from '@/lib/pricing'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner'

interface BillingData {
  subscription: {
    plan: string
    status: 'active' | 'canceled' | 'paused' | 'trialing'
    billingCycle: 'monthly' | 'annual'
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
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
  invoices: Array<{
    id: string
    date: string
    amount: number
    downloadUrl: string
  }>
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  const handleUpgrade = () => {
    router.push('/pricing')
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

  const handleResumeSubscription = async () => {
    setProcessingAction('resume')
    try {
      const response = await fetch('/api/subscription/resume', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to resume subscription')

      toast.success('Subscription resumed successfully')
      await fetchBillingData()
    } catch (error) {
      toast.error('Failed to resume subscription')
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
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

  const plan = PLANS[billingData.subscription.plan as keyof typeof PLANS]
  const usageStatus = getUsageStatus(billingData.usage.minutesUsed, billingData.subscription.plan as any)
  const overageCost = calculateOverageCost(billingData.usage.minutesUsed, billingData.subscription.plan as any)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
        <p className="text-gray-600 mt-2">Manage your subscription and track usage</p>
      </div>

      {/* Current Plan Card */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </div>
            <Badge className={
              billingData.subscription.status === 'active' ? 'bg-green-100 text-green-800' :
              billingData.subscription.status === 'canceled' ? 'bg-red-100 text-red-800' :
              billingData.subscription.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }>
              {billingData.subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-3xl font-bold text-cyan-600 mt-2">
                ${billingData.subscription.billingCycle === 'annual'
                  ? Math.round(plan.priceAnnual / 12)
                  : plan.price}
                <span className="text-base text-gray-500 font-normal">/month</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Billed {billingData.subscription.billingCycle}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Billing Period Ends</span>
                <span className="font-medium">
                  {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
              {billingData.subscription.cancelAtPeriodEnd && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Subscription will end on {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {billingData.subscription.status === 'active' && !billingData.subscription.cancelAtPeriodEnd && (
              <>
                <Button onClick={handleUpgrade} className="bg-cyan-600 hover:bg-cyan-700">
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={openCustomerPortal}
                  disabled={processingAction === 'portal'}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={processingAction === 'cancel'}
                  className="text-red-600 hover:bg-red-50"
                >
                  Cancel Subscription
                </Button>
              </>
            )}
            {billingData.subscription.cancelAtPeriodEnd && (
              <Button
                onClick={handleResumeSubscription}
                disabled={processingAction === 'resume'}
                className="bg-green-600 hover:bg-green-700"
              >
                Resume Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Minutes Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-cyan-600" />
              Minutes Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-2xl font-bold">
                    {formatMinutes(billingData.usage.minutesUsed)}
                  </span>
                  <span className="text-sm text-gray-500">
                    of {formatMinutes(billingData.usage.minutesLimit)}
                  </span>
                </div>
                <Progress
                  value={usageStatus.percentage}
                  className={
                    usageStatus.status === 'overage' ? 'bg-red-200' :
                    usageStatus.status === 'critical' ? 'bg-orange-200' :
                    usageStatus.status === 'warning' ? 'bg-yellow-200' :
                    'bg-gray-200'
                  }
                />
              </div>

              {usageStatus.status === 'overage' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    Overage charges: {formatPrice(overageCost * 100)}
                  </p>
                </div>
              )}

              {usageStatus.status === 'warning' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    {100 - Math.floor(usageStatus.percentage)}% of minutes remaining
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-2xl font-bold">
                    {billingData.usage.usersActive}
                  </span>
                  <span className="text-sm text-gray-500">
                    of {billingData.usage.usersLimit} seats
                  </span>
                </div>
                <Progress
                  value={(billingData.usage.usersActive / billingData.usage.usersLimit) * 100}
                />
              </div>

              {billingData.usage.usersActive >= billingData.usage.usersLimit && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    Team limit reached. Upgrade to add more members.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History & Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="payments">
            <TabsList>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="payments">
              <div className="space-y-3">
                {billingData.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {payment.status === 'succeeded' ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : payment.status === 'failed' ? (
                        <X className="h-5 w-5 text-red-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold">
                      {formatPrice(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="invoices">
              <div className="space-y-3">
                {billingData.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        Invoice #{invoice.id.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(invoice.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">
                        {formatPrice(invoice.amount)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.downloadUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}