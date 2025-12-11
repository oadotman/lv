-- =====================================================
-- Data Integrity Check & Fix for Missing Usage Metrics
-- This script ensures all completed calls have corresponding usage_metrics entries
-- =====================================================

-- Step 1: Identify completed calls missing usage_metrics records
WITH missing_metrics AS (
  SELECT
    c.id,
    c.organization_id,
    c.user_id,
    c.duration_minutes,
    c.customer_name,
    c.sales_rep,
    c.processed_at,
    c.created_at
  FROM calls c
  WHERE c.status = 'completed'
    AND c.duration_minutes IS NOT NULL
    AND c.duration_minutes > 0
    AND c.organization_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM usage_metrics um
      WHERE um.metadata->>'call_id' = c.id::text
        AND um.metric_type = 'minutes_transcribed'
    )
)
SELECT
  COUNT(*) as missing_count,
  SUM(duration_minutes) as total_missing_minutes
FROM missing_metrics;

-- Step 2: Insert missing usage_metrics records
INSERT INTO usage_metrics (
  organization_id,
  user_id,
  metric_type,
  metric_value,
  metadata,
  created_at
)
SELECT
  c.organization_id,
  c.user_id,
  'minutes_transcribed',
  c.duration_minutes,
  jsonb_build_object(
    'call_id', c.id,
    'duration_minutes', c.duration_minutes,
    'customer_name', c.customer_name,
    'sales_rep', c.sales_rep,
    'recovered', true,
    'recovery_date', NOW(),
    'recovery_reason', 'Missing usage_metrics record for completed call'
  ),
  COALESCE(c.processed_at, c.created_at)
FROM calls c
WHERE c.status = 'completed'
  AND c.duration_minutes IS NOT NULL
  AND c.duration_minutes > 0
  AND c.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM usage_metrics um
    WHERE um.metadata->>'call_id' = c.id::text
      AND um.metric_type = 'minutes_transcribed'
  );

-- Step 3: Fix any calls with organization_id = NULL by looking up from user_organizations
UPDATE calls c
SET organization_id = uo.organization_id
FROM user_organizations uo
WHERE c.user_id = uo.user_id
  AND c.organization_id IS NULL
  AND uo.organization_id IS NOT NULL;

-- Step 4: Create usage_metrics for calls that now have organization_id
INSERT INTO usage_metrics (
  organization_id,
  user_id,
  metric_type,
  metric_value,
  metadata,
  created_at
)
SELECT
  c.organization_id,
  c.user_id,
  'minutes_transcribed',
  c.duration_minutes,
  jsonb_build_object(
    'call_id', c.id,
    'duration_minutes', c.duration_minutes,
    'customer_name', c.customer_name,
    'sales_rep', c.sales_rep,
    'recovered', true,
    'recovery_date', NOW(),
    'recovery_reason', 'Organization ID was null, now fixed'
  ),
  COALESCE(c.processed_at, c.created_at)
FROM calls c
WHERE c.status = 'completed'
  AND c.duration_minutes IS NOT NULL
  AND c.duration_minutes > 0
  AND c.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM usage_metrics um
    WHERE um.metadata->>'call_id' = c.id::text
      AND um.metric_type = 'minutes_transcribed'
  );

-- Step 5: Verify the fix - show current state
SELECT
  'Summary Report' as report_type,
  COUNT(DISTINCT c.id) as total_completed_calls,
  COUNT(DISTINCT CASE WHEN c.organization_id IS NOT NULL THEN c.id END) as calls_with_org,
  COUNT(DISTINCT um.metadata->>'call_id') as calls_with_metrics,
  SUM(c.duration_minutes) as total_call_minutes,
  SUM(um.metric_value) as total_tracked_minutes
FROM calls c
LEFT JOIN usage_metrics um
  ON um.metadata->>'call_id' = c.id::text
  AND um.metric_type = 'minutes_transcribed'
WHERE c.status = 'completed'
  AND c.duration_minutes > 0;

-- Step 6: Show any remaining problematic calls
SELECT
  c.id,
  c.customer_name,
  c.sales_rep,
  c.duration_minutes,
  c.organization_id,
  c.user_id,
  c.status,
  c.created_at,
  'No usage_metrics record' as issue
FROM calls c
WHERE c.status = 'completed'
  AND c.duration_minutes IS NOT NULL
  AND c.duration_minutes > 0
  AND NOT EXISTS (
    SELECT 1
    FROM usage_metrics um
    WHERE um.metadata->>'call_id' = c.id::text
      AND um.metric_type = 'minutes_transcribed'
  )
LIMIT 10;