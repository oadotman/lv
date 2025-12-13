-- =====================================================
-- FIX CRITICAL USAGE TRACKING ISSUE
-- This adds the missing function to update organization used_minutes
-- =====================================================

-- Create function to safely increment organization used_minutes
CREATE OR REPLACE FUNCTION increment_used_minutes(
  org_id UUID,
  minutes_to_add INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET
    used_minutes = COALESCE(used_minutes, 0) + minutes_to_add,
    updated_at = NOW()
  WHERE id = org_id;

  -- Log the update
  RAISE NOTICE 'Updated organization % used_minutes by % minutes', org_id, minutes_to_add;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_used_minutes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_used_minutes TO service_role;

-- Create an index for faster updates if not exists
CREATE INDEX IF NOT EXISTS idx_organizations_used_minutes ON organizations(used_minutes);

-- =====================================================
-- VERIFY CURRENT STATE
-- Run these queries to check current usage tracking
-- =====================================================

-- Check organizations with their used minutes
SELECT
  o.id,
  o.name,
  o.plan_type,
  o.max_minutes_monthly,
  o.used_minutes,
  o.max_minutes_monthly - COALESCE(o.used_minutes, 0) as remaining_minutes,
  COUNT(DISTINCT c.id) as total_calls,
  SUM(c.duration_minutes) as total_duration_from_calls
FROM organizations o
LEFT JOIN calls c ON c.organization_id = o.id
GROUP BY o.id, o.name, o.plan_type, o.max_minutes_monthly, o.used_minutes
ORDER BY o.name;

-- Check recent usage metrics
SELECT
  um.created_at,
  um.metric_value as minutes_recorded,
  o.name as organization,
  u.email as user_email,
  um.metadata->>'call_id' as call_id,
  um.metadata->>'customer_name' as customer_name
FROM usage_metrics um
JOIN organizations o ON o.id = um.organization_id
JOIN auth.users u ON u.id = um.user_id
WHERE um.metric_type = 'minutes_transcribed'
ORDER BY um.created_at DESC
LIMIT 20;

-- Check for calls without organization_id (these won't track usage!)
SELECT
  c.id,
  c.created_at,
  c.customer_name,
  c.duration_minutes,
  u.email as user_email
FROM calls c
JOIN auth.users u ON u.id = c.user_id
WHERE c.organization_id IS NULL
  AND c.status = 'completed'
ORDER BY c.created_at DESC;

-- =====================================================
-- FIX HISTORICAL DATA
-- Update used_minutes based on existing usage_metrics
-- =====================================================

-- Update organizations with actual usage from usage_metrics
WITH usage_totals AS (
  SELECT
    organization_id,
    SUM(metric_value) as total_minutes
  FROM usage_metrics
  WHERE metric_type = 'minutes_transcribed'
  GROUP BY organization_id
)
UPDATE organizations o
SET used_minutes = ut.total_minutes
FROM usage_totals ut
WHERE o.id = ut.organization_id
  AND (o.used_minutes IS NULL OR o.used_minutes != ut.total_minutes);

-- =====================================================
-- MONITORING QUERIES
-- Use these to monitor usage tracking going forward
-- =====================================================

-- Check organizations approaching their limits
SELECT
  name,
  plan_type,
  max_minutes_monthly,
  used_minutes,
  ROUND((COALESCE(used_minutes, 0)::NUMERIC / NULLIF(max_minutes_monthly, 0) * 100), 2) as usage_percentage,
  max_minutes_monthly - COALESCE(used_minutes, 0) as remaining_minutes
FROM organizations
WHERE max_minutes_monthly > 0
  AND COALESCE(used_minutes, 0) > max_minutes_monthly * 0.8
ORDER BY usage_percentage DESC;