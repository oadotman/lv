'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  FileText,
  Download,
  Phone,
  Mail,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  Hash,
  MessageSquare,
  Paperclip,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Upload,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { LoadStatusBadge, LoadStatusProgress } from '@/components/loads';
import { RateConfirmationButton } from '@/components/loads';
import {
  transitionStatus,
  getAvailableTransitions,
  canReverseStatus,
  getPreviousStatus,
  getStatusProgress,
} from '@/lib/loads/statusWorkflow';
import type { Load, LoadStatus, Carrier, Shipper, EquipmentType } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

// Loading skeleton for the page
function LoadDetailSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <Skeleton className="h-32 w-full" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default function LoadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [load, setLoad] = useState<any>(null);
  const [carrier, setCarrier] = useState<any>(null);
  const [shipper, setShipper] = useState<any>(null);
  const [associatedCall, setAssociatedCall] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [statusTransitions, setStatusTransitions] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editedLoad, setEditedLoad] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch load data
  const fetchLoadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/loads/${params.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Load not found');
        } else if (response.status === 401) {
          setError('You are not authorized to view this load');
        } else {
          setError('Failed to load data');
        }
        return;
      }

      const data = await response.json();

      // Set load data
      setLoad(data.load);
      setEditedLoad(data.load);

      // Set related data
      if (data.load.carriers) {
        setCarrier(data.load.carriers);
      }
      if (data.load.shippers) {
        setShipper(data.load.shippers);
      }
      if (data.associatedCall) {
        setAssociatedCall(data.associatedCall);
      }
      if (data.load.load_activities) {
        setActivities(data.load.load_activities);
      }
      if (data.load.rate_confirmations) {
        setDocuments(data.load.rate_confirmations);
      }

      setStatusTransitions(data.statusTransitions || []);

    } catch (err) {
      console.error('Error fetching load:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadData();
  }, [params.id]);

  // Handle status change
  const handleStatusChange = async (newStatus: LoadStatus) => {
    if (!load) return;

    const result = transitionStatus(load.status, newStatus, load);

    if (result.success) {
      setIsSaving(true);
      try {
        const response = await fetch(`/api/loads/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
          const data = await response.json();
          setLoad(data.load);
          toast({
            title: 'Status Updated',
            description: `Load status changed to ${newStatus.replace('_', ' ')}`,
          });
        } else {
          throw new Error('Failed to update status');
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to update status. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    } else {
      toast({
        title: 'Invalid Transition',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  // Handle reverse status
  const handleReverseStatus = async () => {
    if (!load) return;

    const previousStatus = getPreviousStatus(load.status);
    if (previousStatus) {
      await handleStatusChange(previousStatus);
    }
  };

  // Handle edit mode
  const handleEdit = () => {
    setEditMode(true);
    setEditedLoad(load);
  };

  // Handle save
  const handleSave = async () => {
    if (!editedLoad) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/loads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedLoad)
      });

      if (response.ok) {
        const data = await response.json();
        setLoad(data.load);
        setEditMode(false);
        toast({
          title: 'Load Updated',
          description: 'Load details have been saved',
        });
      } else {
        throw new Error('Failed to save changes');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    setEditMode(false);
    setEditedLoad(load);
  };

  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    if (!editedLoad) return;
    setEditedLoad(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Handle copy load
  const handleCopyLoad = () => {
    if (!load) return;

    const loadData = load as any; // Allow flexible property access for different load formats
    const loadText = `${loadData.origin_city || loadData.pickup_city || 'Unknown'}, ${loadData.origin_state || loadData.pickup_state || ''} → ${loadData.destination_city || loadData.delivery_city || 'Unknown'}, ${loadData.destination_state || loadData.delivery_state || ''}
Pickup: ${loadData.pickup_date || 'TBD'}
Delivery: ${loadData.delivery_date || 'TBD'}
Rate: $${loadData.rate_to_shipper || loadData.rate_amount || 'TBD'}
Equipment: ${loadData.equipment_type || 'TBD'}
Reference: ${loadData.reference_number || loadData.load_number || loadData.id}`;

    navigator.clipboard.writeText(loadText);
    toast({
      title: 'Copied to Clipboard',
      description: 'Load details copied successfully',
    });
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!notes.trim() || !load) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/loads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes,
          metadata: {
            notes_history: [
              ...((load as any).metadata?.notes_history || []),
              { text: notes, timestamp: new Date().toISOString() }
            ]
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLoad(data.load);
        setNotes('');
        toast({
          title: 'Note Added',
          description: 'Note has been saved to this load',
        });
      } else {
        throw new Error('Failed to add note');
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete load
  const handleDeleteLoad = async () => {
    if (!load) return;

    try {
      const response = await fetch(`/api/loads/${params.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Load Deleted',
          description: 'Load has been deleted successfully',
        });
        router.push('/loads');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete load');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete load. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadDetailSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Link href="/loads">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Loads
            </Button>
          </Link>
          <Button onClick={fetchLoadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state if no load
  if (!load) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No load data available
          </AlertDescription>
        </Alert>
        <Link href="/loads">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Loads
          </Button>
        </Link>
      </div>
    );
  }

  const availableTransitions = getAvailableTransitions(load.status);
  const canReverse = canReverseStatus(load.status);
  const progress = getStatusProgress(load.status);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/loads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Load #{load.reference_number || load.load_number || load.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              {load.origin_city || load.pickup_city || 'Unknown'}, {load.origin_state || load.pickup_state || ''} → {load.destination_city || load.delivery_city || 'Unknown'}, {load.destination_state || load.delivery_state || ''}
            </p>
          </div>
          <LoadStatusBadge status={load.status} size="lg" />
        </div>

        <div className="flex gap-2">
          {!editMode ? (
            <>
              <Button variant="outline" onClick={handleCopyLoad}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              {carrier && shipper && (
                <RateConfirmationButton
                  load={load}
                  carrier={carrier}
                  shipper={shipper}
                />
              )}
              <Button onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the load
                      from your database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteLoad}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Progress */}
      <Card>
        <CardContent className="pt-6">
          <LoadStatusProgress currentStatus={load.status} />

          {/* Status Actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2 flex-wrap">
              {availableTransitions.map(status => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(status)}
                  disabled={isSaving}
                >
                  Change to {status.replace('_', ' ')}
                </Button>
              ))}
              {canReverse && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReverseStatus}
                  disabled={isSaving}
                >
                  Undo Status
                </Button>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Progress: {progress}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Pickup Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editMode && editedLoad ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input
                          value={editedLoad.origin_city || editedLoad.pickup_city || ''}
                          onChange={(e) => handleFieldChange('pickup_city', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">State</Label>
                        <Input
                          value={editedLoad.origin_state || editedLoad.pickup_state || ''}
                          onChange={(e) => handleFieldChange('pickup_state', e.target.value)}
                          className="h-8"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Address</Label>
                      <Input
                        value={editedLoad.pickup_address || editedLoad.pickup_location || ''}
                        onChange={(e) => handleFieldChange('pickup_location', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={editedLoad.pickup_date || ''}
                          onChange={(e) => handleFieldChange('pickup_date', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Time</Label>
                        <Input
                          value={editedLoad.pickup_time_window || editedLoad.pickup_time || ''}
                          onChange={(e) => handleFieldChange('pickup_time', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">
                        {load.origin_city || load.pickup_city || 'Not specified'}, {load.origin_state || load.pickup_state || ''} {load.origin_zip || load.pickup_zip || ''}
                      </p>
                      {(load.pickup_address || load.pickup_location) && (
                        <p className="text-xs text-muted-foreground mt-1">{load.pickup_address || load.pickup_location}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pickup Date</p>
                      <p className="text-sm font-medium">{load.pickup_date || 'Not scheduled'}</p>
                      {(load.pickup_time_window || load.pickup_time) && (
                        <p className="text-xs text-muted-foreground">{load.pickup_time_window || load.pickup_time}</p>
                      )}
                    </div>
                    {(load.pickup_contact || load.pickup_phone) && (
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        {load.pickup_contact && <p className="text-sm font-medium">{load.pickup_contact}</p>}
                        {load.pickup_phone && <p className="text-xs text-blue-600">{load.pickup_phone}</p>}
                      </div>
                    )}
                    {load.pickup_notes && (
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{load.pickup_notes}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editMode && editedLoad ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">City</Label>
                        <Input
                          value={editedLoad.destination_city || editedLoad.delivery_city || ''}
                          onChange={(e) => handleFieldChange('delivery_city', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">State</Label>
                        <Input
                          value={editedLoad.destination_state || editedLoad.delivery_state || ''}
                          onChange={(e) => handleFieldChange('delivery_state', e.target.value)}
                          className="h-8"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Address</Label>
                      <Input
                        value={editedLoad.delivery_address || editedLoad.delivery_location || ''}
                        onChange={(e) => handleFieldChange('delivery_location', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={editedLoad.delivery_date || ''}
                          onChange={(e) => handleFieldChange('delivery_date', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Time</Label>
                        <Input
                          value={editedLoad.delivery_time_window || editedLoad.delivery_time || ''}
                          onChange={(e) => handleFieldChange('delivery_time', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">
                        {load.destination_city || load.delivery_city || 'Not specified'}, {load.destination_state || load.delivery_state || ''} {load.destination_zip || load.delivery_zip || ''}
                      </p>
                      {(load.delivery_address || load.delivery_location) && (
                        <p className="text-xs text-muted-foreground mt-1">{load.delivery_address || load.delivery_location}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery Date</p>
                      <p className="text-sm font-medium">{load.delivery_date || 'Not scheduled'}</p>
                      {(load.delivery_time_window || load.delivery_time) && (
                        <p className="text-xs text-muted-foreground">{load.delivery_time_window || load.delivery_time}</p>
                      )}
                    </div>
                    {(load.delivery_contact || load.delivery_phone) && (
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        {load.delivery_contact && <p className="text-sm font-medium">{load.delivery_contact}</p>}
                        {load.delivery_phone && <p className="text-xs text-blue-600">{load.delivery_phone}</p>}
                      </div>
                    )}
                    {load.delivery_notes && (
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{load.delivery_notes}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Load Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Load Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editMode && editedLoad ? (
                  <>
                    <div>
                      <Label className="text-xs">Equipment Type</Label>
                      <Select
                        value={editedLoad.equipment_type || ''}
                        onValueChange={(value) => handleFieldChange('equipment_type', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select equipment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dry_van">Dry Van</SelectItem>
                          <SelectItem value="reefer">Reefer</SelectItem>
                          <SelectItem value="flatbed">Flatbed</SelectItem>
                          <SelectItem value="step_deck">Step Deck</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Commodity</Label>
                      <Input
                        value={editedLoad.commodity || ''}
                        onChange={(e) => handleFieldChange('commodity', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Weight (lbs)</Label>
                        <Input
                          type="number"
                          value={editedLoad.weight || editedLoad.weight_pounds || ''}
                          onChange={(e) => handleFieldChange('weight_pounds', parseInt(e.target.value))}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Pallets</Label>
                        <Input
                          type="number"
                          value={editedLoad.pallets || editedLoad.pallet_count || ''}
                          onChange={(e) => handleFieldChange('pallet_count', parseInt(e.target.value))}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Special Requirements</Label>
                      <Textarea
                        value={editedLoad.special_instructions || editedLoad.special_requirements || ''}
                        onChange={(e) => handleFieldChange('special_requirements', e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Equipment</p>
                      <p className="text-sm font-medium">{load.equipment_type || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commodity</p>
                      <p className="text-sm font-medium">{load.commodity || 'Not specified'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Weight</p>
                        <p className="text-sm font-medium">
                          {(load.weight || load.weight_pounds)?.toLocaleString() || 'Not specified'} lbs
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pallets</p>
                        <p className="text-sm font-medium">{load.pallets || load.pallet_count || 'Not specified'}</p>
                      </div>
                    </div>
                    {load.distance && (
                      <div>
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="text-sm font-medium">{load.distance} miles</p>
                      </div>
                    )}
                    {(load.special_instructions || load.special_requirements) && (
                      <div>
                        <p className="text-xs text-muted-foreground">Special Requirements</p>
                        <p className="text-sm">{load.special_instructions || load.special_requirements}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Driver Information (if carrier assigned) */}
            {load.carrier_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Driver Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editMode && editedLoad ? (
                    <>
                      <div>
                        <Label className="text-xs">Driver Name</Label>
                        <Input
                          value={editedLoad.driver_name || ''}
                          onChange={(e) => handleFieldChange('driver_name', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Driver Phone</Label>
                        <Input
                          value={editedLoad.driver_phone || ''}
                          onChange={(e) => handleFieldChange('driver_phone', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {load.driver_name ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Driver</p>
                          <p className="text-sm font-medium">{load.driver_name}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No driver assigned yet</p>
                      )}
                      {load.driver_phone && (
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm text-blue-600">{load.driver_phone}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Rate to Shipper</Label>
                    <p className="text-2xl font-bold">
                      ${(load.rate_to_shipper || load.rate_amount)?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rate to Carrier</Label>
                    <p className="text-2xl font-bold">
                      ${load.rate_to_carrier?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>

                {load.fuel_surcharge && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Fuel Surcharge</Label>
                    <p className="text-lg">${load.fuel_surcharge}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Margin</Label>
                    <p className="text-xl font-bold text-green-600">
                      ${load.margin?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Margin %</Label>
                    <p className="text-xl font-bold text-green-600">
                      {load.margin_percentage?.toFixed(1) || '0.0'}%
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                  <p className="text-sm">{load.payment_terms || 'Net 30'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parties" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipper */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Shipper
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shipper ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">{shipper.company_name || shipper.shipper_name}</p>
                    </div>
                    {shipper.primary_contact && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{shipper.primary_contact || shipper.contact_name}</span>
                      </div>
                    )}
                    {shipper.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-blue-600">{shipper.phone}</span>
                      </div>
                    )}
                    {shipper.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-blue-600">{shipper.email}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">No shipper assigned</p>
                    <Button size="sm">Assign Shipper</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Carrier */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Carrier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {carrier ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">{carrier.carrier_name}</p>
                      {carrier.mc_number && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {carrier.mc_number}
                        </Badge>
                      )}
                    </div>
                    {(carrier.primary_contact || carrier.contact_name) && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{carrier.primary_contact || carrier.contact_name}</span>
                      </div>
                    )}
                    {carrier.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-blue-600">{carrier.phone}</span>
                      </div>
                    )}
                    {carrier.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-blue-600">{carrier.email}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">No carrier assigned</p>
                    <Button size="sm">Assign Carrier</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                All activities and changes for this load
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {activity.activity_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activity history yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Associated Call (if any) */}
          {associatedCall && (
            <Card>
              <CardHeader>
                <CardTitle>Original Call</CardTitle>
                <CardDescription>
                  This load was created from a phone call
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{associatedCall.phone_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(associatedCall.created_at).toLocaleString()} •
                          {Math.floor((associatedCall.duration_seconds || 0) / 60)}:{((associatedCall.duration_seconds || 0) % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                    {associatedCall.recording_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={associatedCall.recording_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Listen
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note..."
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleAddNote} size="sm" disabled={isSaving || !notes.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {load.metadata?.notes_history && load.metadata.notes_history.length > 0 && (
                  <div className="space-y-2">
                    {load.metadata.notes_history.map((note: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{note.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(note.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">
                            Rate Confirmation #{doc.confirmation_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Signed by {doc.signed_by_name} • {new Date(doc.signed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {doc.document_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No documents uploaded yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}