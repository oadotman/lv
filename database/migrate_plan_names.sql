-- =====================================================
-- MIGRATION: Update Plan Names
-- Changes team_starter -> starter, team_pro -> professional, team_enterprise -> enterprise
-- =====================================================

-- Step 1: First check what plan types currently exist
SELECT DISTINCT plan_type, COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- Step 2: Update existing plan types BEFORE changing the constraint
UPDATE organizations
SET plan_type = CASE
  WHEN plan_type = 'team_starter' THEN 'starter'
  WHEN plan_type = 'team_pro' THEN 'professional'
  WHEN plan_type = 'team_enterprise' THEN 'enterprise'
  -- Keep 'enterprise' as is (don't change to 'custom' for existing data)
  ELSE plan_type
END
WHERE plan_type IN ('team_starter', 'team_pro', 'team_enterprise');

-- Step 3: Now update the CHECK constraint after data is migrated
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_type_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_type_check
  CHECK (plan_type IN ('free', 'solo', 'starter', 'professional', 'enterprise', 'custom'));

-- Step 4: Log the migration
INSERT INTO audit_logs (
  organization_id,
  user_id,
  action,
  resource_type,
  metadata
)
SELECT
  id,
  NULL,
  'plan_migration',
  'organization',
  jsonb_build_object(
    'migration', 'plan_name_update',
    'old_plan', plan_type,
    'timestamp', NOW()
  )
FROM organizations
WHERE plan_type IN ('starter', 'professional', 'enterprise');

-- Step 5: Verify the migration
SELECT
  plan_type,
  COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;