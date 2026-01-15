import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { performanceMonitor } from '@/lib/performance/monitoring';

export async function GET() {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get performance metrics
    const metrics = performanceMonitor.getDashboardMetrics();

    // Get historical data from database if available
    const { data: historicalData } = await supabase
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('timestamp', { ascending: false })
      .limit(100);

    return NextResponse.json({
      current: metrics,
      historical: historicalData || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Performance Metrics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { metrics } = body;

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json(
        { error: 'Invalid metrics data' },
        { status: 400 }
      );
    }

    // Store metrics in database
    const { data, error } = await supabase
      .from('performance_metrics')
      .insert(
        metrics.map((m: any) => ({
          ...m,
          user_id: session.user.id,
          organization_id: session.user.user_metadata?.organizationId,
        }))
      );

    if (error) {
      console.error('[Performance Metrics] Storage error:', error);
      return NextResponse.json(
        { error: 'Failed to store metrics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stored: metrics.length,
    });
  } catch (error) {
    console.error('[Performance Metrics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
}