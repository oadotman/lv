-- =====================================================
-- SIMPLE DIAGNOSTIC: Check Plan Types
-- Run each query separately if needed
-- =====================================================

-- Query 1: Show all organizations with their plan types
SELECT
  id,
  name,
  plan_type,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- Query 2: Count by plan type
SELECT
  plan_type,
  COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- Query 3: Check the Karamo organization specifically
SELECT
  id,
  name,
  plan_type,
  LENGTH(plan_type) as plan_length
FROM organizations
WHERE name = 'Karamo';

-- Query 4: See current constraints on the table
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'organizations'::regclass
  AND contype = 'c';