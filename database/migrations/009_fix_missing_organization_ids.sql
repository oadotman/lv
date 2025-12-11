-- =====================================================
-- FIX MISSING ORGANIZATION IDS ON CALLS
-- This migration ensures all calls have organization_id set
-- =====================================================

-- Update calls that don't have organization_id
-- by looking up the user's organization
UPDATE calls c
SET organization_id = uo.organization_id
FROM user_organizations uo
WHERE c.user_id = uo.user_id
  AND c.organization_id IS NULL
  AND uo.organization_id IS NOT NULL;

-- Log how many calls were updated
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;

    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % calls with missing organization_id', updated_count;
    ELSE
        RAISE NOTICE 'No calls needed organization_id update';
    END IF;
END $$;

-- Add any missing usage metrics for completed calls
-- This ensures usage is properly tracked for all processed calls
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
    COALESCE(c.duration_minutes, CEIL(c.duration::numeric / 60)),
    jsonb_build_object(
        'call_id', c.id,
        'duration_seconds', c.duration,
        'duration_minutes', COALESCE(c.duration_minutes, CEIL(c.duration::numeric / 60)),
        'customer_name', c.customer_name,
        'sales_rep', c.sales_rep,
        'processed_at', COALESCE(c.processed_at, c.updated_at),
        'backfilled', true,
        'backfilled_at', NOW()
    ),
    COALESCE(c.processed_at, c.updated_at, c.created_at)
FROM calls c
WHERE c.status = 'completed'
  AND c.organization_id IS NOT NULL
  AND c.duration IS NOT NULL
  AND c.duration > 0
  AND NOT EXISTS (
      SELECT 1
      FROM usage_metrics um
      WHERE (um.metadata->>'call_id')::uuid = c.id
  );

-- Log how many usage metrics were created
DO $$
DECLARE
    inserted_count INTEGER;
BEGIN
    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    IF inserted_count > 0 THEN
        RAISE NOTICE 'Created % missing usage metric records', inserted_count;
    ELSE
        RAISE NOTICE 'No missing usage metrics to create';
    END IF;
END $$;

-- Create index on metadata call_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_usage_metrics_call_id
ON usage_metrics ((metadata->>'call_id'));

-- Add comment explaining the importance
COMMENT ON COLUMN calls.organization_id IS 'Organization ID is REQUIRED for usage tracking. Must be set when call is created.';