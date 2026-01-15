// Test script to check duration issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDurationData() {
  console.log('Checking call durations and usage metrics...\n');

  // Get recent calls with duration info
  const { data: calls, error: callsError } = await supabase
    .from('calls')
    .select('id, customer_name, duration, duration_minutes, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (callsError) {
    console.error('Error fetching calls:', callsError);
    return;
  }

  console.log('=== Recent Calls ===');
  console.log('ID | Customer | Duration (sec) | Duration (min) | Status');
  console.log('-----------------------------------------------------------');

  for (const call of calls || []) {
    console.log(
      `${call.id.substring(0, 8)} | ${(call.customer_name || 'Unknown').padEnd(15)} | ${
        String(call.duration || '0').padEnd(14)
      } | ${String(call.duration_minutes || '0').padEnd(14)} | ${call.status}`
    );
  }

  // Get usage metrics
  console.log('\n=== Usage Metrics (call_minutes) ===');
  const { data: metrics, error: metricsError } = await supabase
    .from('usage_metrics')
    .select('id, metric_type, metric_value, call_id, created_at')
    .eq('metric_type', 'call_minutes')
    .order('created_at', { ascending: false })
    .limit(10);

  if (metricsError) {
    console.error('Error fetching metrics:', metricsError);
    return;
  }

  console.log('ID | Metric Value | Call ID | Created');
  console.log('-----------------------------------------------------------');

  for (const metric of metrics || []) {
    console.log(
      `${metric.id.substring(0, 8)} | ${
        String(metric.metric_value).padEnd(12)
      } | ${metric.call_id ? metric.call_id.substring(0, 8) : 'N/A'.padEnd(8)} | ${
        new Date(metric.created_at).toLocaleString()
      }`
    );
  }

  // Calculate totals
  const totalMinutesInCalls = (calls || []).reduce((sum, call) => sum + (call.duration_minutes || 0), 0);
  const totalMinutesInMetrics = (metrics || []).reduce((sum, metric) => sum + (metric.metric_value || 0), 0);

  console.log('\n=== Summary ===');
  console.log(`Total minutes from calls table: ${totalMinutesInCalls}`);
  console.log(`Total minutes from usage_metrics: ${totalMinutesInMetrics}`);

  // Check for calls with 0 duration that are completed
  const { data: zeroDurationCalls } = await supabase
    .from('calls')
    .select('id, customer_name, status')
    .eq('status', 'completed')
    .or('duration.is.null,duration.eq.0')
    .limit(5);

  if (zeroDurationCalls && zeroDurationCalls.length > 0) {
    console.log('\n⚠️  WARNING: Found completed calls with 0 or null duration:');
    for (const call of zeroDurationCalls) {
      console.log(`  - ${call.id.substring(0, 8)} | ${call.customer_name || 'Unknown'}`);
    }
  }
}

checkDurationData().catch(console.error);