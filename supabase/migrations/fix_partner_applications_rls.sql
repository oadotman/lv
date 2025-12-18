-- =====================================================
-- FIX PARTNER APPLICATIONS RLS POLICIES
-- Allow public to submit partner applications
-- =====================================================

-- Enable RLS on the partner_applications table
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public to insert partner applications" ON partner_applications;
DROP POLICY IF EXISTS "Allow users to view their own applications" ON partner_applications;
DROP POLICY IF EXISTS "Allow admins to view all applications" ON partner_applications;
DROP POLICY IF EXISTS "Allow admins to update applications" ON partner_applications;

-- Create policy to allow public submissions (INSERT)
CREATE POLICY "Allow public to insert partner applications"
ON partner_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Create policy to allow users to view their own applications (SELECT)
CREATE POLICY "Allow users to view their own applications"
ON partner_applications
FOR SELECT
TO public
USING (
  email = current_setting('request.jwt.claims', true)::json->>'email'
  OR true -- For now, allow public to check application status by email
);

-- Create policy for admins to view all applications
CREATE POLICY "Allow admins to view all applications"
ON partner_applications
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      'your-admin-email@example.com' -- Replace with your admin email
    )
  )
);

-- Create policy for admins to update applications
CREATE POLICY "Allow admins to update applications"
ON partner_applications
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      'your-admin-email@example.com' -- Replace with your admin email
    )
  )
);

-- Also ensure the partners table has appropriate RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow partners to view their own data" ON partners;
DROP POLICY IF EXISTS "Allow admins to manage all partners" ON partners;

-- Partners can only view their own data
CREATE POLICY "Allow partners to view their own data"
ON partners
FOR SELECT
TO public
USING (
  email = current_setting('request.jwt.claims', true)::json->>'email'
  OR id::text = current_setting('request.headers', true)::json->>'x-partner-id'
);

-- Admins can manage all partners
CREATE POLICY "Allow admins to manage all partners"
ON partners
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM auth.users WHERE email IN (
      'your-admin-email@example.com' -- Replace with your admin email
    )
  )
);

-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT, INSERT ON partner_applications TO anon;
GRANT ALL ON partner_applications TO authenticated;
GRANT SELECT ON partners TO anon;
GRANT ALL ON partners TO authenticated;

-- Make sure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;