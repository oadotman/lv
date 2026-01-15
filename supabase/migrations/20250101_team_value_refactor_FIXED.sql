-- =====================================================
-- LOADVOICE TEAM VALUE REFACTOR - FIXED VERSION
-- Team = Shared knowledge and resources
-- Date: 2025-01-01
-- =====================================================

-- =====================================================
-- 1. PHONE NUMBER MANAGEMENT (Admin Only)
-- =====================================================

-- Create phone numbers table for team management
CREATE TABLE IF NOT EXISTS twilio_phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Number details
    phone_number TEXT NOT NULL,
    friendly_name TEXT,
    phone_number_sid TEXT UNIQUE NOT NULL,

    -- Assignment
    assignment_type TEXT NOT NULL DEFAULT 'personal' CHECK (assignment_type IN ('personal', 'shared')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for shared numbers
    assigned_by UUID NOT NULL REFERENCES auth.users(id), -- Admin who assigned
    assigned_at TIMESTAMPTZ DEFAULT NOW(),

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),

    -- Twilio configuration
    voice_url TEXT,
    voice_method TEXT DEFAULT 'POST',
    sms_url TEXT,
    sms_method TEXT DEFAULT 'POST',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(organization_id, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_org ON twilio_phone_numbers(organization_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_to ON twilio_phone_numbers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON twilio_phone_numbers(status);

-- =====================================================
-- 2. SHARED CARRIER DATABASE ENHANCEMENTS
-- =====================================================

-- Add team tracking columns to carriers table if they don't exist
ALTER TABLE carriers
ADD COLUMN IF NOT EXISTS last_contact_date DATE,
ADD COLUMN IF NOT EXISTS last_contact_by UUID REFERENCES auth.users(id);

-- Carrier interaction history for full team visibility
CREATE TABLE IF NOT EXISTS carrier_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,

    -- Interaction details
    interaction_type TEXT CHECK (interaction_type IN ('call', 'email', 'note', 'rate_update')),
    interaction_date TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Content
    notes TEXT,
    rate_discussed DECIMAL(10,2),
    lane_discussed TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carrier_interactions_carrier ON carrier_interactions(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_interactions_org ON carrier_interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_carrier_interactions_user ON carrier_interactions(user_id);

-- =====================================================
-- 3. SHARED CALL VISIBILITY
-- =====================================================

-- Update calls table for team visibility
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'team' CHECK (visibility IN ('team', 'personal')),
ADD COLUMN IF NOT EXISTS phone_number_id UUID REFERENCES twilio_phone_numbers(id);

-- Create index for efficient team call queries
CREATE INDEX IF NOT EXISTS idx_calls_visibility ON calls(organization_id, visibility);
CREATE INDEX IF NOT EXISTS idx_calls_phone_number ON calls(phone_number_id);

-- =====================================================
-- 4. CREATE PROFILES TABLE IF NOT EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =====================================================
-- 5. TEAM SHARED RESOURCES VIEWS
-- =====================================================

-- View for team members to see all shared carriers with last interaction
CREATE OR REPLACE VIEW team_carriers_view AS
SELECT
    c.*,
    p_created.full_name as created_by_name,
    p_updated.full_name as updated_by_name,
    p_contact.full_name as last_contact_by_name,
    (
        SELECT COUNT(*)
        FROM carrier_interactions ci
        WHERE ci.carrier_id = c.id
    ) as total_interactions,
    (
        SELECT json_agg(
            json_build_object(
                'date', ci.interaction_date,
                'type', ci.interaction_type,
                'user_name', pi.full_name,
                'notes', ci.notes
            ) ORDER BY ci.interaction_date DESC
        )
        FROM carrier_interactions ci
        LEFT JOIN profiles pi ON ci.user_id = pi.id
        WHERE ci.carrier_id = c.id
        LIMIT 5
    ) as recent_interactions
FROM carriers c
LEFT JOIN profiles p_created ON c.created_by = p_created.id
LEFT JOIN profiles p_updated ON c.updated_by = p_updated.id
LEFT JOIN profiles p_contact ON c.last_contact_by = p_contact.id;

-- View for team calls with user info
CREATE OR REPLACE VIEW team_calls_view AS
SELECT
    c.*,
    p.full_name as user_name,
    p.email as user_email,
    tpn.phone_number as from_number,
    tpn.friendly_name as number_name,
    tpn.assignment_type
FROM calls c
LEFT JOIN profiles p ON c.user_id = p.id
LEFT JOIN twilio_phone_numbers tpn ON c.phone_number_id = tpn.id
WHERE c.visibility = 'team';

-- =====================================================
-- 6. USAGE TRACKING BY TEAM MEMBER
-- =====================================================

-- Add team member tracking to usage_metrics if not exists
ALTER TABLE usage_metrics
ADD COLUMN IF NOT EXISTS phone_number_id UUID REFERENCES twilio_phone_numbers(id);

-- Create view for admin to see usage by team member
CREATE OR REPLACE VIEW admin_team_usage_view AS
SELECT
    um.*,
    p.full_name as user_name,
    p.email as user_email,
    tpn.phone_number,
    tpn.friendly_name as number_name
FROM usage_metrics um
LEFT JOIN profiles p ON um.user_id = p.id
LEFT JOIN twilio_phone_numbers tpn ON um.phone_number_id = tpn.id;

-- =====================================================
-- 7. SIMPLIFIED PERMISSIONS
-- =====================================================

-- RLS Policies for phone numbers (Admin only management)
ALTER TABLE twilio_phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view their organization's phone numbers" ON twilio_phone_numbers;
CREATE POLICY "Team members can view their organization's phone numbers" ON twilio_phone_numbers
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Only admins can manage phone numbers" ON twilio_phone_numbers;
CREATE POLICY "Only admins can manage phone numbers" ON twilio_phone_numbers
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS for carrier interactions
ALTER TABLE carrier_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view carrier interactions" ON carrier_interactions;
CREATE POLICY "Team members can view carrier interactions" ON carrier_interactions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Team members can create carrier interactions" ON carrier_interactions;
CREATE POLICY "Team members can create carrier interactions" ON carrier_interactions
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Update calls RLS to respect visibility
DROP POLICY IF EXISTS "Users can view team calls and their own calls" ON calls;
CREATE POLICY "Users can view team calls and their own calls" ON calls
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
        AND (
            visibility = 'team'
            OR user_id = auth.uid()
        )
    );

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_team_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = auth.uid()
        AND organization_id = org_id
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_role(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM user_organizations
    WHERE user_id = auth.uid()
    AND organization_id = org_id;

    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team call statistics
CREATE OR REPLACE FUNCTION get_team_calls(
    org_id UUID,
    user_filter UUID DEFAULT NULL,
    date_from TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    from_number TEXT,
    to_number TEXT,
    direction TEXT,
    duration INTEGER,
    processing_status TEXT,
    visibility TEXT,
    created_at TIMESTAMPTZ,
    recording_url TEXT,
    extracted_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.organization_id,
        c.user_id,
        p.full_name as user_name,
        p.email as user_email,
        COALESCE(tpn.phone_number, tc.from_number) as from_number,
        COALESCE(tc.to_number, c.customer_phone) as to_number,
        COALESCE(tc.direction, 'outbound') as direction,
        c.duration,
        c.status as processing_status,
        c.visibility,
        c.created_at,
        c.audio_url as recording_url,
        c.metadata as extracted_info
    FROM calls c
    LEFT JOIN profiles p ON c.user_id = p.id
    LEFT JOIN twilio_phone_numbers tpn ON c.phone_number_id = tpn.id
    LEFT JOIN twilio_calls tc ON tc.call_id = c.id
    WHERE c.organization_id = org_id
    AND c.visibility = 'team'
    AND (user_filter IS NULL OR c.user_id = user_filter)
    AND (date_from IS NULL OR c.created_at >= date_from)
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_phone_numbers_updated_at ON twilio_phone_numbers;
CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON twilio_phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-populate profiles from auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT ALL ON twilio_phone_numbers TO authenticated;
GRANT ALL ON carrier_interactions TO authenticated;
GRANT SELECT ON team_carriers_view TO authenticated;
GRANT SELECT ON team_calls_view TO authenticated;
GRANT SELECT ON admin_team_usage_view TO authenticated;
GRANT ALL ON profiles TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION is_team_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_calls(UUID, UUID, TIMESTAMPTZ) TO authenticated;