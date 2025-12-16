// =====================================================
// ADMIN PARTNER OVERVIEW PAGE
// Admin interface for managing all partners
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  UserX,
  Award,
  Download,
  Plus,
  AlertCircle
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PartnerOverview {
  id: string;
  full_name: string;
  email: string;
  company_name?: string;
  status: 'active' | 'inactive' | 'suspended';
  tier: 'standard' | 'premium';
  referral_code: string;
  total_referrals: number;
  active_customers: number;
  total_revenue: number;
  total_commission_earned: number;
  total_commission_paid: number;
  joined_date: string;
  last_activity?: string;
}

interface AdminStats {
  total_partners: number;
  active_partners: number;
  total_referrals: number;
  total_revenue_generated: number;
  total_commission_owed: number;
  pending_applications: number;
  pending_payouts: number;
}

export default function AdminPartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerOverview[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<PartnerOverview[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  useEffect(() => {
    fetchPartnerData();
  }, []);

  useEffect(() => {
    filterPartners();
  }, [partners, searchTerm, statusFilter, tierFilter]);

  const fetchPartnerData = async () => {
    try {
      const response = await fetch('/api/partners/admin/overview');
      if (!response.ok) throw new Error('Failed to fetch partner data');
      const data = await response.json();

      // Map the API response to our expected structure
      const mappedPartners = (data.partners || []).map((p: any) => ({
        id: p.id,
        full_name: p.name || p.email,
        email: p.email,
        company_name: p.company,
        status: p.status || 'active',
        tier: p.tier || 'bronze',
        referral_code: p.referralCode || '',
        total_referrals: 0,
        active_customers: 0,
        total_revenue: 0,
        total_commission_earned: 0,
        total_commission_paid: 0,
        joined_date: p.joinedAt || p.created_at,
        last_activity: null
      }));

      // Map stats from the API response
      const mappedStats = data.stats ? {
        total_partners: data.stats.totalPartners || 0,
        active_partners: data.stats.totalPartners || 0,
        total_referrals: data.stats.totalReferrals || 0,
        total_revenue_generated: 0,
        total_commission_owed: data.stats.pendingCommissions || 0,
        pending_applications: data.stats.pendingApplications || 0,
        pending_payouts: data.stats.pendingCommissions || 0
      } : {
        total_partners: 0,
        active_partners: 0,
        total_referrals: 0,
        total_revenue_generated: 0,
        total_commission_owed: 0,
        pending_applications: 0,
        pending_payouts: 0
      };

      setPartners(mappedPartners);
      setStats(mappedStats);
    } catch (error) {
      console.error('Error fetching partner data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load partner data',
        variant: 'destructive',
      });
      // Set empty state on error
      setPartners([]);
      setStats({
        total_partners: 0,
        active_partners: 0,
        total_referrals: 0,
        total_revenue_generated: 0,
        total_commission_owed: 0,
        pending_applications: 0,
        pending_payouts: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPartners = () => {
    let filtered = [...partners];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(p => p.tier === tierFilter);
    }

    setFilteredPartners(filtered);
  };

  const handleStatusChange = async (partnerId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/partners/admin/partners/${partnerId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update partner status');

      toast({
        title: 'Success',
        description: 'Partner status updated',
      });

      // Refresh data
      fetchPartnerData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update partner status',
        variant: 'destructive',
      });
    }
  };

  const handleTierChange = async (partnerId: string, newTier: string) => {
    try {
      const response = await fetch(`/api/partners/admin/partners/${partnerId}/tier`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: newTier }),
      });

      if (!response.ok) throw new Error('Failed to update partner tier');

      toast({
        title: 'Success',
        description: 'Partner tier updated',
      });

      // Refresh data
      fetchPartnerData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update partner tier',
        variant: 'destructive',
      });
    }
  };

  const exportPartnerData = () => {
    const csv = [
      ['Name', 'Email', 'Company', 'Status', 'Tier', 'Code', 'Referrals', 'Customers', 'Revenue', 'Commission', 'Paid', 'Joined'],
      ...filteredPartners.map(p => [
        p.full_name,
        p.email,
        p.company_name || '',
        p.status,
        p.tier,
        p.referral_code,
        p.total_referrals.toString(),
        p.active_customers.toString(),
        (p.total_revenue / 100).toString(),
        (p.total_commission_earned / 100).toString(),
        (p.total_commission_paid / 100).toString(),
        p.joined_date
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partners-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partner Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor all partner accounts
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportPartnerData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild>
            <Link href="/admin/partners/applications">
              <FileText className="h-4 w-4 mr-2" />
              Applications ({stats?.pending_applications || 0})
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Partners</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_partners}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.active_partners} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Referrals</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_referrals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Revenue Generated</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_revenue_generated)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Commission Owed</CardTitle>
                <AlertCircle className="h-4 w-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.total_commission_owed)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.pending_payouts} pending payouts
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Partners</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email, company, or code..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partners ({filteredPartners.length})</CardTitle>
          <CardDescription>
            Showing {filteredPartners.length} of {partners.length} partners
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPartners.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{partner.full_name}</p>
                          <p className="text-sm text-gray-500">{partner.email}</p>
                          {partner.company_name && (
                            <p className="text-xs text-gray-400">{partner.company_name}</p>
                          )}
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {partner.referral_code}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            partner.status === 'active'
                              ? 'success'
                              : partner.status === 'suspended'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {partner.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.tier === 'premium' ? 'default' : 'outline'}>
                          {partner.tier === 'premium' && <Award className="h-3 w-3 mr-1" />}
                          {partner.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{partner.total_referrals}</p>
                          <p className="text-xs text-gray-500">
                            {partner.active_customers} active
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{formatCurrency(partner.total_revenue)}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(partner.total_commission_earned)}</p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(partner.total_commission_paid)} paid
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {new Date(partner.joined_date).toLocaleDateString()}
                          </p>
                          {partner.last_activity && (
                            <p className="text-xs text-gray-500">
                              Active {new Date(partner.last_activity).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/partners/${partner.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/partners/${partner.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Partner
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {partner.status === 'active' ? (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(partner.id, 'suspended')}
                                className="text-red-600"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Suspend Partner
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(partner.id, 'active')}
                                className="text-green-600"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Activate Partner
                              </DropdownMenuItem>
                            )}
                            {partner.tier === 'standard' ? (
                              <DropdownMenuItem
                                onClick={() => handleTierChange(partner.id, 'premium')}
                              >
                                <Award className="h-4 w-4 mr-2" />
                                Upgrade to Premium
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleTierChange(partner.id, 'standard')}
                              >
                                <Award className="h-4 w-4 mr-2" />
                                Downgrade to Standard
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || tierFilter !== 'all'
                  ? 'No partners match your filters'
                  : 'No partners yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}