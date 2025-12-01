-- =====================================================
-- DIAGNOSTIC: Check Current Database State
-- Run this FIRST to understand what we're dealing with
-- =====================================================

-- 1. Check what plan types currently exist
SELECT 'CURRENT PLAN TYPES IN DATABASE:' as info;
SELECT
  plan_type,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as organization_names
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- 2. Check the current constraint definition
SELECT 'CURRENT CHECK CONSTRAINT:' as info;
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname LIKE '%plan_type%'
  AND conrelid = 'organizations'::regclass;

-- 3. Check if there are any NULL plan_types
SELECT 'NULL PLAN TYPES:' as info;
SELECT COUNT(*) as null_count
FROM organizations
WHERE plan_type IS NULL;

-- 4. Show all unique plan_type values (including any weird ones)
SELECT 'ALL UNIQUE PLAN TYPE VALUES:' as info;
SELECT DISTINCT
  plan_type,
  LENGTH(plan_type) as length,
  '|' || plan_type || '|' as wrapped_value
FROM organizations
ORDER BY plan_type;

-- 5. Check specific organization that's causing issues
SELECT 'KARAMO ORGANIZATION DETAILS:' as info;
SELECT
  id,
  name,
  plan_type,
  '|' || plan_type || '|' as wrapped_plan_type,
  LENGTH(plan_type) as plan_type_length,
  created_at,
  updated_at
FROM organizations
WHERE name = 'Karamo' OR id = '7e9e3b31-2ad3-4e27-94bc-f0ff221e4041';

-- 6. Check if there are any trailing spaces or special characters
SELECT 'ORGANIZATIONS WITH NON-STANDARD PLAN TYPES:' as info;
SELECT
  id,
  name,
  plan_type,
  '|' || plan_type || '|' as wrapped,
  LENGTH(plan_type) as len
FROM organizations
WHERE plan_type NOT IN ('free', 'solo', 'team_starter', 'team_pro', 'team_enterprise', 'enterprise')
   OR plan_type != TRIM(plan_type);