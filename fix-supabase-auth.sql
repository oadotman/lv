-- =====================================================
-- FIX SUPABASE AUTH ISSUES
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Check if auth schema exists
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name = 'auth';

-- 2. Check auth.users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check for any auth triggers that might be failing
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- 4. Check if there are any custom RLS policies blocking user creation
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
WHERE schemaname = 'auth'
AND tablename = 'users';

-- 5. Test if we can manually insert into auth.users (DON'T RUN THIS IN PRODUCTION)
-- This is just to test if direct inserts work
/*
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"full_name": "Test User"}'::jsonb
);
*/

-- 6. Check for any failed migrations
SELECT * FROM supabase_migrations.schema_migrations
WHERE success = false
ORDER BY version DESC
LIMIT 10;

-- 7. Check if auth.users table has any constraints that might be failing
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'auth'
AND tc.table_name = 'users';

-- 8. Check if there are any custom functions that might be interfering
SELECT
    n.nspname as function_schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as function_arguments
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'auth'
AND p.proname LIKE '%user%';

-- 9. Quick fix attempt - Reset auth config (BE CAREFUL!)
-- This ensures basic auth settings are correct
UPDATE auth.config
SET
    site_url = 'http://localhost:3000',
    jwt_secret = current_setting('app.settings.jwt_secret', true),
    disable_signup = false
WHERE id = 1;

-- 10. Check current auth.config settings
SELECT * FROM auth.config;