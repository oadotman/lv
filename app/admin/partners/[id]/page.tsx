// =====================================================
// ADMIN PARTNER DETAILS PAGE
// View and manage individual partner accounts
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  User,
  Mail,
  Phone,
  Globe,
  Building,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  Settings,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Edit,
  Save,
  X,
  RefreshCw,
  FileText,
  Download,
  Send,
  MessageSquare,
  Shield,
  CreditCard,
  Loader2,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Partner {
  id: string;
  email: string;
  name: string;
  company?: string;
  phone?: string;
  website?: string;
  partner_type: string;
  status: 'active' | 'suspended' | 'terminated';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  commission_rate: number;
  referral_code: string;
  signup_link: string;
  created_at: string;
  activated_at?: string;
  last_login?: string;
  payment_method?: string;
  payment_details?: any;
  notes?: string;
  lifetime_earnings: number;
  pending_earnings: number;
  total_referrals: number;
  active_customers: number;
  churn_rate: number;
}

interface Referral {
  id: string;
  customer_name: string;
  customer_email: string;
  status: 'lead' | 'trial' | 'converted' | 'churned';
  signup_date: string;
  conversion_date?: string;
  churn_date?: string;
  plan: string;
  monthly_value: number;
  lifetime_value: number;
  commission_earned: number;
}

interface Commission {
  id: string;
  month: string;
  year: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'failed';
  referrals_count: number;
  paid_at?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export default function AdminPartnerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedPartner, setEditedPartner] = useState<Partial<Partner>>({});
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [terminateReason, setTerminateReason] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (partnerId) {
      fetchPartnerDetails();
    }
  }, [partnerId]);

  const fetchPartnerDetails = async () => {
    try {
      const [partnerRes, referralsRes, commissionsRes, activitiesRes] = await Promise.all([
        fetch(`/api/partners/admin/${partnerId}`),
        fetch(`/api/partners/admin/${partnerId}/referrals`),
        fetch(`/api/partners/admin/${partnerId}/commissions`),
        fetch(`/api/partners/admin/${partnerId}/activities`),
      ]);

      if (!partnerRes.ok) {
        throw new Error('Partner not found');
      }

      const [partnerData, referralsData, commissionsData, activitiesData] = await Promise.all([
        partnerRes.json(),
        referralsRes.json(),
        commissionsRes.json(),
        activitiesRes.json(),
      ]);

      setPartner(partnerData.partner);
      setReferrals(referralsData.referrals || []);
      setCommissions(commissionsData.commissions || []);
      setActivities(activitiesData.activities || []);
      setEditedPartner(partnerData.partner);
    } catch (error) {
      console.error('Error fetching partner details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load partner details',
        variant: 'destructive',
      });
      router.push('/admin/partners');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedPartner({ ...partner });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPartner({ ...partner });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/partners/admin/${partnerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedPartner),
      });

      if (!response.ok) throw new Error('Failed to update partner');

      const { partner: updatedPartner } = await response.json();
      setPartner(updatedPartner);
      setIsEditing(false);

      toast({
        title: 'Success',
        description: 'Partner details updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update partner details',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspend = async () => {
    try {
      const response = await fetch(`/api/partners/admin/${partnerId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: suspendReason }),
      });

      if (!response.ok) throw new Error('Failed to suspend partner');

      toast({
        title: 'Success',
        description: 'Partner account suspended',
      });

      setShowSuspendDialog(false);
      fetchPartnerDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to suspend partner',
        variant: 'destructive',
      });
    }
  };

  const handleReactivate = async () => {
    try {
      const response = await fetch(`/api/partners/admin/${partnerId}/reactivate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to reactivate partner');

      toast({
        title: 'Success',
        description: 'Partner account reactivated',
      });

      fetchPartnerDetails();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reactivate partner',
        variant: 'destructive',
      });
    }
  };

  const handleTerminate = async () => {
    try {
      const response = await fetch(`/api/partners/admin/${partnerId}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: terminateReason }),
      });

      if (!response.ok) throw new Error('Failed to terminate partner');

      toast({
        title: 'Success',
        description: 'Partner account terminated',
      });

      setShowTerminateDialog(false);
      router.push('/admin/partners');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to terminate partner',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    try {
      const response = await fetch(`/api/partners/admin/${partnerId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      toast({
        title: 'Success',
        description: 'Message sent to partner',
      });

      setShowMessageDialog(false);
      setMessage('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const copyReferralLink = () => {
    if (partner?.signup_link) {
      navigator.clipboard.writeText(partner.signup_link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const exportPartnerData = async () => {
    try {
      const response = await fetch(`/api/partners/admin/${partnerId}/export`);
      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partner-${partner?.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export partner data',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500">Partner not found</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { variant: 'success' as const, icon: CheckCircle },
      suspended: { variant: 'warning' as const, icon: Ban },
      terminated: { variant: 'destructive' as const, icon: XCircle },
    };

    const badge = badges[status as keyof typeof badges] || badges.active;
    const Icon = badge.icon;

    return (
      <Badge variant={badge.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-sky-100 text-sky-800',
    };

    return (
      <Badge className={colors[tier as keyof typeof colors] || colors.bronze}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/partners')}
          >
            ← Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{partner.name}</h1>
            <p className="text-gray-600 mt-1">
              Partner ID: {partner.id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPartnerData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {!isEditing ? (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Partner Info and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partner Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Partner Information</CardTitle>
            <CardDescription>
              Basic details and configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      value={editedPartner.email}
                      onChange={(e) => setEditedPartner({ ...editedPartner, email: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    <span className="text-sm">{partner.email}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      value={editedPartner.phone || ''}
                      onChange={(e) => setEditedPartner({ ...editedPartner, phone: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    <span className="text-sm">{partner.phone || 'Not provided'}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Company</label>
                <div className="flex items-center gap-2 mt-1">
                  <Building className="h-4 w-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      value={editedPartner.company || ''}
                      onChange={(e) => setEditedPartner({ ...editedPartner, company: e.target.value })}
                      className="h-8"
                    />
                  ) : (
                    <span className="text-sm">{partner.company || 'Not provided'}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Website</label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="h-4 w-4 text-gray-400" />
                  {isEditing ? (
                    <Input
                      value={editedPartner.website || ''}
                      onChange={(e) => setEditedPartner({ ...editedPartner, website: e.target.value })}
                      className="h-8"
                    />
                  ) : partner.website ? (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {partner.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500">Not provided</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  {isEditing ? (
                    <Select
                      value={editedPartner.status}
                      onValueChange={(value) => setEditedPartner({ ...editedPartner, status: value as any })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getStatusBadge(partner.status)
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tier</label>
                <div className="mt-1">
                  {isEditing ? (
                    <Select
                      value={editedPartner.tier}
                      onValueChange={(value) => setEditedPartner({ ...editedPartner, tier: value as any })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="platinum">Platinum</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getTierBadge(partner.tier)
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Commission Rate</label>
                <div className="flex items-center gap-2 mt-1">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={editedPartner.commission_rate}
                        onChange={(e) => setEditedPartner({ ...editedPartner, commission_rate: parseFloat(e.target.value) })}
                        className="h-8 w-20"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <span className="text-sm">%</span>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold">{partner.commission_rate}%</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Partner Type</label>
                <div className="mt-1">
                  {isEditing ? (
                    <Select
                      value={editedPartner.partner_type}
                      onValueChange={(value) => setEditedPartner({ ...editedPartner, partner_type: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crm_consultant">CRM Consultant</SelectItem>
                        <SelectItem value="fractional_sales_leader">Fractional Sales Leader</SelectItem>
                        <SelectItem value="sales_coach">Sales Coach</SelectItem>
                        <SelectItem value="revops_consultant">RevOps Consultant</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">{partner.partner_type.replace('_', ' ')}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Referral Link */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-gray-500">Referral Link</label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={partner.signup_link}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyReferralLink}
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Referral Code: <code className="bg-gray-100 px-1 rounded">{partner.referral_code}</code>
              </p>
            </div>

            {/* Notes */}
            {isEditing && (
              <div>
                <label className="text-sm font-medium text-gray-500">Internal Notes</label>
                <Textarea
                  value={editedPartner.notes || ''}
                  onChange={(e) => setEditedPartner({ ...editedPartner, notes: e.target.value })}
                  rows={3}
                  className="mt-1"
                  placeholder="Add internal notes about this partner..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>
              Key metrics and earnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Lifetime Earnings</span>
                <span className="text-xl font-bold text-green-600">
                  ${partner.lifetime_earnings.toFixed(2)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Pending Earnings</span>
                <span className="text-lg font-semibold text-orange-600">
                  ${partner.pending_earnings.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Total Referrals</span>
                <span className="font-semibold">{partner.total_referrals}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Active Customers</span>
                <span className="font-semibold">{partner.active_customers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Churn Rate</span>
                <span className="font-semibold">{partner.churn_rate.toFixed(1)}%</span>
              </div>
            </div>
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs text-gray-500">
                <Calendar className="inline h-3 w-3 mr-1" />
                Joined: {new Date(partner.created_at).toLocaleDateString()}
              </p>
              {partner.last_login && (
                <p className="text-xs text-gray-500">
                  <Activity className="inline h-3 w-3 mr-1" />
                  Last login: {new Date(partner.last_login).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMessageDialog(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            {partner.status === 'active' ? (
              <Button
                variant="destructive"
                onClick={() => setShowSuspendDialog(true)}
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspend Account
              </Button>
            ) : partner.status === 'suspended' ? (
              <Button
                variant="default"
                onClick={handleReactivate}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Reactivate Account
              </Button>
            ) : null}
            {partner.status !== 'terminated' && (
              <Button
                variant="destructive"
                onClick={() => setShowTerminateDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Terminate Account
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="referrals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="referrals">
            Referrals ({referrals.length})
          </TabsTrigger>
          <TabsTrigger value="commissions">
            Commissions ({commissions.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Referred Customers</CardTitle>
              <CardDescription>
                All customers referred by this partner
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referrals.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Monthly Value</TableHead>
                        <TableHead>Lifetime Value</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Dates</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{referral.customer_name}</p>
                              <p className="text-sm text-gray-500">{referral.customer_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              referral.status === 'converted' ? 'success' :
                              referral.status === 'trial' ? 'default' :
                              referral.status === 'churned' ? 'destructive' :
                              'secondary'
                            }>
                              {referral.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{referral.plan}</TableCell>
                          <TableCell>${referral.monthly_value.toFixed(2)}</TableCell>
                          <TableCell>${referral.lifetime_value.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              ${referral.commission_earned.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <p>Signed up: {new Date(referral.signup_date).toLocaleDateString()}</p>
                              {referral.conversion_date && (
                                <p>Converted: {new Date(referral.conversion_date).toLocaleDateString()}</p>
                              )}
                              {referral.churn_date && (
                                <p className="text-red-600">
                                  Churned: {new Date(referral.churn_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No referrals yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>
                Monthly commission records and payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Referrals</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            {new Date(commission.year, parseInt(commission.month) - 1).toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>{commission.referrals_count}</TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              ${commission.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              commission.status === 'paid' ? 'success' :
                              commission.status === 'approved' ? 'default' :
                              commission.status === 'failed' ? 'destructive' :
                              'warning'
                            }>
                              {commission.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {commission.paid_at ?
                              new Date(commission.paid_at).toLocaleDateString() :
                              '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No commission records yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Recent actions and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Activity className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        {activity.details && (
                          <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <p className="text-xs text-gray-400">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                          {activity.ip_address && (
                            <p className="text-xs text-gray-400">
                              IP: {activity.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No activity recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Partner Account</DialogTitle>
            <DialogDescription>
              This will temporarily disable the partner's access and referral tracking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The partner will be notified via email about the suspension.
                You can reactivate the account at any time.
              </AlertDescription>
            </Alert>
            <div>
              <label className="text-sm font-medium">Reason for Suspension</label>
              <Textarea
                placeholder="Enter the reason for suspending this account..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspendReason}
            >
              <Ban className="mr-2 h-4 w-4" />
              Suspend Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Dialog */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Partner Account</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Terminating this account will:
                <ul className="list-disc list-inside mt-2">
                  <li>Permanently disable partner access</li>
                  <li>Stop all referral tracking</li>
                  <li>Cancel pending commissions</li>
                  <li>Archive all partner data</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div>
              <label className="text-sm font-medium">Reason for Termination</label>
              <Textarea
                placeholder="Enter the reason for terminating this account..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTerminateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={!terminateReason}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Terminate Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to Partner</DialogTitle>
            <DialogDescription>
              Send an email message to {partner.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMessageDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message}
            >
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}