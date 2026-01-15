// =====================================================
// ADMIN PARTNER APPLICATIONS REVIEW PAGE
// Review and approve/reject partner applications
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Globe,
  Linkedin,
  Phone,
  Mail,
  Building,
  User,
  AlertCircle,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Application {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  website?: string;
  phone?: string;
  partner_type: string;
  clients_per_year?: string;
  crms_used?: string[];
  how_heard?: string;
  why_partner: string;
  has_used_loadvoice: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'more_info_needed';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  ip_address?: string;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'more_info'>('approve');

  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  const fetchApplications = async () => {
    try {
      const response = await fetch(`/api/partners/admin/applications?status=${filterStatus}`);
      if (!response.ok) throw new Error('Failed to fetch applications');
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewApplication = (application: Application, action: 'approve' | 'reject' | 'more_info') => {
    setSelectedApplication(application);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewDialog(true);
  };

  const processReview = async () => {
    if (!selectedApplication) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/partners/admin/applications/${selectedApplication.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: reviewAction,
          notes: reviewNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process application');
      }

      toast({
        title: 'Success',
        description: `Application ${reviewAction === 'approve' ? 'approved' : reviewAction === 'reject' ? 'rejected' : 'marked for more info'}`,
      });

      setShowReviewDialog(false);
      fetchApplications();
    } catch (error: any) {
      console.error('Application review error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process application',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPartnerTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      crm_consultant: 'CRM Consultant',
      fractional_sales_leader: 'Fractional Sales Leader',
      sales_coach: 'Sales Coach',
      revops_consultant: 'RevOps Consultant',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { variant: 'warning' as const, icon: Clock },
      approved: { variant: 'success' as const, icon: CheckCircle },
      rejected: { variant: 'destructive' as const, icon: XCircle },
      more_info_needed: { variant: 'secondary' as const, icon: MessageSquare },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <Badge variant={badge.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
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

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Partner Applications</h1>
        <p className="text-gray-600 mt-1">
          Review and process partner program applications
        </p>
      </div>

      {/* Status Filter Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            {['pending', 'approved', 'rejected', 'more_info_needed'].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {status.replace('_', ' ')}
                {status === 'pending' && pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Applications Alert */}
      {filterStatus === 'pending' && pendingCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {pendingCount} pending application{pendingCount !== 1 ? 's' : ''} to review.
            Applications should be reviewed within 2 business days.
          </AlertDescription>
        </Alert>
      )}

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {applications.length} {filterStatus} applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{application.full_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Mail className="h-3 w-3" />
                            {application.email}
                          </div>
                          {application.company_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Building className="h-3 w-3" />
                              {application.company_name}
                            </div>
                          )}
                          {application.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Phone className="h-3 w-3" />
                              {application.phone}
                            </div>
                          )}
                          <div className="flex gap-2 mt-2">
                            {application.website && (
                              <a
                                href={application.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                <Globe className="h-4 w-4" />
                              </a>
                            )}
                            {application.website?.includes('linkedin') && (
                              <Linkedin className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getPartnerTypeLabel(application.partner_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{application.clients_per_year || 'Not specified'}</p>
                          {application.crms_used && application.crms_used.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {application.crms_used.map((crm) => (
                                <Badge key={crm} variant="secondary" className="text-xs">
                                  {crm}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-500">
                            Used LoadVoice: {application.has_used_loadvoice ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {new Date(application.submitted_at).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(application.submitted_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(application.status)}
                        {application.reviewed_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(application.reviewed_at).toLocaleDateString()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Application Details</DialogTitle>
                                <DialogDescription>
                                  Review the complete application from {application.full_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                {/* Contact Information */}
                                <div className="border-b pb-4">
                                  <h4 className="font-semibold mb-3">Contact Information</h4>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-gray-500">Full Name:</span>
                                      <p className="font-medium">{application.full_name}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Email:</span>
                                      <p className="font-medium">{application.email}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Phone:</span>
                                      <p className="font-medium">{application.phone || 'Not provided'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Company:</span>
                                      <p className="font-medium">{application.company_name || 'Not provided'}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-gray-500">Website:</span>
                                      {application.website ? (
                                        <a
                                          href={application.website}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          {application.website}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : (
                                        <p className="font-medium">Not provided</p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Partner Details */}
                                <div className="border-b pb-4">
                                  <h4 className="font-semibold mb-3">Partner Details</h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <span className="text-gray-500">Partner Type:</span>
                                      <p className="font-medium">{getPartnerTypeLabel(application.partner_type)}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Clients Per Year:</span>
                                      <p className="font-medium">{application.clients_per_year || 'Not specified'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">CRMs Used:</span>
                                      {application.crms_used && application.crms_used.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {application.crms_used.map((crm) => (
                                            <Badge key={crm} variant="secondary">
                                              {crm}
                                            </Badge>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="font-medium">Not specified</p>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Has Used LoadVoice:</span>
                                      <p className="font-medium">{application.has_used_loadvoice ? 'Yes' : 'No'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Application Responses */}
                                <div className="border-b pb-4">
                                  <h4 className="font-semibold mb-3">Application Responses</h4>
                                  <div className="space-y-3">
                                    <div>
                                      <span className="text-sm text-gray-500">Why do you want to partner with us?</span>
                                      <p className="text-sm mt-1 text-gray-700 whitespace-pre-wrap">
                                        {application.why_partner}
                                      </p>
                                    </div>
                                    {application.how_heard && (
                                      <div>
                                        <span className="text-sm text-gray-500">How did you hear about us?</span>
                                        <p className="text-sm mt-1 text-gray-700">{application.how_heard}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Metadata */}
                                <div>
                                  <h4 className="font-semibold mb-3">Submission Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">Submitted:</span>
                                      <p className="font-medium">
                                        {new Date(application.submitted_at).toLocaleString()}
                                      </p>
                                    </div>
                                    {application.reviewed_at && (
                                      <div>
                                        <span className="text-gray-500">Reviewed:</span>
                                        <p className="font-medium">
                                          {new Date(application.reviewed_at).toLocaleString()} by {application.reviewed_by}
                                        </p>
                                      </div>
                                    )}
                                    {application.review_notes && (
                                      <div>
                                        <span className="text-gray-500">Review Notes:</span>
                                        <p className="font-medium mt-1">{application.review_notes}</p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-gray-500">IP Address:</span>
                                      <p className="font-medium">{application.ip_address || 'Not available'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {application.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleReviewApplication(application, 'approve')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReviewApplication(application, 'reject')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
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
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                No {filterStatus} applications
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : reviewAction === 'reject' ? 'Reject' : 'Request More Info'} Application
            </DialogTitle>
            <DialogDescription>
              {selectedApplication?.full_name} - {selectedApplication?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Review Notes</label>
              <Textarea
                placeholder={
                  reviewAction === 'approve'
                    ? 'Optional: Add any notes about this approval...'
                    : reviewAction === 'reject'
                    ? 'Required: Explain why this application is being rejected...'
                    : 'Required: Specify what additional information is needed...'
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
              />
            </div>
            {reviewAction === 'approve' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Approving will create a partner account and send welcome email with login credentials.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={processReview}
              disabled={isProcessing || (reviewAction !== 'approve' && !reviewNotes)}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {reviewAction === 'approve' && <CheckCircle className="mr-2 h-4 w-4" />}
                  {reviewAction === 'reject' && <XCircle className="mr-2 h-4 w-4" />}
                  {reviewAction === 'more_info' && <MessageSquare className="mr-2 h-4 w-4" />}
                  {reviewAction === 'approve' ? 'Approve' : reviewAction === 'reject' ? 'Reject' : 'Request Info'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}