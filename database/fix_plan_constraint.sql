-- =====================================================
-- FIX: Update Plan Type Constraint
-- This fixes the constraint to match the already-updated data
-- =====================================================

-- Step 1: Drop the old constraint
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

-- Step 2: Add the new constraint with updated plan names
ALTER TABLE organizations
ADD CONSTRAINT organizations_plan_type_check
CHECK (plan_type = ANY (ARRAY[
  'free'::text,
  'solo'::text,
  'starter'::text,        -- Changed from 'team_starter'
  'professional'::text,   -- Changed from 'team_pro'
  'enterprise'::text,     -- Changed from 'team_enterprise', kept as 'enterprise'
  'custom'::text          -- Added for unlimited/custom plans
]));

-- Step 3: Verify the constraint was updated
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
  AND conname = 'organizations_plan_type_check';

-- Step 4: Verify all organizations pass the new constraint
SELECT
  plan_type,
  COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;