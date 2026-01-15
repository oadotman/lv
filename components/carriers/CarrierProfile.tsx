'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  BarChart,
  RefreshCw,
  FileText,
  AlertCircle,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Carrier, Load } from '@/lib/types';
import { LoadStatusBadge } from '@/components/loads';
import { CarrierVerificationBadge } from '@/components/carriers/CarrierVerificationBadge';
import { toast } from '@/components/ui/use-toast';
import { carrierService } from '@/lib/carriers/carrierService';

interface CarrierProfileProps {
  carrierId: string;
  onClose?: () => void;
}

interface CarrierStats {
  total_loads: number;
  completed_loads: number;
  cancelled_loads: number;
  on_time_percentage: number;
  average_rate: number;
  lifetime_revenue: number;
  performance_score: number;
  common_lanes: Array<{ lane: string; count: number }>;
  preferred_equipment: string[];
}

export function CarrierProfile({ carrierId, onClose }: CarrierProfileProps) {
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [stats, setStats] = useState<CarrierStats | null>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadCarrierData();
  }, [carrierId]);

  const loadCarrierData = async () => {
    setIsLoading(true);
    try {
      // Get carrier with statistics
      const carrierData = await carrierService.getCarrierWithStats(carrierId);
      setCarrier(carrierData);
      setStats({
        ...carrierData.statistics,
        performance_score: carrierData.statistics.performance_score ?? 0
      } as CarrierStats);

      // Load recent loads
      // This would be an actual API call in production
      setLoads([]);
    } catch (error) {
      console.error('Error loading carrier:', error);
      toast({
        title: 'Error',
        description: 'Failed to load carrier data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatistics = async () => {
    setIsRefreshing(true);
    try {
      const statistics = await carrierService.updateCarrierStatistics(carrierId);
      setStats({
        ...statistics,
        performance_score: statistics.performance_score ?? 0
      } as CarrierStats);
      toast({
        title: 'Statistics Updated',
        description: 'Carrier performance metrics have been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh statistics',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Carrier not found</p>
      </div>
    );
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{carrier.carrier_name}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            {carrier.mc_number && (
              <Badge variant="outline" className="font-mono">
                {carrier.mc_number}
              </Badge>
            )}
            {carrier.dot_number && (
              <Badge variant="outline" className="font-mono">
                {carrier.dot_number}
              </Badge>
            )}
            <CarrierVerificationBadge
              mcNumber={carrier.mc_number}
              dotNumber={carrier.dot_number}
              carrierId={carrier.id}
              size="md"
              showDetails
            />
            {carrier.authority_status && (
              <Badge
                variant={carrier.authority_status === 'active' ? 'default' : 'destructive'}
              >
                {carrier.authority_status}
              </Badge>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshStatistics}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
          Refresh Stats
        </Button>
      </div>

      {/* Performance Score */}
      {stats && (
        <Card className={cn('border-2', getPerformanceColor(stats.performance_score))}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Performance Score</CardTitle>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current" />
                <span className="text-2xl font-bold">{stats.performance_score}</span>
                <span className="text-sm">/ 100</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={stats.performance_score} className="h-2 mb-2" />
            <p className="text-sm font-medium">
              {getPerformanceLabel(stats.performance_score)} Carrier
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="loads">Loads</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Loads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_loads || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.completed_loads || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>On-Time Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.on_time_percentage || 0}%</div>
                <Progress
                  value={stats?.on_time_percentage || 0}
                  className="h-1 mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats?.average_rate?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">per load</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Lifetime Revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${stats?.lifetime_revenue?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {carrier.created_at &&
                    `Since ${new Date(carrier.created_at).getFullYear()}`
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Equipment & Lanes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Equipment Types</h4>
                <div className="flex flex-wrap gap-2">
                  {carrier.equipment_types?.map(type => (
                    <Badge key={type} variant="secondary">
                      <Truck className="w-3 h-3 mr-1" />
                      {type}
                    </Badge>
                  )) || <span className="text-sm text-gray-500">No equipment specified</span>}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">Common Lanes</h4>
                <div className="space-y-2">
                  {stats?.common_lanes?.slice(0, 5).map(({ lane, count }) => (
                    <div key={lane} className="flex items-center justify-between">
                      <span className="text-sm font-mono">{lane}</span>
                      <Badge variant="outline">{count} loads</Badge>
                    </div>
                  )) || <span className="text-sm text-gray-500">No lane history</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                Detailed carrier performance analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completion Rate</span>
                    <span className="font-medium">
                      {stats && stats.total_loads > 0
                        ? Math.round((stats.completed_loads / stats.total_loads) * 100)
                        : 100}%
                    </span>
                  </div>
                  <Progress
                    value={
                      stats && stats.total_loads > 0
                        ? (stats.completed_loads / stats.total_loads) * 100
                        : 100
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cancellation Rate</span>
                    <span className="font-medium">
                      {stats && stats.total_loads > 0
                        ? Math.round((stats.cancelled_loads / stats.total_loads) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress
                    value={
                      stats && stats.total_loads > 0
                        ? (stats.cancelled_loads / stats.total_loads) * 100
                        : 0
                    }
                    className="h-2 [&>div]:bg-red-500"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{stats?.completed_loads || 0}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div>
                  <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{carrier.active_loads || 0}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div>
                  <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">{stats?.cancelled_loads || 0}</p>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>
                Automatically tracked from carrier calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First Contact</span>
                  <span>
                    {carrier.created_at
                      ? new Date(carrier.created_at).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span>
                    {carrier.last_used_date
                      ? new Date(carrier.last_used_date).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <Badge variant="outline">{(carrier as any).source || 'Manual Entry'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Load History</CardTitle>
              <CardDescription>
                Recent loads handled by this carrier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loads.length > 0 ? (
                <div className="space-y-3">
                  {loads.map(load => (
                    <div
                      key={load.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {load.origin_city}, {load.origin_state} →{' '}
                          {load.destination_city}, {load.destination_state}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {load.pickup_date} • ${load.rate_to_carrier}
                        </p>
                      </div>
                      <LoadStatusBadge status={load.status} size="sm" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No load history available
                </p>
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
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Primary Phone</p>
                      <p className="text-sm text-muted-foreground">
                        {carrier.phone || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {carrier.email || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {(carrier as any).address ? (
                          <>
                            {(carrier as any).address}<br />
                            {(carrier as any).city}, {(carrier as any).state} {(carrier as any).zip_code}
                          </>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="font-medium mb-1">Primary Contact</p>
                    <p className="text-sm text-muted-foreground">
                      {carrier.primary_contact || 'Not specified'}
                    </p>
                  </div>

                  {(carrier as any).alt_phone && (
                    <div>
                      <p className="font-medium mb-1">Alternate Phone</p>
                      <p className="text-sm text-muted-foreground">{(carrier as any).alt_phone}</p>
                    </div>
                  )}

                  {(carrier as any).factoring_company && (
                    <div>
                      <p className="font-medium mb-1">Factoring Company</p>
                      <p className="text-sm text-muted-foreground">
                        {(carrier as any).factoring_company}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Insurance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Authority Status</p>
                  <Badge
                    variant={carrier.authority_status === 'active' ? 'default' : 'destructive'}
                  >
                    {carrier.authority_status || 'Unknown'}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Safety Rating</p>
                  <Badge
                    variant={
                      carrier.safety_rating === 'satisfactory'
                        ? 'default'
                        : carrier.safety_rating === 'conditional'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {carrier.safety_rating || 'Not Rated'}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Insurance Expiry</p>
                  <p className="text-sm">
                    {carrier.insurance_expiry
                      ? new Date(carrier.insurance_expiry).toLocaleDateString()
                      : 'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Credit Limit</p>
                  <p className="text-sm">
                    {(carrier as any).credit_limit
                      ? `$${(carrier as any).credit_limit.toLocaleString()}`
                      : 'Not set'}
                  </p>
                </div>
              </div>

              {carrier.insurance_expiry &&
                new Date(carrier.insurance_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Insurance expires in less than 30 days
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Terms</span>
                  <span className="text-sm font-medium">
                    {carrier.payment_terms || 'Net 30'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Days to Pay</span>
                  <span className="text-sm font-medium">
                    {(carrier as any).avg_days_to_pay || 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}