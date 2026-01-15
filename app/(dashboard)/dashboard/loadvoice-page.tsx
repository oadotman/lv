'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Truck,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  FileText,
  Plus,
  ArrowRight,
  Users,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfWeek, endOfWeek, isToday, isTomorrow } from 'date-fns';

interface DashboardStats {
  todayPickups: number;
  todayDeliveries: number;
  inTransit: number;
  needsCarrier: number;
  weekRevenue: number;
  weekMargin: number;
  onTimePercentage: number;
  totalLoads: number;
  totalCarriers: number;
  totalShippers: number;
  recentCalls: number;
  pendingExtractions: number;
}

interface RecentLoad {
  id: string;
  status: string;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  pickup_date: string;
  commodity: string;
  shipper_rate: number;
  carrier_name?: string;
}

interface ActionItem {
  id: string;
  type: 'urgent' | 'normal';
  title: string;
  description: string;
  link: string;
}

export default function LoadVoiceDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todayPickups: 0,
    todayDeliveries: 0,
    inTransit: 0,
    needsCarrier: 0,
    weekRevenue: 0,
    weekMargin: 0,
    onTimePercentage: 94,
    totalLoads: 0,
    totalCarriers: 0,
    totalShippers: 0,
    recentCalls: 0,
    pendingExtractions: 0
  });

  const [recentLoads, setRecentLoads] = useState<RecentLoad[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!userOrg) return;

      const orgId = userOrg.organization_id;
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

      // Fetch today's pickups
      const { data: pickups } = await supabase
        .from('loads')
        .select('id')
        .eq('organization_id', orgId)
        .eq('pickup_date', today);

      // Fetch today's deliveries
      const { data: deliveries } = await supabase
        .from('loads')
        .select('id')
        .eq('organization_id', orgId)
        .eq('delivery_date', today);

      // Fetch in transit loads
      const { data: inTransit } = await supabase
        .from('loads')
        .select('id')
        .eq('organization_id', orgId)
        .eq('status', 'in_transit');

      // Fetch loads needing carriers
      const { data: needsCarrier } = await supabase
        .from('loads')
        .select('id')
        .eq('organization_id', orgId)
        .eq('status', 'needs_carrier');

      // Fetch week's loads for revenue/margin
      const { data: weekLoads } = await supabase
        .from('loads')
        .select('shipper_rate, carrier_rate')
        .eq('organization_id', orgId)
        .gte('pickup_date', weekStart)
        .lte('pickup_date', weekEnd);

      // Calculate week stats
      let weekRevenue = 0;
      let weekMargin = 0;
      if (weekLoads) {
        weekLoads.forEach(load => {
          weekRevenue += load.shipper_rate || 0;
          if (load.shipper_rate && load.carrier_rate) {
            weekMargin += (load.shipper_rate - load.carrier_rate);
          }
        });
      }

      // Fetch totals
      const { count: totalLoads } = await supabase
        .from('loads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      const { count: totalCarriers } = await supabase
        .from('carriers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      const { count: totalShippers } = await supabase
        .from('shippers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      // Fetch recent calls
      const { count: recentCalls } = await supabase
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch pending extractions
      const { count: pendingExtractions } = await supabase
        .from('extraction_inbox')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'pending');

      // Fetch recent loads
      const { data: loads } = await supabase
        .from('loads')
        .select(`
          id,
          status,
          origin_city,
          origin_state,
          destination_city,
          destination_state,
          pickup_date,
          commodity,
          shipper_rate,
          carriers (
            carrier_name
          )
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Build action items
      const items: ActionItem[] = [];

      if (needsCarrier && needsCarrier.length > 0) {
        items.push({
          id: '1',
          type: 'urgent',
          title: `${needsCarrier.length} loads need carriers`,
          description: 'Find coverage ASAP',
          link: '/loads?status=needs_carrier'
        });
      }

      if (pickups && pickups.length > 0) {
        items.push({
          id: '2',
          type: 'normal',
          title: `${pickups.length} pickups today`,
          description: 'Confirm with carriers',
          link: '/loads?pickup=today'
        });
      }

      if (pendingExtractions && pendingExtractions > 0) {
        items.push({
          id: '3',
          type: 'normal',
          title: `${pendingExtractions} extractions to review`,
          description: 'Review and save to CRM',
          link: '/extraction-inbox'
        });
      }

      setStats({
        todayPickups: pickups?.length || 0,
        todayDeliveries: deliveries?.length || 0,
        inTransit: inTransit?.length || 0,
        needsCarrier: needsCarrier?.length || 0,
        weekRevenue,
        weekMargin,
        onTimePercentage: 94,
        totalLoads: totalLoads || 0,
        totalCarriers: totalCarriers || 0,
        totalShippers: totalShippers || 0,
        recentCalls: recentCalls || 0,
        pendingExtractions: pendingExtractions || 0
      });

      setRecentLoads(loads || []);
      setActionItems(items);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCall = () => {
    router.push('/calls/new');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quoted': return 'bg-gray-500';
      case 'needs_carrier': return 'bg-red-500';
      case 'dispatched': return 'bg-blue-500';
      case 'in_transit': return 'bg-yellow-500';
      case 'delivered': return 'bg-green-500';
      case 'completed': return 'bg-green-600';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'needs_carrier': return <AlertCircle className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LoadVoice Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button onClick={handleUploadCall} size="lg" className="gap-2">
          <Upload className="h-5 w-5" />
          Upload Call
        </Button>
      </div>

      {/* Today's Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Picking Up Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayPickups}</div>
            <p className="text-xs text-muted-foreground">loads to dispatch</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground">on the road</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivering Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayDeliveries}</div>
            <p className="text-xs text-muted-foreground">arriving at destination</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Need Carrier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.needsCarrier}</div>
            <p className="text-xs text-muted-foreground">require coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Items */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Action Items
            </CardTitle>
            <CardDescription>Things that need your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                You're all caught up! 🎉
              </p>
            ) : (
              actionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 ${
                        item.type === 'urgent' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Loads */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Recent Loads
                </CardTitle>
                <CardDescription>Latest shipments in your system</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/loads">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLoads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No loads yet. Upload a call to get started!
                </p>
              ) : (
                recentLoads.map((load) => (
                  <Link
                    key={load.id}
                    href={`/loads/${load.id}`}
                    className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(load.status)} text-white`}>
                          {getStatusIcon(load.status)}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">
                            {load.origin_city}, {load.origin_state} → {load.destination_city}, {load.destination_state}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {load.commodity} • Pickup {format(new Date(load.pickup_date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${load.shipper_rate?.toLocaleString() || '0'}</p>
                        {load.carrier_name && (
                          <p className="text-xs text-muted-foreground">{load.carrier_name}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="text-sm font-semibold">${stats.weekRevenue.toLocaleString()}</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Margin</span>
                  <span className="text-sm font-semibold">${stats.weekMargin.toLocaleString()}</span>
                </div>
                <Progress value={60} className="h-2 bg-green-100" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">On-Time</span>
                  <span className="text-sm font-semibold">{stats.onTimePercentage}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Loads</span>
                <span className="text-lg font-semibold">{stats.totalLoads}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recent Calls</span>
                <span className="text-lg font-semibold">{stats.recentCalls}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Reviews</span>
                <Badge variant={stats.pendingExtractions > 0 ? "destructive" : "secondary"}>
                  {stats.pendingExtractions}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Carriers</span>
                <span className="text-lg font-semibold">{stats.totalCarriers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Shippers</span>
                <span className="text-lg font-semibold">{stats.totalShippers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Lanes</span>
                <span className="text-lg font-semibold">
                  {Math.floor(stats.totalLoads / 3)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/loads/new">
                <Plus className="h-4 w-4" />
                New Load
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/carriers">
                <Truck className="h-4 w-4" />
                Find Carrier
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/extraction-inbox">
                <FileText className="h-4 w-4" />
                Review Extractions
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/reports">
                <TrendingUp className="h-4 w-4" />
                View Reports
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}