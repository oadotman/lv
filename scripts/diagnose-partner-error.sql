-- =====================================================
-- DIAGNOSE PARTNER APPROVAL ERROR
-- Run this entire script in Supabase SQL editor and share the results
-- =====================================================

-- 1. Check if partner tables exist
SELECT 'Checking if tables exist:' as step;
SELECT
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('partners', 'partner_applications', 'partner_statistics', 'partner_activity_logs');

-- 2. Check RLS status on these tables
SELECT 'Checking RLS status:' as step;
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('partners', 'partner_applications', 'partner_statistics', 'partner_activity_logs');

-- 3. Check if service role can access these tables
SELECT 'Testing service role access:' as step;
-- This should return data if service role has access
SELECT COUNT(*) as partner_count FROM partners;
SELECT COUNT(*) as application_count FROM partner_applications;
SELECT COUNT(*) as stats_count FROM partner_statistics;
SELECT COUNT(*) as logs_count FROM partner_activity_logs;

-- 4. Check the specific application that's failing
SELECT 'Checking specific application:' as step;
SELECT
    id,
    email,
    full_name,
    status,
    submitted_at
FROM partner_applications
WHERE id = '0a6bf4e2-c4e0-4ada-a11e-23c28d07b936';

-- 5. Check if this email already exists in partners
SELECT 'Checking for existing partner:' as step;
SELECT
    id,
    email,
    name,
    created_at
FROM partners
WHERE email IN (
    SELECT email
    FROM partner_applications
    WHERE id = '0a6bf4e2-c4e0-4ada-a11e-23c28d07b936'
);

-- 6. Check table constraints
SELECT 'Checking constraints on partners table:' as step;
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'partners'::regclass;

-- 7. Check if there are any triggers
SELECT 'Checking triggers:' as step;
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('partners', 'partner_applications');

-- 8. Check column details for partners table
SELECT 'Checking partners table structure:' as step;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'partners'
ORDER BY ordinal_position;

-- 9. Final message
SELECT 'Diagnostic complete - please share all results above' as message;