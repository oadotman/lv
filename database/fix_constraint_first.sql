-- =====================================================
-- FIX: Update Constraint FIRST, Then Migrate Data
-- =====================================================

-- Step 1: Drop the old constraint completely
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

-- Step 2: Add a temporary permissive constraint that allows BOTH old and new values
ALTER TABLE organizations
ADD CONSTRAINT organizations_plan_type_check
CHECK (plan_type = ANY (ARRAY[
  'free'::text,
  'solo'::text,
  'starter'::text,        -- NEW
  'professional'::text,   -- NEW
  'enterprise'::text,     -- Kept as 'enterprise'
  'custom'::text,         -- NEW
  -- Also allow OLD values temporarily
  'team_starter'::text,   -- OLD
  'team_pro'::text,       -- OLD
  'team_enterprise'::text -- OLD
]));

-- Step 3: Now migrate the data
UPDATE organizations
SET plan_type = CASE
  WHEN plan_type = 'team_starter' THEN 'starter'
  WHEN plan_type = 'team_pro' THEN 'professional'
  WHEN plan_type = 'team_enterprise' THEN 'enterprise'
  ELSE plan_type
END
WHERE plan_type IN ('team_starter', 'team_pro', 'team_enterprise');

-- Step 4: Verify migration worked
SELECT
  plan_type,
  COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- Step 5: Now update constraint to ONLY allow new values
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

ALTER TABLE organizations
ADD CONSTRAINT organizations_plan_type_check
CHECK (plan_type = ANY (ARRAY[
  'free'::text,
  'solo'::text,
  'starter'::text,
  'professional'::text,
  'enterprise'::text,
  'custom'::text
]));

-- Step 6: Final check
SELECT
  id,
  name,
  plan_type
FROM organizations
WHERE name = 'Karamo';