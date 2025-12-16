// =====================================================
// ADMIN PAYOUT MANAGEMENT PAGE
// Process and manage partner commission payouts
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Send,
  FileText,
  TrendingUp,
  Calendar,
  CreditCard,
  Users,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Commission {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_email: string;
  payment_method?: string;
  payment_details?: any;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'failed';
  month: string;
  year: number;
  referrals_count: number;
  commission_rate: number;
  total_revenue: number;
  created_at: string;
  approved_at?: string;
  paid_at?: string;
}

interface PayoutSummary {
  total_pending: number;
  total_approved: number;
  total_paid_this_month: number;
  total_paid_all_time: number;
  partners_to_pay: number;
  average_payout: number;
}

interface PayoutBatch {
  id: string;
  total_amount: number;
  partners_count: number;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  created_at: string;
  completed_at?: string;
  success_count?: number;
  failed_count?: number;
}

export default function AdminPayoutsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [recentBatches, setRecentBatches] = useState<PayoutBatch[]>([]);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [filterMonth, setFilterMonth] = useState('');
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchNotes, setBatchNotes] = useState('');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);

  useEffect(() => {
    fetchPayoutData();
  }, [filterStatus, filterMonth]);

  const fetchPayoutData = async () => {
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        ...(filterMonth && { month: filterMonth }),
      });

      const [commissionsRes, summaryRes, batchesRes] = await Promise.all([
        fetch(`/api/partners/admin/payouts?${params}`),
        fetch('/api/partners/admin/payouts/summary'),
        fetch('/api/partners/admin/payouts/batches'),
      ]);

      if (!commissionsRes.ok || !summaryRes.ok || !batchesRes.ok) {
        throw new Error('Failed to fetch payout data');
      }

      const [commissionsData, summaryData, batchesData] = await Promise.all([
        commissionsRes.json(),
        summaryRes.json(),
        batchesRes.json(),
      ]);

      setCommissions(commissionsData.commissions || []);
      setSummary(summaryData.summary);
      setRecentBatches(batchesData.batches || []);
    } catch (error) {
      console.error('Error fetching payout data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligibleIds = commissions
        .filter(c => c.status === 'pending' && c.amount >= 100)
        .map(c => c.id);
      setSelectedCommissions(new Set(eligibleIds));
    } else {
      setSelectedCommissions(new Set());
    }
  };

  const handleSelectCommission = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedCommissions);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedCommissions(newSelection);
  };

  const handleProcessBatch = async () => {
    if (selectedCommissions.size === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select commissions to process',
        variant: 'destructive',
      });
      return;
    }

    setShowBatchDialog(true);
  };

  const confirmBatchProcess = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/partners/admin/payouts/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commission_ids: Array.from(selectedCommissions),
          notes: batchNotes,
        }),
      });

      if (!response.ok) throw new Error('Failed to process batch');

      const result = await response.json();

      toast({
        title: 'Batch Processed',
        description: `Successfully processed ${result.success_count} payouts. ${result.failed_count} failed.`,
      });

      setShowBatchDialog(false);
      setSelectedCommissions(new Set());
      setBatchNotes('');
      fetchPayoutData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process payout batch',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualPayout = async (commission: Commission) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/partners/admin/payouts/${commission.id}/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: prompt('Enter transaction ID:'),
          notes: prompt('Enter notes (optional):'),
        }),
      });

      if (!response.ok) throw new Error('Failed to mark as paid');

      toast({
        title: 'Success',
        description: 'Payout marked as paid',
      });

      fetchPayoutData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark payout as paid',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exportPayouts = async () => {
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        ...(filterMonth && { month: filterMonth }),
      });

      const response = await fetch(`/api/partners/admin/payouts/export?${params}`);
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payouts-${filterStatus}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export payouts',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { variant: 'warning' as const, icon: Clock },
      approved: { variant: 'default' as const, icon: CheckCircle },
      paid: { variant: 'success' as const, icon: DollarSign },
      failed: { variant: 'destructive' as const, icon: XCircle },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <Badge variant={badge.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalSelectedAmount = Array.from(selectedCommissions).reduce((sum, id) => {
    const commission = commissions.find(c => c.id === id);
    return sum + (commission?.amount || 0);
  }, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Payouts</h1>
          <p className="text-gray-600 mt-1">
            Manage and process partner commission payouts
          </p>
        </div>
        <Button onClick={exportPayouts} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-orange-600">
                  ${summary.total_pending.toFixed(2)}
                </span>
                <Badge variant="warning" className="text-xs">
                  {summary.partners_to_pay} partners
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ready to Pay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600">
                  ${summary.total_approved.toFixed(2)}
                </span>
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Paid This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600">
                  ${summary.total_paid_this_month.toFixed(2)}
                </span>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                All Time Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  ${summary.total_paid_all_time.toFixed(2)}
                </span>
                <TrendingUp className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Avg: ${summary.average_payout.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full sm:w-[180px]"
              placeholder="Filter by month"
            />

            {filterStatus === 'pending' && selectedCommissions.size > 0 && (
              <div className="flex gap-2 ml-auto">
                <Badge variant="secondary" className="py-2 px-3">
                  {selectedCommissions.size} selected | ${totalSelectedAmount.toFixed(2)}
                </Badge>
                <Button onClick={handleProcessBatch} disabled={isProcessing}>
                  <Send className="h-4 w-4 mr-2" />
                  Process Batch
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Approval Alert */}
      {filterStatus === 'pending' && commissions.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {commissions.length} pending payouts totaling ${commissions.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}.
            Payouts should be processed by the 5th of each month.
          </AlertDescription>
        </Alert>
      )}

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Payouts</CardTitle>
          <CardDescription>
            {commissions.length} {filterStatus} payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {filterStatus === 'pending' && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          checked={
                            commissions.filter(c => c.amount >= 100).length > 0 &&
                            selectedCommissions.size === commissions.filter(c => c.amount >= 100).length
                          }
                        />
                      </TableHead>
                    )}
                    <TableHead>Partner</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      {filterStatus === 'pending' && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedCommissions.has(commission.id)}
                            onChange={(e) => handleSelectCommission(commission.id, e.target.checked)}
                            disabled={commission.amount < 100}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{commission.partner_name}</p>
                          <p className="text-sm text-gray-500">{commission.partner_email}</p>
                          {commission.payment_method && (
                            <Badge variant="outline" className="text-xs">
                              {commission.payment_method}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {new Date(commission.year, parseInt(commission.month) - 1).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{commission.referrals_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">
                          ${commission.total_revenue.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">
                            ${commission.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {commission.commission_rate}% rate
                          </p>
                          {commission.amount < 100 && (
                            <Badge variant="warning" className="text-xs">
                              Below threshold
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(commission.status)}
                        {commission.paid_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(commission.paid_at).toLocaleDateString()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCommission(commission);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          {commission.status === 'pending' && commission.amount >= 100 && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleManualPayout(commission)}
                              disabled={isProcessing}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                No {filterStatus} payouts found
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Batch Runs */}
      {recentBatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Batch Runs</CardTitle>
            <CardDescription>
              History of bulk payout processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      {batch.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {batch.status === 'processing' && <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />}
                      {batch.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                      {batch.status === 'partial' && <AlertCircle className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div>
                      <p className="font-medium">
                        ${batch.total_amount.toFixed(2)} to {batch.partners_count} partners
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(batch.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {batch.status === 'completed' && (
                      <Badge variant="success">
                        {batch.success_count} successful
                      </Badge>
                    )}
                    {batch.status === 'partial' && (
                      <div className="space-y-1">
                        <Badge variant="success" className="text-xs">
                          {batch.success_count} success
                        </Badge>
                        <Badge variant="destructive" className="text-xs ml-2">
                          {batch.failed_count} failed
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Process Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout Batch</DialogTitle>
            <DialogDescription>
              You are about to process {selectedCommissions.size} payouts totaling ${totalSelectedAmount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will initiate payment processing for all selected partners.
                Ensure payment methods are configured correctly.
              </AlertDescription>
            </Alert>
            <div>
              <label className="text-sm font-medium">Batch Notes</label>
              <Textarea
                placeholder="Add any notes about this batch..."
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBatchProcess}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Process Payments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Details Dialog */}
      {selectedCommission && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Commission Details</DialogTitle>
              <DialogDescription>
                Detailed information for {selectedCommission.partner_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Period</label>
                  <p className="text-sm">
                    {new Date(selectedCommission.year, parseInt(selectedCommission.month) - 1).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedCommission.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Revenue</label>
                  <p className="text-sm font-semibold">${selectedCommission.total_revenue.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Commission Amount</label>
                  <p className="text-sm font-semibold">${selectedCommission.amount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Commission Rate</label>
                  <p className="text-sm">{selectedCommission.commission_rate}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Referrals</label>
                  <p className="text-sm">{selectedCommission.referrals_count} customers</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Method</label>
                  <p className="text-sm">{selectedCommission.payment_method || 'Not configured'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm">
                    {new Date(selectedCommission.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {selectedCommission.payment_details && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Details</label>
                  <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                    {JSON.stringify(selectedCommission.payment_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}