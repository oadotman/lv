-- =====================================================
-- CRITICAL FIX: ADD MISSING used_minutes COLUMN
-- This column is required for usage tracking to work!
-- Without this column, NO usage is being deducted from teams!
-- =====================================================

-- 1. Add the missing used_minutes column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS used_minutes INTEGER DEFAULT 0;

-- 2. Add column comment for clarity
COMMENT ON COLUMN organizations.used_minutes IS 'Total minutes used in current billing period';

-- 3. Create the increment function if it doesn't exist
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

  RAISE NOTICE 'Updated organization % used_minutes by % minutes', org_id, minutes_to_add;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION increment_used_minutes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_used_minutes TO service_role;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_used_minutes
ON organizations(used_minutes);

-- Update the column with actual usage from usage_metrics
UPDATE organizations o
SET used_minutes = (
  SELECT COALESCE(SUM(metric_value), 0)
  FROM usage_metrics um
  WHERE um.organization_id = o.id
  AND um.metric_type = 'minutes_transcribed'
)
WHERE o.used_minutes IS NULL OR o.used_minutes = 0;

-- Verify the fix
SELECT
  id,
  name,
  plan_type,
  max_minutes_monthly,
  used_minutes,
  CASE
    WHEN used_minutes IS NULL THEN '❌ NULL'
    WHEN used_minutes = 0 THEN '⚠️ ZERO'
    ELSE '✅ SET'
  END as status
FROM organizations
ORDER BY created_at DESC;

-- Show organizations with their actual usage
SELECT
  o.name,
  o.plan_type,
  o.max_minutes_monthly,
  o.used_minutes,
  (
    SELECT COALESCE(SUM(metric_value), 0)
    FROM usage_metrics um
    WHERE um.organization_id = o.id
    AND um.metric_type = 'minutes_transcribed'
  ) as calculated_usage,
  o.max_minutes_monthly - COALESCE(o.used_minutes, 0) as remaining_minutes
FROM organizations o
ORDER BY o.name;