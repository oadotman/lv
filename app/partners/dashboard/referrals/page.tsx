// =====================================================
// PARTNER REFERRALS PAGE
// View and manage all partner referrals
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MousePointerClick,
  ArrowUpDown
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Referral {
  id: string;
  customer_email: string;
  customer_organization_id?: string;
  status: 'clicked' | 'signed_up' | 'trial' | 'active' | 'churned' | 'refunded';
  clicked_at?: string;
  signed_up_at?: string;
  converted_at?: string;
  churned_at?: string;
  plan_name?: string;
  monthly_value: number;
  lifetime_value: number;
  months_active: number;
  metadata?: {
    source?: string;
    campaign?: string;
    coupon_code?: string;
  };
}

interface ReferralStats {
  total_referrals: number;
  active_customers: number;
  trial_customers: number;
  churned_customers: number;
  total_lifetime_value: number;
  average_customer_value: number;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'value' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    filterAndSortReferrals();
  }, [referrals, searchTerm, statusFilter, sortField, sortOrder]);

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/partners/referrals');
      if (!response.ok) throw new Error('Failed to fetch referrals');
      const data = await response.json();

      setReferrals(data.referrals || []);
      setStats(data.statistics || null);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referrals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortReferrals = () => {
    let filtered = [...referrals];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.plan_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'date':
          aValue = a.converted_at || a.signed_up_at || a.clicked_at || '';
          bValue = b.converted_at || b.signed_up_at || b.clicked_at || '';
          break;
        case 'value':
          aValue = a.lifetime_value;
          bValue = b.lifetime_value;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReferrals(filtered);
  };

  const exportReferrals = () => {
    const csv = [
      ['Email', 'Status', 'Plan', 'Monthly Value', 'Lifetime Value', 'Months Active', 'Sign Up Date', 'Conversion Date'],
      ...filteredReferrals.map(r => [
        r.customer_email,
        r.status,
        r.plan_name || '',
        (r.monthly_value / 100).toString(),
        (r.lifetime_value / 100).toString(),
        r.months_active.toString(),
        r.signed_up_at || '',
        r.converted_at || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      clicked: MousePointerClick,
      signed_up: Users,
      trial: Clock,
      active: CheckCircle,
      churned: XCircle,
      refunded: XCircle,
    };
    return icons[status as keyof typeof icons] || Users;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      clicked: 'default',
      signed_up: 'secondary',
      trial: 'warning',
      active: 'success',
      churned: 'destructive',
      refunded: 'destructive',
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Referrals</h1>
          <p className="text-gray-600 mt-1">
            Track and manage all your referred customers
          </p>
        </div>
        <Button onClick={exportReferrals} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_referrals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_customers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Lifetime Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_lifetime_value)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Customer Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.average_customer_value)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by email or plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="signed_up">Signed Up</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="churned">Churned</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="value">Lifetime Value</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referrals ({filteredReferrals.length})</CardTitle>
          <CardDescription>
            Showing {filteredReferrals.length} of {referrals.length} total referrals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReferrals.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monthly Value</TableHead>
                    <TableHead>Lifetime Value</TableHead>
                    <TableHead>Months Active</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => {
                    const StatusIcon = getStatusIcon(referral.status);
                    const statusColor = getStatusColor(referral.status);
                    const referralDate = referral.converted_at || referral.signed_up_at || referral.clicked_at;

                    return (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{referral.customer_email}</p>
                            {referral.metadata?.source && (
                              <p className="text-xs text-gray-500">
                                Source: {referral.metadata.source}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColor as any} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {referral.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {referral.plan_name || <span className="text-gray-400">—</span>}
                        </TableCell>
                        <TableCell>
                          {referral.monthly_value > 0
                            ? formatCurrency(referral.monthly_value)
                            : <span className="text-gray-400">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(referral.lifetime_value)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {referral.months_active > 0
                            ? `${referral.months_active} mo${referral.months_active !== 1 ? 's' : ''}`
                            : <span className="text-gray-400">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          {referralDate ? (
                            <div>
                              <p className="text-sm">
                                {new Date(referralDate).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(referralDate).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'No referrals match your filters'
                  : 'No referrals yet'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <p className="text-sm text-gray-400 mt-2">
                  Share your referral link to start earning commissions
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}