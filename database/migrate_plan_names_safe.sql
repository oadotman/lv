-- =====================================================
-- SAFE MIGRATION: Update Plan Names
-- This version handles existing 'enterprise' plans
-- =====================================================

-- Step 1: Check current plan types before migration
SELECT 'Current plan types:' as info;
SELECT plan_type, COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- Step 2: Update only the team_* plan types
-- Leave 'enterprise' unchanged since it already exists
UPDATE organizations
SET plan_type = CASE
  WHEN plan_type = 'team_starter' THEN 'starter'
  WHEN plan_type = 'team_pro' THEN 'professional'
  WHEN plan_type = 'team_enterprise' THEN 'enterprise'
  ELSE plan_type  -- Keep all other types as-is
END
WHERE plan_type IN ('team_starter', 'team_pro', 'team_enterprise');

-- Step 3: Drop existing constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

-- Step 4: Add new constraint that includes both old and new values
-- This allows for a gradual migration
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_type_check
  CHECK (plan_type IN (
    'free',
    'solo',
    'starter',
    'professional',
    'enterprise',
    'custom',
    -- Also allow old values temporarily for safety
    'team_starter',
    'team_pro',
    'team_enterprise'
  ));

-- Step 5: Verify the migration
SELECT 'After migration:' as info;
SELECT plan_type, COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- Optional: Once verified, you can run this to remove old values from constraint:
-- ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_type_check;
-- ALTER TABLE organizations ADD CONSTRAINT organizations_plan_type_check
--   CHECK (plan_type IN ('free', 'solo', 'starter', 'professional', 'enterprise', 'custom'));