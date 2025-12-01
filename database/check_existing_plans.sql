-- =====================================================
-- CHECK: What plan types actually exist in the database?
-- =====================================================

-- Show ALL distinct plan types that exist
SELECT DISTINCT
  plan_type,
  COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY plan_type;

-- Show any NULL plan types
SELECT
  id,
  name,
  plan_type,
  CASE
    WHEN plan_type IS NULL THEN 'NULL VALUE'
    WHEN plan_type = '' THEN 'EMPTY STRING'
    ELSE plan_type
  END as plan_status
FROM organizations
WHERE plan_type IS NULL OR plan_type = '';

-- Show all organizations with their exact plan types
SELECT
  id,
  name,
  '>' || COALESCE(plan_type, 'NULL') || '<' as wrapped_plan_type
FROM organizations
ORDER BY name;