/**
 * Simple Reporting & Export API
 * Generate CSV/JSON reports for billing, usage, and operations
 * Keep it simple - freight brokers need data they can use in Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get report parameters
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'usage';
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Default to current month if no dates provided
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const adminSupabase = createAdminClient();

    // Generate report based on type
    let reportData: any;
    let fileName: string;

    switch (reportType) {
      case 'usage':
        reportData = await generateUsageReport(adminSupabase, userOrg.organization_id, start, end);
        fileName = `usage-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}`;
        break;

      case 'loads':
        reportData = await generateLoadsReport(adminSupabase, userOrg.organization_id, start, end);
        fileName = `loads-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}`;
        break;

      case 'carriers':
        reportData = await generateCarriersReport(adminSupabase, userOrg.organization_id, start, end);
        fileName = `carriers-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}`;
        break;

      case 'billing':
        reportData = await generateBillingReport(adminSupabase, userOrg.organization_id, start, end);
        fileName = `billing-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(reportData.data, reportData.columns);

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${fileName}.csv"`
        }
      });
    } else {
      // Return JSON
      return NextResponse.json({
        report: reportType,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        summary: reportData.summary,
        data: reportData.data,
        generated_at: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[Reports] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate Usage Report
 */
async function generateUsageReport(supabase: any, orgId: string, startDate: Date, endDate: Date) {
  // Get all calls in period
  const { data: calls } = await supabase
    .from('calls')
    .select(`
      id,
      phone_number,
      duration_seconds,
      status,
      transcription_status,
      extraction_status,
      created_at
    `)
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  // Calculate summary
  const totalCalls = calls?.length || 0;
  const totalMinutes = calls?.reduce((sum: number, c: any) =>
    sum + Math.ceil((c.duration_seconds || 0) / 60), 0) || 0;
  const successfulExtractions = calls?.filter((c: any) =>
    c.extraction_status === 'completed').length || 0;

  // Get organization limits
  const { data: org } = await supabase
    .from('organizations')
    .select('usage_minutes_limit, overage_minutes_current')
    .eq('id', orgId)
    .single();

  // Format for CSV
  const formattedData = calls?.map((call: any) => ({
    'Date': new Date(call.created_at).toLocaleDateString(),
    'Time': new Date(call.created_at).toLocaleTimeString(),
    'Phone Number': call.phone_number,
    'Duration (min)': Math.ceil((call.duration_seconds || 0) / 60),
    'Status': call.status,
    'Transcribed': call.transcription_status === 'completed' ? 'Yes' : 'No',
    'Data Extracted': call.extraction_status === 'completed' ? 'Yes' : 'No'
  })) || [];

  return {
    summary: {
      totalCalls,
      totalMinutes,
      minutesLimit: org?.usage_minutes_limit || 60,
      overageMinutes: Math.max(0, totalMinutes - (org?.usage_minutes_limit || 60)),
      overageCharge: Math.max(0, totalMinutes - (org?.usage_minutes_limit || 60)) * 0.20,
      extractionRate: totalCalls > 0 ? Math.round((successfulExtractions / totalCalls) * 100) : 0
    },
    data: formattedData,
    columns: ['Date', 'Time', 'Phone Number', 'Duration (min)', 'Status', 'Transcribed', 'Data Extracted']
  };
}

/**
 * Generate Loads Report
 */
async function generateLoadsReport(supabase: any, orgId: string, startDate: Date, endDate: Date) {
  // Get all loads in period
  const { data: loads } = await supabase
    .from('loads')
    .select(`
      load_number,
      status,
      pickup_city,
      pickup_state,
      pickup_date,
      delivery_city,
      delivery_state,
      delivery_date,
      commodity,
      weight_pounds,
      rate_amount,
      carriers!left(carrier_name, mc_number),
      shippers!left(shipper_name),
      created_at
    `)
    .eq('organization_id', orgId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Calculate summary
  const totalLoads = loads?.length || 0;
  const totalRevenue = loads?.reduce((sum: number, l: any) => sum + (l.rate_amount || 0), 0) || 0;
  const deliveredLoads = loads?.filter((l: any) => l.status === 'delivered').length || 0;

  // Format for CSV
  const formattedData = loads?.map((load: any) => ({
    'Load Number': load.load_number,
    'Status': load.status,
    'Pickup': `${load.pickup_city}, ${load.pickup_state}`,
    'Pickup Date': load.pickup_date ? new Date(load.pickup_date).toLocaleDateString() : '',
    'Delivery': `${load.delivery_city}, ${load.delivery_state}`,
    'Delivery Date': load.delivery_date ? new Date(load.delivery_date).toLocaleDateString() : '',
    'Commodity': load.commodity,
    'Weight (lbs)': load.weight_pounds || '',
    'Rate': load.rate_amount ? `$${load.rate_amount.toFixed(2)}` : '',
    'Carrier': load.carriers?.carrier_name || '',
    'MC Number': load.carriers?.mc_number || '',
    'Shipper': load.shippers?.shipper_name || '',
    'Created': new Date(load.created_at).toLocaleDateString()
  })) || [];

  return {
    summary: {
      totalLoads,
      deliveredLoads,
      completionRate: totalLoads > 0 ? Math.round((deliveredLoads / totalLoads) * 100) : 0,
      totalRevenue,
      averageRate: totalLoads > 0 ? Math.round(totalRevenue / totalLoads) : 0
    },
    data: formattedData,
    columns: ['Load Number', 'Status', 'Pickup', 'Pickup Date', 'Delivery', 'Delivery Date',
              'Commodity', 'Weight (lbs)', 'Rate', 'Carrier', 'MC Number', 'Shipper', 'Created']
  };
}

/**
 * Generate Carriers Report
 */
async function generateCarriersReport(supabase: any, orgId: string, startDate: Date, endDate: Date) {
  // Get carriers and their load performance
  const { data: carriers } = await supabase
    .from('carriers')
    .select(`
      carrier_name,
      mc_number,
      dot_number,
      contact_name,
      phone,
      email,
      status,
      rating,
      loads!left(
        id,
        status,
        rate_amount
      )
    `)
    .eq('organization_id', orgId)
    .order('carrier_name', { ascending: true });

  // Calculate metrics for each carrier
  const formattedData = carriers?.map((carrier: any) => {
    const carrierLoads = carrier.loads || [];
    const totalLoads = carrierLoads.length;
    const deliveredLoads = carrierLoads.filter((l: any) => l.status === 'delivered').length;
    const totalRevenue = carrierLoads.reduce((sum: number, l: any) => sum + (l.rate_amount || 0), 0);

    return {
      'Carrier Name': carrier.carrier_name,
      'MC Number': carrier.mc_number,
      'DOT Number': carrier.dot_number || '',
      'Contact': carrier.contact_name || '',
      'Phone': carrier.phone || '',
      'Email': carrier.email || '',
      'Status': carrier.status,
      'Rating': carrier.rating || '',
      'Total Loads': totalLoads,
      'Delivered': deliveredLoads,
      'Success Rate': totalLoads > 0 ? `${Math.round((deliveredLoads / totalLoads) * 100)}%` : '',
      'Total Revenue': totalRevenue > 0 ? `$${totalRevenue.toFixed(2)}` : ''
    };
  }) || [];

  return {
    summary: {
      totalCarriers: carriers?.length || 0,
      activeCarriers: carriers?.filter((c: any) => c.status === 'active').length || 0,
      averageRating: carriers?.reduce((sum: number, c: any) => sum + (c.rating || 0), 0) / (carriers?.length || 1)
    },
    data: formattedData,
    columns: ['Carrier Name', 'MC Number', 'DOT Number', 'Contact', 'Phone', 'Email',
              'Status', 'Rating', 'Total Loads', 'Delivered', 'Success Rate', 'Total Revenue']
  };
}

/**
 * Generate Billing Report
 */
async function generateBillingReport(supabase: any, orgId: string, startDate: Date, endDate: Date) {
  // Get organization billing info
  const { data: org } = await supabase
    .from('organizations')
    .select('name, subscription_plan, usage_minutes_limit, overage_debt_amount')
    .eq('id', orgId)
    .single();

  // Get usage for each month in period
  const { data: monthlyUsage } = await supabase
    .from('monthly_usage')
    .select('*')
    .eq('organization_id', orgId)
    .gte('month', startDate.toISOString().substring(0, 7))
    .lte('month', endDate.toISOString().substring(0, 7))
    .order('month', { ascending: false });

  // Format for CSV
  const formattedData = monthlyUsage?.map((month: any) => ({
    'Month': month.month,
    'Minutes Used': month.minutes_used,
    'Minutes Limit': month.minutes_limit,
    'Overage Minutes': Math.max(0, month.minutes_used - month.minutes_limit),
    'Overage Charge': `$${(Math.max(0, month.minutes_used - month.minutes_limit) * 0.20).toFixed(2)}`,
    'Calls Processed': month.calls_processed || 0,
    'Status': month.minutes_used > month.minutes_limit ? 'Overage' : 'Within Limit'
  })) || [];

  // Calculate totals
  const totalMinutesUsed = monthlyUsage?.reduce((sum: number, m: any) => sum + m.minutes_used, 0) || 0;
  const totalOverageMinutes = monthlyUsage?.reduce((sum: number, m: any) =>
    sum + Math.max(0, m.minutes_used - m.minutes_limit), 0) || 0;
  const totalOverageCharges = totalOverageMinutes * 0.20;

  return {
    summary: {
      organization: org?.name,
      plan: org?.subscription_plan,
      monthlyLimit: org?.usage_minutes_limit,
      totalMinutesUsed,
      totalOverageMinutes,
      totalOverageCharges,
      currentDebt: org?.overage_debt_amount || 0
    },
    data: formattedData,
    columns: ['Month', 'Minutes Used', 'Minutes Limit', 'Overage Minutes',
              'Overage Charge', 'Calls Processed', 'Status']
  };
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[], columns: string[]): string {
  if (!data || data.length === 0) {
    return columns.join(',');
  }

  // Header row
  const csv = [columns.join(',')];

  // Data rows
  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col];
      // Escape commas and quotes in values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    });
    csv.push(values.join(','));
  }

  return csv.join('\n');
}