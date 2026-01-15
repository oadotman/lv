'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TruckIcon,
  Package,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle,
  Phone,
  FileText,
  ArrowRight,
  Calendar,
  Activity,
  Upload,
  Plus,
  AlertTriangle,
  Zap,
  MapPin,
  Users,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import type { LoadStatus } from '@/lib/types';
import { NaturalLanguageSearch } from '@/components/carriers/NaturalLanguageSearch';

interface DashboardData {
  todaySnapshot: {
    pickingUpToday: number;
    inTransit: number;
    deliveringToday: number;
    needsCarrier: number;
  };
  weekStats: {
    loadsBooked: number;
    revenue: number;
    margin: number;
    onTimePercentage: number;
  };
  actionItems: Array<{
    id: string | number;
    type: string;
    title: string;
    urgency: string;
    time: string;
  }>;
  recentActivity: Array<{
    id: string | number;
    time: string;
    type: string;
    text: string;
    icon: any;
  }>;
  user?: {
    name: string;
    email: string;
  };
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    todaySnapshot: {
      pickingUpToday: 0,
      inTransit: 0,
      deliveringToday: 0,
      needsCarrier: 0,
    },
    weekStats: {
      loadsBooked: 0,
      revenue: 0,
      margin: 0,
      onTimePercentage: 0,
    },
    actionItems: [],
    recentActivity: [],
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch analytics data
      const analyticsRes = await fetch('/api/analytics/simple?days=7');
      if (!analyticsRes.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await analyticsRes.json();

      // Fetch loads for today's snapshot
      const today = new Date().toISOString().split('T')[0];
      const loadsRes = await fetch(`/api/loads?pickup_date=${today}&delivery_date=${today}`);
      if (!loadsRes.ok) throw new Error('Failed to fetch loads');
      const loadsData = await loadsRes.json();

      // Fetch user info
      const userRes = await fetch('/api/auth/user');
      const userData = userRes.ok ? await userRes.json() : null;

      // Process the data
      const processedData: DashboardData = {
        todaySnapshot: {
          pickingUpToday: loadsData.loads?.filter((l: any) =>
            l.pickup_date === today && ['booked', 'dispatched'].includes(l.status)
          ).length || 0,
          inTransit: loadsData.loads?.filter((l: any) =>
            l.status === 'in-transit'
          ).length || 0,
          deliveringToday: loadsData.loads?.filter((l: any) =>
            l.delivery_date === today && ['in-transit', 'dispatched'].includes(l.status)
          ).length || 0,
          needsCarrier: loadsData.loads?.filter((l: any) =>
            l.status === 'quoted' && !l.carrier_id
          ).length || 0,
        },
        weekStats: {
          loadsBooked: analyticsData.metrics?.loads?.total || 0,
          revenue: analyticsData.metrics?.financial?.totalRevenue || 0,
          margin: analyticsData.metrics?.financial?.averageMargin || 0,
          onTimePercentage: analyticsData.metrics?.loads?.completionRate || 0,
        },
        actionItems: processActionItems(loadsData.loads || []),
        recentActivity: processRecentActivity(analyticsData.recentActivity || []),
        user: userData?.user,
      };

      setDashboardData(processedData);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const processActionItems = (loads: any[]): DashboardData['actionItems'] => {
    const items: DashboardData['actionItems'] = [];

    // Check for loads needing carriers
    loads.forEach(load => {
      if (load.status === 'quoted' && !load.carrier_id) {
        items.push({
          id: load.id,
          type: 'needs_carrier',
          title: `Load #${load.load_number} - ${load.pickup_city} → ${load.delivery_city}`,
          urgency: 'high',
          time: getTimeUntil(load.pickup_date),
        });
      }
    });

    // Check for loads needing check calls
    loads.forEach(load => {
      if (load.status === 'in-transit') {
        items.push({
          id: load.id,
          type: 'check_call',
          title: `Check call: Load #${load.load_number}`,
          urgency: 'medium',
          time: '30 min',
        });
      }
    });

    return items.slice(0, 5); // Return top 5 items
  };

  const processRecentActivity = (activities: any[]): DashboardData['recentActivity'] => {
    return activities.map((activity, index) => ({
      id: activity.id || index,
      time: formatTime(activity.timestamp || activity.created_at),
      type: activity.type || activity.activity_type,
      text: activity.description || activity.text,
      icon: getActivityIcon(activity.type || activity.activity_type),
    }));
  };

  const getTimeUntil = (date: string): string => {
    const now = new Date();
    const target = new Date(date);
    const diff = target.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return 'Soon';
  };

  const formatTime = (timestamp: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'extraction':
      case 'load_created':
        return Package;
      case 'rate_confirmation':
      case 'rate_con':
        return FileText;
      case 'status_changed':
      case 'delivered':
        return CheckCircle;
      case 'call':
      case 'call_processed':
        return Phone;
      case 'payment':
      case 'invoice':
        return DollarSign;
      default:
        return Activity;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              onClick={fetchDashboardData}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const userName = dashboardData.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your loads today
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/extraction/new">
            <Button className="gap-2">
              <Phone className="h-4 w-4" />
              New Extraction
            </Button>
          </Link>
          <Link href="/loads/new">
            <Button variant="outline" className="gap-2">
              <Package className="h-4 w-4" />
              New Load
            </Button>
          </Link>
        </div>
      </div>

      {/* Natural Language Search */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Search</CardTitle>
          <CardDescription>Ask anything about your carriers, loads, or calls</CardDescription>
        </CardHeader>
        <CardContent>
          <NaturalLanguageSearch embedded />
        </CardContent>
      </Card>

      {/* Today's Snapshot */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Picking Up Today</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.todaySnapshot.pickingUpToday}</div>
            <p className="text-xs text-muted-foreground">
              Loads scheduled for pickup
            </p>
            <Link href="/loads?filter=picking-up-today">
              <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.todaySnapshot.inTransit}</div>
            <p className="text-xs text-muted-foreground">
              Loads currently moving
            </p>
            <Link href="/loads?filter=in-transit">
              <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                Track loads <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivering Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.todaySnapshot.deliveringToday}</div>
            <p className="text-xs text-muted-foreground">
              Expected deliveries
            </p>
            <Link href="/loads?filter=delivering-today">
              <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                View deliveries <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className={dashboardData.todaySnapshot.needsCarrier > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Carrier</CardTitle>
            <AlertCircle className={`h-4 w-4 ${dashboardData.todaySnapshot.needsCarrier > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboardData.todaySnapshot.needsCarrier > 0 ? 'text-orange-600' : ''}`}>
              {dashboardData.todaySnapshot.needsCarrier}
            </div>
            <p className={`text-xs ${dashboardData.todaySnapshot.needsCarrier > 0 ? 'text-orange-700' : 'text-muted-foreground'}`}>
              Loads awaiting dispatch
            </p>
            <Link href="/loads?filter=needs-carrier">
              <Button variant="link" className={`p-0 h-auto mt-2 text-xs ${dashboardData.todaySnapshot.needsCarrier > 0 ? 'text-orange-700' : ''}`}>
                Find carriers <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Action Items */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>
              Tasks requiring your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {dashboardData.actionItems.length > 0 ? (
                  dashboardData.actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-full', getUrgencyColor(item.urgency))}>
                          {item.type === 'needs_carrier' && <TruckIcon className="h-4 w-4" />}
                          {item.type === 'check_call' && <Phone className="h-4 w-4" />}
                          {item.type === 'rate_con' && <FileText className="h-4 w-4" />}
                          {item.type === 'invoice' && <DollarSign className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Due in {item.time}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={item.urgency === 'high' ? 'destructive' :
                                 item.urgency === 'medium' ? 'secondary' : 'outline'}
                      >
                        {item.urgency}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>All caught up!</p>
                    <p className="text-xs mt-1">No urgent tasks at the moment</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            {dashboardData.actionItems.length > 0 && (
              <div className="mt-4">
                <Link href="/tasks">
                  <Button variant="outline" className="w-full">
                    View All Tasks
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* This Week's Stats */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>This Week's Performance</CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })} - {new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Loads Booked</span>
                  <span className="text-lg font-bold">{dashboardData.weekStats.loadsBooked}</span>
                </div>
                <Progress value={Math.min(100, (dashboardData.weekStats.loadsBooked / 50) * 100)} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="text-lg font-bold">
                    ${dashboardData.weekStats.revenue.toLocaleString()}
                  </span>
                </div>
                <Progress value={Math.min(100, (dashboardData.weekStats.revenue / 60000) * 100)} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Margin</span>
                  <span className="text-lg font-bold">{dashboardData.weekStats.margin}%</span>
                </div>
                <Progress value={Math.min(100, dashboardData.weekStats.margin * 5)} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">On-Time %</span>
                  <span className="text-lg font-bold">{dashboardData.weekStats.onTimePercentage}%</span>
                </div>
                <Progress value={dashboardData.weekStats.onTimePercentage} className="h-2" />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {dashboardData.weekStats.revenue > 50000 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Performing well</span>
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-600">Normal activity</span>
                  </>
                )}
              </div>
              <Link href="/reports">
                <Button variant="outline" size="sm">
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates from your operations
              </CardDescription>
            </div>
            <Link href="/activity">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboardData.recentActivity.length > 0 ? (
              dashboardData.recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center gap-4 pb-3 border-b last:border-0">
                    <div className="text-xs text-muted-foreground w-16">
                      {activity.time}
                    </div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm flex-1">{activity.text}</p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                <p>No recent activity</p>
                <p className="text-xs mt-1">Activities will appear here as they happen</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading skeleton component
function DashboardLoadingSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function - add this to lib/utils if not present
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}