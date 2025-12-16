// =====================================================
// PARTNER EARNINGS & PAYOUTS PAGE
// View commission details and payout history
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Info,
  Download,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';

interface Commission {
  id: string;
  customer_email?: string;
  customer_organization_id?: string;
  amount_cents: number;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  month: string;
  calculated_at: string;
  approved_at?: string;
  paid_at?: string;
  reversed_at?: string;
  reversal_reason?: string;
  payout_id?: string;
  commission_rate: number;
  base_amount_cents: number;
}

interface Payout {
  id: string;
  amount_cents: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method: string;
  period_start: string;
  period_end: string;
  commission_count: number;
  processed_at?: string;
  completed_at?: string;
  transaction_id?: string;
  payment_receipt_url?: string;
}

interface EarningsData {
  commissions: Commission[];
  payouts: Payout[];
  summary: {
    total_earned: number;
    total_paid: number;
    total_pending: number;
    total_approved: number;
    this_month: number;
    last_month: number;
    next_payout: number;
    next_payout_date: string | null;
    commission_rate: number;
    tier: string;
  };
  monthly_breakdown: Array<{
    month: string;
    earned: number;
    paid: number;
    pending: number;
    customer_count: number;
  }>;
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      const response = await fetch('/api/partners/earnings');
      if (!response.ok) throw new Error('Failed to fetch earnings data');
      const earningsData = await response.json();
      setData(earningsData);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load earnings data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadStatement = (month?: string) => {
    // Generate PDF statement
    toast({
      title: 'Generating Statement',
      description: month ? `Downloading statement for ${month}` : 'Downloading full statement',
    });
    // Implementation would generate actual PDF
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: Clock,
      approved: AlertCircle,
      paid: CheckCircle,
      reversed: XCircle,
      processing: Clock,
      completed: CheckCircle,
      failed: XCircle,
    };
    return icons[status as keyof typeof icons] || Info;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'warning',
      approved: 'secondary',
      paid: 'success',
      reversed: 'destructive',
      processing: 'warning',
      completed: 'success',
      failed: 'destructive',
    };
    return colors[status as keyof typeof colors] || 'default';
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
        <AlertDescription>Failed to load earnings data. Please try refreshing the page.</AlertDescription>
      </Alert>
    );
  }

  const { summary } = data;
  const progressToNextPayout = summary.total_approved >= 10000
    ? 100
    : (summary.total_approved / 10000) * 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings & Payouts</h1>
          <p className="text-gray-600 mt-1">
            Track your commissions and payment history
          </p>
        </div>
        <Button onClick={() => downloadStatement()} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Statement
        </Button>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.total_earned)}</div>
            <p className="text-xs text-gray-600 mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_paid)}</div>
            <p className="text-xs text-gray-600 mt-1">Total received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.total_pending)}</div>
            <p className="text-xs text-gray-600 mt-1">In holding period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_approved)}</div>
            <p className="text-xs text-gray-600 mt-1">Ready for payout</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Payout Alert */}
      {summary.next_payout_date && summary.next_payout > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <DollarSign className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Next Payout:</strong> {formatCurrency(summary.next_payout)} scheduled for{' '}
            {new Date(summary.next_payout_date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Payout Progress */}
      {summary.total_approved < 10000 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress to Next Payout</CardTitle>
            <CardDescription>
              Minimum payout threshold: $100.00
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Balance</span>
                <span className="font-semibold">{formatCurrency(summary.total_approved)}</span>
              </div>
              <Progress value={progressToNextPayout} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>$0.00</span>
                <span>$100.00</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {summary.total_approved < 10000
                  ? `Earn ${formatCurrency(10000 - summary.total_approved)} more to reach the payout threshold`
                  : 'Payout threshold reached! Payment will be processed on the 15th'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
              <CardDescription>Your earnings by month</CardDescription>
            </CardHeader>
            <CardContent>
              {data.monthly_breakdown.length > 0 ? (
                <div className="space-y-3">
                  {data.monthly_breakdown.map((month) => (
                    <div key={month.month} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {new Date(month.month + '-01').toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadStatement(month.month)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Earned</p>
                          <p className="font-semibold">{formatCurrency(month.earned)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Paid</p>
                          <p className="font-semibold text-green-600">{formatCurrency(month.paid)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Pending</p>
                          <p className="font-semibold text-yellow-600">{formatCurrency(month.pending)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Customers</p>
                          <p className="font-semibold">{month.customer_count}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No earnings yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commission Info */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Current Tier</p>
                  <p className="text-sm text-gray-600">
                    Based on your performance
                  </p>
                </div>
                <Badge className="text-lg px-3 py-1" variant={summary.tier === 'premium' ? 'default' : 'secondary'}>
                  {summary.tier.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Commission Rate</p>
                  <p className="text-sm text-gray-600">
                    Per customer, up to 12 months
                  </p>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {(summary.commission_rate * 100).toFixed(0)}%
                </span>
              </div>
              {summary.tier === 'standard' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Reach 10+ active referrals to unlock the Premium tier with 30% commission rate!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Commission Details</CardTitle>
              <CardDescription>All your commission transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {data.commissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Base Amount</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.commissions.map((commission) => {
                        const StatusIcon = getStatusIcon(commission.status);
                        const statusColor = getStatusColor(commission.status);

                        return (
                          <TableRow key={commission.id}>
                            <TableCell>
                              {new Date(commission.month + '-01').toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{commission.customer_email || 'Customer'}</p>
                            </TableCell>
                            <TableCell>{formatCurrency(commission.base_amount_cents)}</TableCell>
                            <TableCell>{(commission.commission_rate * 100).toFixed(0)}%</TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                {formatCurrency(commission.amount_cents)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusColor as any} className="flex items-center gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {commission.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(commission.calculated_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No commissions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Your payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {data.payouts.length > 0 ? (
                <div className="space-y-3">
                  {data.payouts.map((payout) => {
                    const StatusIcon = getStatusIcon(payout.status);
                    const statusColor = getStatusColor(payout.status);

                    return (
                      <div key={payout.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-semibold text-lg">
                                {formatCurrency(payout.amount_cents)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(payout.period_start).toLocaleDateString()} -{' '}
                                {new Date(payout.period_end).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant={statusColor as any} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {payout.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Method</p>
                            <p className="font-medium capitalize">{payout.payment_method.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Commissions</p>
                            <p className="font-medium">{payout.commission_count}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Processed</p>
                            <p className="font-medium">
                              {payout.processed_at
                                ? new Date(payout.processed_at).toLocaleDateString()
                                : '—'}
                            </p>
                          </div>
                          {payout.transaction_id && (
                            <div>
                              <p className="text-gray-600">Transaction ID</p>
                              <p className="font-medium text-xs font-mono">{payout.transaction_id}</p>
                            </div>
                          )}
                        </div>
                        {payout.payment_receipt_url && (
                          <div className="mt-3 pt-3 border-t">
                            <Button variant="outline" size="sm" asChild>
                              <a href={payout.payment_receipt_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4 mr-2" />
                                View Receipt
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No payouts yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Payouts are processed monthly when you reach the $100 threshold
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}