// =====================================================
// PARTNER DASHBOARD OVERVIEW PAGE
// Main dashboard showing partner statistics and activity
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  Users,
  MousePointerClick,
  TrendingUp,
  Copy,
  ExternalLink,
  Download,
  ArrowUp,
  ArrowDown,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface DashboardData {
  partner: {
    id: string;
    full_name: string;
    email: string;
    tier: string;
    referral_code: string;
    commission_rate: number;
  };
  statistics: {
    total_clicks: number;
    total_signups: number;
    total_customers: number;
    active_customers: number;
    total_commission_earned: number;
    total_commission_paid: number;
    total_commission_pending: number;
    current_month_earnings: number;
    last_month_earnings: number;
    conversion_rate: number;
  };
  recent_referrals: Array<{
    id: string;
    customer_email: string;
    status: string;
    signed_up_at: string;
    monthly_value: number;
  }>;
  recent_commissions: Array<{
    id: string;
    amount_cents: number;
    status: string;
    month: string;
    customer_email?: string;
  }>;
  next_payout?: {
    amount_cents: number;
    date: string;
  };
}

export default function PartnerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [referralLink, setReferralLink] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/partners/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const dashboardData = await response.json();
      setData(dashboardData);

      // Generate referral link
      const baseUrl = window.location.origin;
      setReferralLink(`${baseUrl}/?ref=${dashboardData.partner.referral_code}`);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      clicked: { color: 'bg-gray-100 text-gray-800', icon: MousePointerClick },
      signed_up: { color: 'bg-blue-100 text-blue-800', icon: Users },
      trial: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      churned: { color: 'bg-red-100 text-red-800', icon: ArrowDown },
    };

    const badge = badges[status as keyof typeof badges] || badges.clicked;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>Failed to load dashboard data. Please try refreshing the page.</AlertDescription>
      </Alert>
    );
  }

  const stats = data.statistics;
  const monthlyChange = stats.current_month_earnings - stats.last_month_earnings;
  const monthlyChangePercent = stats.last_month_earnings > 0
    ? ((monthlyChange / stats.last_month_earnings) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {data.partner.full_name}! Track your referrals and earnings.
        </p>
      </div>

      {/* Referral Link Card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>Share this link with your clients to earn commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2 bg-white border rounded-md text-sm font-mono"
            />
            <Button onClick={copyReferralLink} size="sm">
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={referralLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Anyone who clicks this link and signs up within 90 days will be attributed to you.
          </p>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_clicks}</div>
            <p className="text-xs text-gray-600 mt-1">
              Conversion rate: {stats.conversion_rate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_customers}</div>
            <p className="text-xs text-gray-600 mt-1">
              {stats.total_signups} total signups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.current_month_earnings)}</div>
            <div className="flex items-center text-xs mt-1">
              {monthlyChange >= 0 ? (
                <>
                  <ArrowUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+{monthlyChangePercent}%</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3 text-red-600 mr-1" />
                  <span className="text-red-600">{monthlyChangePercent}%</span>
                </>
              )}
              <span className="text-gray-600 ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_commission_earned)}</div>
            <p className="text-xs text-gray-600 mt-1">
              {formatCurrency(stats.total_commission_paid)} paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payout Alert */}
      {data.next_payout && data.next_payout.amount_cents > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <DollarSign className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Next Payout:</strong> {formatCurrency(data.next_payout.amount_cents)} scheduled for{' '}
            {new Date(data.next_payout.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Commission Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Commission Overview</CardTitle>
            <CardDescription>Your commission breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(stats.total_commission_pending)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Pending</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.total_commission_earned - stats.total_commission_paid - stats.total_commission_pending)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Approved</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.total_commission_paid)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Paid</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Commission Rate</span>
                  <span className="font-semibold">
                    {(data.partner.commission_rate * 100).toFixed(0)}%
                    {data.partner.tier === 'premium' && (
                      <span className="ml-2 text-xs text-purple-600">(Premium)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Partner Tier</span>
                  <span className="font-semibold capitalize">{data.partner.tier}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/partners/dashboard/referrals">
                <Users className="h-4 w-4 mr-2" />
                View All Referrals
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/partners/dashboard/earnings">
                <DollarSign className="h-4 w-4 mr-2" />
                Earnings Details
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/partners/dashboard/resources">
                <Download className="h-4 w-4 mr-2" />
                Marketing Resources
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Referrals</CardTitle>
              <CardDescription>Your latest referred customers</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/partners/dashboard/referrals">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.recent_referrals.length > 0 ? (
            <div className="space-y-2">
              {data.recent_referrals.slice(0, 5).map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{referral.customer_email}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(referral.signed_up_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {referral.monthly_value > 0 && (
                      <span className="text-sm font-medium">
                        {formatCurrency(referral.monthly_value)}/mo
                      </span>
                    )}
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No referrals yet</p>
              <p className="text-sm mt-1">Share your referral link to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}