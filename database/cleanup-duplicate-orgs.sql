-- =====================================================
-- CLEANUP DUPLICATE ORGANIZATIONS
-- =====================================================

-- Find duplicate organizations (same name, same or different users)
WITH duplicate_orgs AS (
  SELECT
    name,
    COUNT(*) as count
  FROM organizations
  WHERE deleted_at IS NULL
  GROUP BY name
  HAVING COUNT(*) > 1
)
SELECT
  o.id,
  o.name,
  o.plan_type,
  o.used_minutes,
  o.max_minutes_monthly,
  o.created_at,
  (SELECT COUNT(*) FROM user_organizations uo WHERE uo.organization_id = o.id) as member_count,
  (SELECT COUNT(*) FROM calls c WHERE c.organization_id = o.id) as call_count
FROM organizations o
WHERE o.name IN (SELECT name FROM duplicate_orgs)
ORDER BY o.name, o.created_at;

-- To fix duplicates, you can:
-- 1. Keep the organization with the most usage/calls
-- 2. Migrate users and calls from duplicates to the main one
-- 3. Soft-delete the duplicates

-- Example: Merge duplicates (run manually after reviewing above results)
-- This keeps the org with the most calls and migrates everything else to it
/*
WITH org_activity AS (
  SELECT
    o.id,
    o.name,
    o.plan_type,
    COUNT(DISTINCT c.id) as call_count,
    COUNT(DISTINCT uo.user_id) as user_count,
    o.created_at,
    ROW_NUMBER() OVER (PARTITION BY o.name ORDER BY
      COUNT(DISTINCT c.id) DESC,
      o.plan_type DESC, -- Prefer paid plans
      o.created_at ASC -- Then oldest
    ) as rn
  FROM organizations o
  LEFT JOIN calls c ON c.organization_id = o.id
  LEFT JOIN user_organizations uo ON uo.organization_id = o.id
  WHERE o.deleted_at IS NULL
  GROUP BY o.id, o.name, o.plan_type, o.created_at
),
orgs_to_keep AS (
  SELECT id, name FROM org_activity WHERE rn = 1
),
orgs_to_remove AS (
  SELECT id, name FROM org_activity WHERE rn > 1
)
-- First, update calls to point to the org we're keeping
UPDATE calls c
SET organization_id = (
  SELECT ok.id
  FROM orgs_to_keep ok
  WHERE ok.name = (
    SELECT o.name
    FROM organizations o
    WHERE o.id = c.organization_id
  )
)
WHERE c.organization_id IN (SELECT id FROM orgs_to_remove);

-- Update user_organizations to avoid duplicates
-- (This is complex and needs careful handling to avoid constraint violations)

-- Finally, soft-delete the duplicate organizations
UPDATE organizations
SET deleted_at = NOW()
WHERE id IN (SELECT id FROM orgs_to_remove);
*/