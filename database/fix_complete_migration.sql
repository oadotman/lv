-- =====================================================
-- COMPLETE FIX: Migrate Data AND Update Constraint
-- =====================================================

-- Step 1: Show current state
SELECT 'BEFORE MIGRATION:' as status;
SELECT
  plan_type,
  COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- Step 2: Update the data from old plan names to new
UPDATE organizations
SET plan_type = 'starter'
WHERE plan_type = 'team_starter';

UPDATE organizations
SET plan_type = 'professional'
WHERE plan_type = 'team_pro';

UPDATE organizations
SET plan_type = 'enterprise'
WHERE plan_type = 'team_enterprise';

-- Step 3: Verify data migration
SELECT 'AFTER DATA MIGRATION:' as status;
SELECT
  plan_type,
  COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- Step 4: Now drop the old constraint
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_plan_type_check;

-- Step 5: Add the new constraint with updated plan names
ALTER TABLE organizations
ADD CONSTRAINT organizations_plan_type_check
CHECK (plan_type = ANY (ARRAY[
  'free'::text,
  'solo'::text,
  'starter'::text,        -- Changed from 'team_starter'
  'professional'::text,   -- Changed from 'team_pro'
  'enterprise'::text,     -- Kept as 'enterprise'
  'custom'::text          -- Added for unlimited/custom plans
]));

-- Step 6: Final verification
SELECT 'CONSTRAINT UPDATED:' as status;
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
  AND conname = 'organizations_plan_type_check';

-- Step 7: Confirm Karamo organization is updated
SELECT 'KARAMO ORGANIZATION:' as status;
SELECT
  id,
  name,
  plan_type
FROM organizations
WHERE id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041';