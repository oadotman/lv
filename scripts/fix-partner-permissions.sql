-- =====================================================
-- FIX PARTNER TABLE PERMISSIONS
-- Run this in your Supabase SQL editor to fix the permissions issue
-- =====================================================

-- 1. First, check if there are any triggers on partner tables that might be accessing auth.users
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('partners', 'partner_applications', 'partner_statistics', 'partner_activity_logs');

-- 2. Enable RLS on partner tables if not already enabled
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Drop any existing policies that might be problematic
DROP POLICY IF EXISTS "Enable all for service role" ON partners;
DROP POLICY IF EXISTS "Enable all for service role" ON partner_applications;
DROP POLICY IF EXISTS "Enable all for service role" ON partner_statistics;
DROP POLICY IF EXISTS "Enable all for service role" ON partner_activity_logs;

-- 4. Create policies that allow service role full access
CREATE POLICY "Service role has full access to partners"
ON partners
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to partner_applications"
ON partner_applications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to partner_statistics"
ON partner_statistics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role has full access to partner_activity_logs"
ON partner_activity_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Create policies for authenticated users (admins only for write operations)
-- Allow admins to read all partner applications
CREATE POLICY "Admins can read partner applications"
ON partner_applications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
);

-- Allow admins to update partner applications
CREATE POLICY "Admins can update partner applications"
ON partner_applications
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
);

-- Allow admins to manage partners
CREATE POLICY "Admins can manage partners"
ON partners
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
);

-- Allow admins to manage partner statistics
CREATE POLICY "Admins can manage partner statistics"
ON partner_statistics
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
);

-- Allow admins to manage partner activity logs
CREATE POLICY "Admins can manage partner activity logs"
ON partner_activity_logs
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
);

-- 6. Grant necessary permissions to authenticated role
GRANT ALL ON partners TO authenticated;
GRANT ALL ON partner_applications TO authenticated;
GRANT ALL ON partner_statistics TO authenticated;
GRANT ALL ON partner_activity_logs TO authenticated;

-- 7. Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 8. Test the permissions
SELECT 'Testing permissions - if you see this, basic SELECT works' as test_message;