'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Phone,
  Mail,
  User,
  Star,
  Edit,
  Truck,
  MapPin,
  TrendingUp,
  Calendar,
  Clock,
  FileText,
  Upload,
  Download,
  Trash2,
  Ban,
  MessageSquare,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Plus,
  Loader2,
  Shield,
  ChevronRight,
  PhoneCall,
  FileCheck,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { CarrierInteractionDialog } from '@/components/carriers/CarrierInteractionDialog';
import { CarrierRateChart } from '@/components/carriers/CarrierRateChart';
import { CarrierVerificationBadge } from '@/components/carriers/CarrierVerificationBadge';
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

interface CarrierData {
  id: string;
  carrier_name: string;
  mc_number?: string;
  dot_number?: string;
  status: string;
  internal_rating: number;
  primary_contact?: string;
  dispatch_phone?: string;
  dispatch_email?: string;
  driver_name?: string;
  driver_phone?: string;
  equipment_types?: string[];
  preferred_lanes?: any;
  average_rate?: number;
  average_rate_per_mile?: number;
  last_rate?: number;
  total_loads: number;
  completed_loads: number;
  cancelled_loads: number;
  last_contact_date?: string;
  last_used_date?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  carrier_interactions?: any[];
  rate_history?: any[];
  documents?: any[];
  verification_status?: string;
  auto_created?: boolean;
}

export default function CarrierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const carrierId = params.id as string;

  const [carrier, setCarrier] = useState<CarrierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [rating, setRating] = useState(3);

  useEffect(() => {
    fetchCarrierDetails();
  }, [carrierId]);

  const fetchCarrierDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/carriers/${carrierId}`);
      const data = await response.json();

      if (response.ok) {
        setCarrier(data);
        setNotes(data.notes || '');
        setTags(data.tags || []);
        setRating(data.internal_rating || 3);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load carrier details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching carrier:', error);
      toast({
        title: 'Error',
        description: 'Failed to load carrier details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRating = async (newRating: number) => {
    try {
      const response = await fetch(`/api/carriers/${carrierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_rating: newRating }),
      });

      if (response.ok) {
        setRating(newRating);
        toast({
          title: 'Success',
          description: 'Rating updated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rating',
        variant: 'destructive',
      });
    }
  };

  const updateNotes = async () => {
    try {
      const response = await fetch(`/api/carriers/${carrierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (response.ok) {
        setEditingNotes(false);
        toast({
          title: 'Success',
          description: 'Notes updated successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notes',
        variant: 'destructive',
      });
    }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;

    const updatedTags = [...tags, newTag.trim()];
    try {
      const response = await fetch(`/api/carriers/${carrierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (response.ok) {
        setTags(updatedTags);
        setNewTag('');
        toast({
          title: 'Success',
          description: 'Tag added successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add tag',
        variant: 'destructive',
      });
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    try {
      const response = await fetch(`/api/carriers/${carrierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (response.ok) {
        setTags(updatedTags);
        toast({
          title: 'Success',
          description: 'Tag removed successfully',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove tag',
        variant: 'destructive',
      });
    }
  };

  const handleBlacklist = async () => {
    try {
      const response = await fetch(`/api/carriers/${carrierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'blacklisted' }),
      });

      if (response.ok) {
        await fetchCarrierDetails();
        toast({
          title: 'Success',
          description: 'Carrier has been blacklisted',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to blacklist carrier',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/carriers/${carrierId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Carrier deleted successfully',
        });
        router.push('/carriers');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete carrier',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Carrier not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/carriers')}
          >
            Back to Carriers
          </Button>
        </div>
      </div>
    );
  }

  const onTimePercentage = carrier.total_loads > 0
    ? Math.round((carrier.completed_loads / carrier.total_loads) * 100)
    : 100;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">{carrier.carrier_name}</h1>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateRating(i + 1)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        i < rating
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      } hover:text-yellow-500 hover:fill-yellow-500 transition-colors cursor-pointer`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-lg font-semibold">{rating}.0</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/carriers/${carrierId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.href = `tel:${carrier.dispatch_phone}`}
                disabled={!carrier.dispatch_phone}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-2">
              {carrier.mc_number && (
                <span className="text-sm text-muted-foreground">
                  MC# {carrier.mc_number}
                </span>
              )}
              {carrier.dot_number && (
                <span className="text-sm text-muted-foreground">
                  DOT# {carrier.dot_number}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Last contact: {carrier.last_contact_date
                ? `${formatDistanceToNow(new Date(carrier.last_contact_date))} ago`
                : 'Never'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <CarrierVerificationBadge
                mcNumber={carrier.mc_number}
                dotNumber={carrier.dot_number}
                carrierId={carrier.id}
                size="md"
                showDetails
              />
              {carrier.status === 'blacklisted' && (
                <Badge variant="destructive">BLACKLISTED</Badge>
              )}
              {carrier.auto_created && (
                <Badge variant="secondary">Auto-Created</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Dispatcher</Label>
                  <p className="font-medium">{carrier.primary_contact || 'Not specified'}</p>
                  {carrier.dispatch_phone && (
                    <button
                      onClick={() => window.location.href = `tel:${carrier.dispatch_phone}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
                    >
                      <Phone className="h-3 w-3" />
                      {carrier.dispatch_phone}
                    </button>
                  )}
                  {carrier.dispatch_email && (
                    <button
                      onClick={() => window.location.href = `mailto:${carrier.dispatch_email}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
                    >
                      <Mail className="h-3 w-3" />
                      {carrier.dispatch_email}
                    </button>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Driver on File</Label>
                  <p className="font-medium">{carrier.driver_name || 'Not specified'}</p>
                  {carrier.driver_phone && (
                    <button
                      onClick={() => window.location.href = `tel:${carrier.driver_phone}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
                    >
                      <Phone className="h-3 w-3" />
                      {carrier.driver_phone}
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipment & Lanes Card */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment & Lanes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Equipment Types</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {carrier.equipment_types?.length > 0 ? (
                    carrier.equipment_types.map(type => (
                      <Badge key={type} variant="secondary">
                        <Truck className="h-3 w-3 mr-1" />
                        {type.replace('_', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No equipment specified</span>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-sm text-muted-foreground">Preferred Lanes</Label>
                <div className="space-y-2 mt-2">
                  {carrier.preferred_lanes && Object.keys(carrier.preferred_lanes).length > 0 ? (
                    Object.entries(carrier.preferred_lanes).slice(0, 5).map(([lane, data]: [string, any]) => (
                      <div key={lane} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{lane}</span>
                        </div>
                        {data.count && (
                          <span className="text-sm text-muted-foreground">
                            ran {data.count} times
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No preferred lanes</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rate History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Rate History</CardTitle>
              <CardDescription>
                Average Rate: ${carrier.average_rate_per_mile?.toFixed(2) || 'N/A'}/mile
                {carrier.last_rate && ` • Last Rate: $${carrier.last_rate.toLocaleString()}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CarrierRateChart carrierId={carrierId} />

              {/* Rate History Table */}
              <div className="mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Lane</th>
                        <th className="text-right py-2">Rate</th>
                        <th className="text-right py-2">Rate/Mile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrier.carrier_interactions
                        ?.filter(i => i.rate_discussed)
                        .slice(0, 5)
                        .map((interaction, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="py-2">
                              {format(new Date(interaction.interaction_date), 'MMM d')}
                            </td>
                            <td className="py-2">{interaction.lane_discussed || 'N/A'}</td>
                            <td className="text-right py-2">
                              ${interaction.rate_discussed?.toLocaleString()}
                            </td>
                            <td className="text-right py-2">
                              ${(interaction.rate_discussed / 500).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Card */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{carrier.total_loads}</p>
                  <p className="text-sm text-muted-foreground">Total Loads</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {carrier.completed_loads} ({Math.round((carrier.completed_loads / (carrier.total_loads || 1)) * 100)}%)
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {carrier.cancelled_loads} ({Math.round((carrier.cancelled_loads / (carrier.total_loads || 1)) * 100)}%)
                  </p>
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{onTimePercentage}%</p>
                  <p className="text-sm text-muted-foreground">On-time</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your Rating</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => updateRating(i + 1)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          i < rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        } hover:text-yellow-500 hover:fill-yellow-500 transition-colors cursor-pointer`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    (click to change)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Interaction History</CardTitle>
              <CardDescription>All Calls & Interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {carrier.carrier_interactions?.length > 0 ? (
                  carrier.carrier_interactions.map((interaction) => (
                    <div key={interaction.id} className="border-l-2 border-gray-200 pl-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {interaction.interaction_type === 'call' ? 'Call' : interaction.interaction_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(interaction.interaction_date), 'MMM d, yyyy - h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm">{interaction.notes}</p>
                          {(interaction.rate_discussed || interaction.lane_discussed) && (
                            <div className="flex gap-4 mt-2">
                              {interaction.rate_discussed && (
                                <span className="text-xs text-muted-foreground">
                                  Rate: ${interaction.rate_discussed}
                                </span>
                              )}
                              {interaction.lane_discussed && (
                                <span className="text-xs text-muted-foreground">
                                  Lane: {interaction.lane_discussed}
                                </span>
                              )}
                            </div>
                          )}
                          {interaction.call_id && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/calls/${interaction.call_id}`)}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Listen
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/calls/${interaction.call_id}#extraction`)}
                              >
                                View Extraction
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">No interactions recorded</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setInteractionDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Interaction
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes & Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Internal Notes</Label>
                {editingNotes ? (
                  <div className="space-y-2 mt-2">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Add internal notes about this carrier..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={updateNotes}>Save</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNotes(false);
                          setNotes(carrier.notes || '');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="mt-2 p-3 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setEditingNotes(true)}
                  >
                    <p className="text-sm">{notes || 'Click to add notes...'}</p>
                  </div>
                )}
              </div>
              <Separator />
              <div>
                <Label className="text-sm text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="group">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      className="h-7 w-24 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={addTag}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Documents on File</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {carrier.documents?.length > 0 ? (
                  carrier.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{doc.name}</span>
                        <span className="text-xs text-muted-foreground">
                          (uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')})
                        </span>
                        {doc.expires_at && (
                          <span className="text-xs text-orange-600">
                            expires {format(new Date(doc.expires_at), 'MMM yyyy')}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No documents on file</p>
                )}
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                onClick={() => window.location.href = `tel:${carrier.dispatch_phone}`}
                disabled={!carrier.dispatch_phone}
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Call Dispatcher
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setInteractionDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Interaction
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/rate-confirmation/new?carrierId=${carrierId}`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Rate Con
              </Button>
              <Separator className="my-2" />
              {carrier.status !== 'blacklisted' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <Ban className="h-4 w-4 mr-2" />
                      Blacklist Carrier
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Blacklist Carrier</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to blacklist {carrier.carrier_name}? This action can be reversed later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBlacklist}>
                        Blacklist
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={async () => {
                    await fetch(`/api/carriers/${carrierId}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'active' }),
                    });
                    await fetchCarrierDetails();
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Remove from Blacklist
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Carrier
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Carrier</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {carrier.carrier_name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Carrier Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={carrier.status === 'active' ? 'default' :
                            carrier.status === 'blacklisted' ? 'destructive' : 'secondary'}
                  >
                    {carrier.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(carrier.created_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Used</span>
                  <span>
                    {carrier.last_used_date
                      ? formatDistanceToNow(new Date(carrier.last_used_date), { addSuffix: true })
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Interactions</span>
                  <span>{carrier.carrier_interactions?.length || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interaction Dialog */}
      <CarrierInteractionDialog
        carrierId={carrierId}
        carrierName={carrier.carrier_name}
        open={interactionDialogOpen}
        onOpenChange={setInteractionDialogOpen}
        onSuccess={fetchCarrierDetails}
      />
    </div>
  );
}