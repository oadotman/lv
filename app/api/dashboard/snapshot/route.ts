/**
 * Dashboard Snapshot API
 * Provides real-time metrics and action items for LoadVoice dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/dashboard/snapshot
 * Returns dashboard metrics and action items
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const orgId = userData.organization_id;
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Parallel queries for efficiency
    const [
      todayPickups,
      todayDeliveries,
      inTransit,
      needsCarrier,
      weekLoads,
      recentCalls,
      overdueChecks,
      pendingPODs,
      carriers,
      shippers,
    ] = await Promise.all([
      // Today's pickups
      supabase
        .from('loads')
        .select('id, load_number, origin_city, origin_state, shipper_name, pickup_time')
        .eq('organization_id', orgId)
        .eq('pickup_date', today)
        .in('status', ['dispatched', 'in_transit']),

      // Today's deliveries
      supabase
        .from('loads')
        .select('id, load_number, destination_city, destination_state, carrier_name, delivery_time')
        .eq('organization_id', orgId)
        .eq('delivery_date', today)
        .eq('status', 'in_transit'),

      // In transit loads
      supabase
        .from('loads')
        .select('id, load_number, carrier_name, origin_city, destination_city, pickup_date')
        .eq('organization_id', orgId)
        .eq('status', 'in_transit'),

      // Needs carrier
      supabase
        .from('loads')
        .select('id, load_number, origin_city, destination_city, pickup_date, customer_rate')
        .eq('organization_id', orgId)
        .eq('status', 'needs_carrier')
        .order('pickup_date', { ascending: true })
        .limit(10),

      // This week's loads for revenue calculation
      supabase
        .from('loads')
        .select('customer_rate, carrier_rate, status, on_time_delivery')
        .eq('organization_id', orgId)
        .gte('pickup_date', weekStartStr)
        .in('status', ['dispatched', 'in_transit', 'delivered']),

      // Recent calls (last 24 hours)
      supabase
        .from('calls')
        .select('id, title, created_at, status')
        .eq('organization_id', orgId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5),

      // Overdue check calls (in transit > 24 hours without update)
      supabase
        .from('loads')
        .select('id, load_number, carrier_name, last_check_call')
        .eq('organization_id', orgId)
        .eq('status', 'in_transit')
        .or(`last_check_call.is.null,last_check_call.lt.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`),

      // Pending PODs (delivered but no POD)
      supabase
        .from('loads')
        .select('id, load_number, carrier_name, delivery_date')
        .eq('organization_id', orgId)
        .eq('status', 'delivered')
        .is('pod_received_at', null)
        .limit(10),

      // Active carriers count
      supabase
        .from('carriers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active'),

      // Active shippers count
      supabase
        .from('shippers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active'),
    ]);

    // Calculate week metrics
    let weekRevenue = 0;
    let weekCost = 0;
    let weekDelivered = 0;
    let weekOnTime = 0;

    if (weekLoads.data) {
      weekLoads.data.forEach(load => {
        if (load.customer_rate) weekRevenue += load.customer_rate;
        if (load.carrier_rate) weekCost += load.carrier_rate;
        if (load.status === 'delivered') {
          weekDelivered++;
          if (load.on_time_delivery) weekOnTime++;
        }
      });
    }

    const weekMargin = weekRevenue > 0 ? ((weekRevenue - weekCost) / weekRevenue * 100) : 0;
    const onTimePercentage = weekDelivered > 0 ? (weekOnTime / weekDelivered * 100) : 100;

    // Build action items
    const actionItems = [];

    if (needsCarrier.data && needsCarrier.data.length > 0) {
      const urgent = needsCarrier.data.filter(load => {
        const pickupDate = new Date(load.pickup_date);
        const daysUntil = Math.ceil((pickupDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 2;
      });

      if (urgent.length > 0) {
        actionItems.push({
          type: 'urgent',
          title: `${urgent.length} loads need carriers ASAP`,
          description: `Pickup within 48 hours`,
          action: 'view_needs_carrier',
          priority: 1,
        });
      }
    }

    if (overdueChecks.data && overdueChecks.data.length > 0) {
      actionItems.push({
        type: 'warning',
        title: `${overdueChecks.data.length} check calls overdue`,
        description: 'In-transit loads need status update',
        action: 'view_check_calls',
        priority: 2,
      });
    }

    if (pendingPODs.data && pendingPODs.data.length > 0) {
      actionItems.push({
        type: 'info',
        title: `${pendingPODs.data.length} PODs pending`,
        description: 'Delivered loads awaiting documentation',
        action: 'view_pending_pods',
        priority: 3,
      });
    }

    // Build quick stats
    const quickStats = {
      todayPickups: todayPickups.data?.length || 0,
      todayDeliveries: todayDeliveries.data?.length || 0,
      inTransit: inTransit.data?.length || 0,
      needsCarrier: needsCarrier.data?.length || 0,
    };

    // Build week metrics
    const weekMetrics = {
      revenue: weekRevenue,
      margin: weekMargin.toFixed(1),
      onTime: onTimePercentage.toFixed(0),
      loads: weekLoads.data?.length || 0,
    };

    // Build recent activity
    const recentActivity = {
      calls: recentCalls.data?.map(call => ({
        id: call.id,
        title: call.title,
        time: call.created_at,
        status: call.status,
      })) || [],
      uploads: recentCalls.data?.filter(c => c.status === 'uploaded').length || 0,
      extracted: recentCalls.data?.filter(c => c.status === 'extracted').length || 0,
    };

    // Build entity counts
    const entities = {
      carriers: carriers.count || 0,
      shippers: shippers.count || 0,
      loadsTotal: quickStats.todayPickups + quickStats.todayDeliveries + quickStats.inTransit + quickStats.needsCarrier,
    };

    // Get top lanes (most frequent origin-destination pairs)
    const { data: topLanes } = await supabase
      .from('loads')
      .select('origin_city, origin_state, destination_city, destination_state')
      .eq('organization_id', orgId)
      .limit(100);

    const laneMap = new Map();
    if (topLanes) {
      topLanes.forEach(load => {
        const lane = `${load.origin_city}, ${load.origin_state} → ${load.destination_city}, ${load.destination_state}`;
        laneMap.set(lane, (laneMap.get(lane) || 0) + 1);
      });
    }

    const topLanesArray = Array.from(laneMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lane, count]) => ({ lane, count }));

    // Build response
    const snapshot = {
      timestamp: new Date().toISOString(),
      quickStats,
      actionItems: actionItems.sort((a, b) => a.priority - b.priority),
      weekMetrics,
      recentActivity,
      entities,
      topLanes: topLanesArray,
      todayDetails: {
        pickups: todayPickups.data || [],
        deliveries: todayDeliveries.data || [],
      },
      criticalLoads: {
        needsCarrier: needsCarrier.data?.slice(0, 5) || [],
        overdueChecks: overdueChecks.data?.slice(0, 5) || [],
      },
    };

    return NextResponse.json(snapshot);

  } catch (error) {
    console.error('Dashboard snapshot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}