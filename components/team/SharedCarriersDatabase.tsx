'use client';

// =====================================================
// SHARED CARRIERS DATABASE - Team Knowledge Base
// =====================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Truck,
  Phone,
  Mail,
  Calendar,
  User,
  FileText,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  DollarSign,
  MapPin,
  Search,
  Filter,
  Plus,
  Edit,
  Loader2,
  Users,
  Shield,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import type { TeamCarrier, CarrierInteraction, InteractionType } from '@/lib/types/team';

interface SharedCarriersDatabaseProps {
  organizationId: string;
  userId: string;
  userName: string;
}

export function SharedCarriersDatabase({ organizationId, userId, userName }: SharedCarriersDatabaseProps) {
  const { toast } = useToast();
  const [carriers, setCarriers] = useState<TeamCarrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<TeamCarrier | null>(null);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);

  // Interaction form state
  const [interactionType, setInteractionType] = useState<InteractionType>('note');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [rateDiscussed, setRateDiscussed] = useState('');
  const [laneDiscussed, setLaneDiscussed] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCarriers();
  }, [organizationId]);

  async function fetchCarriers() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('team_carriers_view')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCarriers(data || []);
    } catch (error) {
      console.error('Error fetching carriers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load carriers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function addInteraction() {
    if (!selectedCarrier || !interactionNotes.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter notes for this interaction',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('carrier_interactions')
        .insert({
          organization_id: organizationId,
          carrier_id: selectedCarrier.id,
          user_id: userId,
          interaction_type: interactionType,
          notes: interactionNotes,
          rate_discussed: rateDiscussed ? parseFloat(rateDiscussed) : null,
          lane_discussed: laneDiscussed || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update the carrier's last contact info
      await supabase
        .from('carriers')
        .update({
          last_contact_date: new Date().toISOString(),
          last_contact_by: userId,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCarrier.id);

      // Refresh carriers to show the new interaction
      await fetchCarriers();

      toast({
        title: 'Success',
        description: 'Interaction recorded successfully',
      });

      // Reset form
      setShowInteractionDialog(false);
      setInteractionNotes('');
      setRateDiscussed('');
      setLaneDiscussed('');
    } catch (error) {
      console.error('Error adding interaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to record interaction',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function filterCarriers(carriers: TeamCarrier[]) {
    if (!searchQuery) return carriers;

    const query = searchQuery.toLowerCase();
    return carriers.filter(carrier =>
      carrier.carrier_name?.toLowerCase().includes(query) ||
      carrier.mc_number?.toLowerCase().includes(query) ||
      carrier.dot_number?.toLowerCase().includes(query) ||
      carrier.contact_name?.toLowerCase().includes(query) ||
      carrier.phone_number?.toLowerCase().includes(query) ||
      carrier.email?.toLowerCase().includes(query)
    );
  }

  const filteredCarriers = filterCarriers(carriers);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shared Carrier Database</CardTitle>
              <CardDescription>
                All carriers documented by your team - shared knowledge base
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              <Users className="mr-1 h-3 w-3" />
              {carriers.length} Carriers
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by carrier name, MC#, DOT#, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Carriers List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCarriers.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No carriers found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery ? 'Try adjusting your search' : 'Start documenting carriers to build your shared database'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredCarriers.map(carrier => (
                <div key={carrier.id} className="p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                      {/* Carrier Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            {carrier.carrier_name}
                            {carrier.preferred && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {carrier.mc_number && (
                              <Badge variant="outline">MC# {carrier.mc_number}</Badge>
                            )}
                            {carrier.dot_number && (
                              <Badge variant="outline">DOT# {carrier.dot_number}</Badge>
                            )}
                            {carrier.insurance_on_file && (
                              <Badge variant="success">
                                <Shield className="mr-1 h-3 w-3" />
                                Insurance on file
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCarrier(carrier);
                            setShowInteractionDialog(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Interaction
                        </Button>
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {carrier.contact_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{carrier.contact_name}</span>
                          </div>
                        )}
                        {carrier.phone_number && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${carrier.phone_number}`} className="hover:underline">
                              {carrier.phone_number}
                            </a>
                          </div>
                        )}
                        {carrier.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${carrier.email}`} className="hover:underline">
                              {carrier.email}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Team Activity Info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Added by {carrier.created_by_name || 'Unknown'}</span>
                        </div>
                        {carrier.last_contact_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Last contact {formatDistanceToNow(new Date(carrier.last_contact_date))} ago
                              by {carrier.last_contact_by_name || 'Unknown'}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{carrier.total_interactions || 0} interactions</span>
                        </div>
                      </div>

                      {/* Recent Interactions */}
                      {carrier.recent_interactions && carrier.recent_interactions.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Recent Team Interactions:</h4>
                          <div className="space-y-2">
                            {carrier.recent_interactions.slice(0, 3).map((interaction, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      {interaction.type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {interaction.user_name} • {formatDistanceToNow(new Date(interaction.date))} ago
                                    </span>
                                  </div>
                                  <p className="text-sm">{interaction.notes}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {carrier.notes && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm">{carrier.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Interaction Dialog */}
      <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Carrier Interaction</DialogTitle>
            <DialogDescription>
              Document your interaction with {selectedCarrier?.carrier_name}. This will be visible to your entire team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Interaction Type</Label>
              <Tabs value={interactionType} onValueChange={(v) => setInteractionType(v as InteractionType)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="call">
                    <Phone className="mr-2 h-4 w-4" />
                    Call
                  </TabsTrigger>
                  <TabsTrigger value="email">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="note">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Note
                  </TabsTrigger>
                  <TabsTrigger value="rate_update">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Rate Update
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes *</Label>
              <Textarea
                id="notes"
                placeholder="Document key details from this interaction..."
                value={interactionNotes}
                onChange={(e) => setInteractionNotes(e.target.value)}
                rows={4}
                required
              />
            </div>

            {(interactionType === 'call' || interactionType === 'rate_update') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate Discussed (optional)</Label>
                  <Input
                    id="rate"
                    type="number"
                    placeholder="e.g., 2500.00"
                    value={rateDiscussed}
                    onChange={(e) => setRateDiscussed(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lane">Lane Discussed (optional)</Label>
                  <Input
                    id="lane"
                    placeholder="e.g., Chicago, IL to Nashville, TN"
                    value={laneDiscussed}
                    onChange={(e) => setLaneDiscussed(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                This interaction will be recorded as {userName} and visible to your entire team
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInteractionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addInteraction} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record Interaction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}