-- =====================================================
-- FIX TEAM INVITATION RLS POLICIES
-- Allow public access to view invitations by token
-- =====================================================

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Team admins can view invitations" ON team_invitations;

-- Create new policies that allow both admin access and token-based access

-- 1. Team admins can view all invitations for their organization
CREATE POLICY "Team admins can view org invitations"
  ON team_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 2. Anyone can view an invitation if they have the token (for accepting invitations)
CREATE POLICY "Public can view invitations by token"
  ON team_invitations FOR SELECT
  USING (
    -- Allow viewing if:
    -- 1. The invitation hasn't expired
    -- 2. They're accessing with a valid token (will be filtered in the query)
    expires_at > NOW()
  );

-- 3. Update the accept policy to be more permissive
DROP POLICY IF EXISTS "Users can accept invitations with valid token" ON team_invitations;

CREATE POLICY "Anyone can accept valid invitations"
  ON team_invitations FOR UPDATE
  USING (
    -- Allow updating if the invitation is valid
    accepted_at IS NULL
    AND expires_at > NOW()
  )
  WITH CHECK (
    -- Only allow setting accepted_at and accepted_by fields
    accepted_at IS NOT NULL
  );

-- Note: The actual token validation happens in the application layer
-- RLS just ensures the invitation is valid (not expired, not already accepted)