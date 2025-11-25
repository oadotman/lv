-- Verify User Setup After Signup
-- Run this in Supabase SQL Editor to check if signup created everything correctly

-- 1. Check if user exists
SELECT
  'Users' as table_name,
  email,
  id,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if organizations were created
SELECT
  'Organizations' as table_name,
  id,
  name,
  slug,
  plan_type,
  max_members,
  created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if user_organizations memberships exist
SELECT
  'User Organizations' as table_name,
  uo.id,
  uo.user_id,
  uo.organization_id,
  uo.role,
  u.email as user_email,
  o.name as org_name
FROM user_organizations uo
LEFT JOIN auth.users u ON uo.user_id = u.id
LEFT JOIN organizations o ON uo.organization_id = o.id
ORDER BY uo.joined_at DESC
LIMIT 10;

-- 4. Check for orphaned users (users without organizations)
SELECT
  'Orphaned Users' as table_name,
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.id IS NULL
ORDER BY u.created_at DESC;

-- 5. Check for orphaned organizations (orgs without users)
SELECT
  'Orphaned Organizations' as table_name,
  o.id,
  o.name,
  o.slug,
  o.created_at
FROM organizations o
LEFT JOIN user_organizations uo ON o.id = uo.organization_id
WHERE uo.id IS NULL
ORDER BY o.created_at DESC;
