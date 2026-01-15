'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  Plus,
  User,
  MessageSquare,
  DollarSign,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { CarrierInteractionDialog } from './CarrierInteractionDialog';

interface CarrierProfileNewProps {
  carrierId: string;
  onClose?: () => void;
}

export function CarrierProfileNew({ carrierId, onClose }: CarrierProfileNewProps) {
  const [carrier, setCarrier] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);

  useEffect(() => {
    fetchCarrier();
  }, [carrierId]);

  const fetchCarrier = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/carriers/${carrierId}`);
      const data = await response.json();

      if (response.ok) {
        setCarrier(data);
        setInteractions(data.carrier_interactions || []);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="mt-2 text-muted-foreground">Carrier not found</p>
      </div>
    );
  }

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'rate_update':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{carrier.carrier_name}</h2>
            <div className="flex items-center gap-4 mt-2">
              {carrier.mc_number && (
                <Badge variant="outline">MC# {carrier.mc_number}</Badge>
              )}
              {carrier.dot_number && (
                <Badge variant="outline">DOT# {carrier.dot_number}</Badge>
              )}
              {carrier.status && (
                <Badge
                  variant={carrier.status === 'active' ? 'default' :
                          carrier.status === 'blacklisted' ? 'destructive' : 'secondary'}
                >
                  {carrier.status}
                </Badge>
              )}
              {carrier.auto_created && (
                <Badge variant="secondary">Auto-Created</Badge>
              )}
            </div>
          </div>
          <Button
            onClick={() => setInteractionDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Interaction
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="interactions">
              Interactions
              {interactions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {interactions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Rating and Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Rating</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < (carrier.internal_rating || 0)
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ({carrier.internal_rating || 0})
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Loads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{carrier.total_loads || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {carrier.completed_loads || 0} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Last Contact</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">
                    {carrier.last_contact_date ?
                      formatDistanceToNow(new Date(carrier.last_contact_date), { addSuffix: true }) :
                      'Never'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${carrier.average_rate?.toLocaleString() || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">per mile</p>
                </CardContent>
              </Card>
            </div>

            {/* Equipment Types */}
            <Card>
              <CardHeader>
                <CardTitle>Equipment & Lanes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Equipment Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {carrier.equipment_types?.length > 0 ? (
                      carrier.equipment_types.map((type: string) => (
                        <Badge key={type} variant="secondary">
                          <Truck className="mr-1 h-3 w-3" />
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
                  <h4 className="text-sm font-medium mb-2">Preferred Lanes</h4>
                  {carrier.preferred_lanes && Object.keys(carrier.preferred_lanes).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(carrier.preferred_lanes).slice(0, 5).map(([lane, data]: [string, any]) => (
                        <div key={lane} className="flex items-center justify-between">
                          <span className="text-sm">{lane}</span>
                          {data.rate && (
                            <Badge variant="outline">${data.rate}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No preferred lanes</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {carrier.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{carrier.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="interactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Interaction History</CardTitle>
                <CardDescription>
                  All interactions with this carrier
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interactions.length > 0 ? (
                  <div className="space-y-4">
                    {interactions.map((interaction) => (
                      <div key={interaction.id} className="border-l-2 border-gray-200 pl-4 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getInteractionIcon(interaction.interaction_type)}
                              <Badge variant="outline" className="text-xs">
                                {interaction.interaction_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(interaction.interaction_date), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-1">
                              {interaction.profiles?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-muted-foreground">{interaction.notes}</p>
                            {(interaction.rate_discussed || interaction.lane_discussed) && (
                              <div className="flex gap-4 mt-2">
                                {interaction.rate_discussed && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <DollarSign className="h-3 w-3" />
                                    <span>${interaction.rate_discussed}</span>
                                  </div>
                                )}
                                {interaction.lane_discussed && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <MapPin className="h-3 w-3" />
                                    <span>{interaction.lane_discussed}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No interactions recorded yet
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setInteractionDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Interaction
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Dispatcher Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Dispatcher</h4>
                    {carrier.primary_contact && (
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{carrier.primary_contact}</p>
                        </div>
                      </div>
                    )}
                    {carrier.dispatch_phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <a
                            href={`tel:${carrier.dispatch_phone}`}
                            className="text-sm hover:underline"
                          >
                            {carrier.dispatch_phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {carrier.dispatch_email && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <a
                            href={`mailto:${carrier.dispatch_email}`}
                            className="text-sm hover:underline"
                          >
                            {carrier.dispatch_email}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Driver Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Driver</h4>
                    {carrier.driver_name && (
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{carrier.driver_name}</p>
                        </div>
                      </div>
                    )}
                    {carrier.driver_phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <a
                            href={`tel:${carrier.driver_phone}`}
                            className="text-sm hover:underline"
                          >
                            {carrier.driver_phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Carrier Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Average Rate Per Mile</p>
                    <p className="text-2xl font-bold">
                      ${carrier.average_rate_per_mile?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Last Rate</p>
                    <p className="text-2xl font-bold">
                      ${carrier.last_rate?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {carrier.tags?.length > 0 ? (
                      carrier.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No tags</span>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {carrier.completed_loads || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cancelled</p>
                    <p className="text-2xl font-bold text-red-600">
                      {carrier.cancelled_loads || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {carrier.total_loads > 0 ?
                        Math.round((carrier.completed_loads / carrier.total_loads) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>
                      {carrier.created_at ?
                        new Date(carrier.created_at).toLocaleDateString() :
                        'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>
                      {carrier.updated_at ?
                        new Date(carrier.updated_at).toLocaleDateString() :
                        'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Used</span>
                    <span>
                      {carrier.last_used_date ?
                        new Date(carrier.last_used_date).toLocaleDateString() :
                        'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Contact</span>
                    <span>
                      {carrier.last_contact_date ?
                        new Date(carrier.last_contact_date).toLocaleDateString() :
                        'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CarrierInteractionDialog
        carrierId={carrierId}
        carrierName={carrier.carrier_name}
        open={interactionDialogOpen}
        onOpenChange={setInteractionDialogOpen}
        onSuccess={fetchCarrier}
      />
    </>
  );
}