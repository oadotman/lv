-- =====================================================
-- CHECK TABLE PERMISSIONS IN SUPABASE
-- Run this in your Supabase SQL editor to see permissions
-- =====================================================

-- 1. Check if RLS is enabled on tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname IN ('public', 'auth')
AND tablename IN ('users', 'partners', 'partner_applications', 'partner_statistics', 'partner_activity_logs')
ORDER BY schemaname, tablename;

-- 2. Check current policies on partner tables
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('partners', 'partner_applications', 'partner_statistics', 'partner_activity_logs')
ORDER BY tablename, policyname;

-- 3. Check if service role can access auth.users (it should)
-- This shows what columns are available in auth.users
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Test query that might be failing
-- Try to select from auth.users (this will fail for anon/authenticated roles)
-- SELECT id, email FROM auth.users LIMIT 1;

-- 5. Check partner table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'partners'
ORDER BY ordinal_position;