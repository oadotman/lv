-- =====================================================
-- PARTNER PROGRAM DATABASE SCHEMA
-- Complete schema for LoadVoice Partner Program
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PARTNERS TABLE
-- Core partner accounts and profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    company_name TEXT,
    website TEXT,
    phone TEXT,
    partner_type TEXT CHECK (partner_type IN ('crm_consultant', 'fractional_sales_leader', 'sales_coach', 'revops_consultant', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'suspended')),
    tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'premium')),
    commission_rate NUMERIC(4,3) NOT NULL DEFAULT 0.25 CHECK (commission_rate >= 0 AND commission_rate <= 1),
    referral_code TEXT UNIQUE NOT NULL,
    coupon_code TEXT UNIQUE,
    password_hash TEXT, -- For partner-specific auth (optional, can use Supabase Auth)
    payment_method TEXT CHECK (payment_method IN ('paypal', 'bank_transfer', 'wise')),
    payment_details JSONB,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_reason TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for partners
CREATE INDEX idx_partners_email ON partners(email);
CREATE INDEX idx_partners_referral_code ON partners(referral_code);
CREATE INDEX idx_partners_coupon_code ON partners(coupon_code);
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_tier ON partners(tier);

-- =====================================================
-- PARTNER APPLICATIONS TABLE
-- Track partner program applications
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    company_name TEXT,
    website TEXT,
    phone TEXT,
    partner_type TEXT NOT NULL,
    clients_per_year TEXT,
    crms_used TEXT[],
    how_heard TEXT,
    why_partner TEXT NOT NULL,
    has_used_loadvoice BOOLEAN DEFAULT false,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'more_info_needed')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT,
    rejection_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for applications
CREATE INDEX idx_partner_applications_email ON partner_applications(email);
CREATE INDEX idx_partner_applications_status ON partner_applications(status);
CREATE INDEX idx_partner_applications_submitted ON partner_applications(submitted_at);

-- =====================================================
-- PARTNER SESSIONS TABLE
-- Manage partner authentication sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sessions
CREATE INDEX idx_partner_sessions_token ON partner_sessions(token);
CREATE INDEX idx_partner_sessions_partner ON partner_sessions(partner_id);
CREATE INDEX idx_partner_sessions_expires ON partner_sessions(expires_at);

-- Clean up expired sessions periodically
CREATE OR REPLACE FUNCTION cleanup_expired_partner_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM partner_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTNER REFERRALS TABLE
-- Track all partner-generated referrals
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id),
    customer_email TEXT NOT NULL,
    customer_organization_id UUID REFERENCES organizations(id),
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'clicked' CHECK (status IN ('clicked', 'signed_up', 'trial', 'active', 'churned', 'refunded')),
    clicked_at TIMESTAMP WITH TIME ZONE,
    signed_up_at TIMESTAMP WITH TIME ZONE,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    converted_at TIMESTAMP WITH TIME ZONE,
    churned_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    subscription_id TEXT,
    plan_name TEXT,
    monthly_value INTEGER, -- in cents
    lifetime_value INTEGER DEFAULT 0, -- total earned from this customer in cents
    months_active INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for referrals
CREATE INDEX idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX idx_partner_referrals_customer ON partner_referrals(customer_id);
CREATE INDEX idx_partner_referrals_email ON partner_referrals(customer_email);
CREATE INDEX idx_partner_referrals_status ON partner_referrals(status);
CREATE INDEX idx_partner_referrals_code ON partner_referrals(referral_code);

-- =====================================================
-- PARTNER CLICKS TABLE
-- Track all partner link clicks
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    landing_page TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMP WITH TIME ZONE,
    customer_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for clicks
CREATE INDEX idx_partner_clicks_partner ON partner_clicks(partner_id);
CREATE INDEX idx_partner_clicks_code ON partner_clicks(referral_code);
CREATE INDEX idx_partner_clicks_converted ON partner_clicks(converted);
CREATE INDEX idx_partner_clicks_date ON partner_clicks(clicked_at);

-- =====================================================
-- PARTNER COMMISSIONS TABLE
-- Calculate and track partner commissions
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    referral_id UUID NOT NULL REFERENCES partner_referrals(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES auth.users(id),
    customer_organization_id UUID REFERENCES organizations(id),
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'reversed', 'cancelled')),
    month TEXT NOT NULL, -- YYYY-MM format
    subscription_payment_id TEXT, -- Reference to Paddle payment
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    reversed_at TIMESTAMP WITH TIME ZONE,
    reversal_reason TEXT,
    payout_id UUID,
    commission_rate NUMERIC(4,3) NOT NULL,
    base_amount_cents INTEGER NOT NULL, -- Original payment amount
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for commissions
CREATE INDEX idx_partner_commissions_partner ON partner_commissions(partner_id);
CREATE INDEX idx_partner_commissions_referral ON partner_commissions(referral_id);
CREATE INDEX idx_partner_commissions_customer ON partner_commissions(customer_id);
CREATE INDEX idx_partner_commissions_status ON partner_commissions(status);
CREATE INDEX idx_partner_commissions_month ON partner_commissions(month);
CREATE INDEX idx_partner_commissions_payout ON partner_commissions(payout_id);

-- =====================================================
-- PARTNER PAYOUTS TABLE
-- Manage partner payouts
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    payment_method TEXT NOT NULL,
    payment_details JSONB,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    commission_count INTEGER NOT NULL DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    transaction_id TEXT, -- External payment system reference
    payment_receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payouts
CREATE INDEX idx_partner_payouts_partner ON partner_payouts(partner_id);
CREATE INDEX idx_partner_payouts_status ON partner_payouts(status);
CREATE INDEX idx_partner_payouts_processed ON partner_payouts(processed_at);

-- =====================================================
-- PARTNER STATISTICS TABLE
-- Aggregate statistics for each partner
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL UNIQUE REFERENCES partners(id) ON DELETE CASCADE,
    total_clicks INTEGER DEFAULT 0,
    total_signups INTEGER DEFAULT 0,
    total_trials INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    active_customers INTEGER DEFAULT 0,
    churned_customers INTEGER DEFAULT 0,
    total_revenue_generated INTEGER DEFAULT 0, -- in cents
    total_commission_earned INTEGER DEFAULT 0, -- in cents
    total_commission_paid INTEGER DEFAULT 0, -- in cents
    total_commission_pending INTEGER DEFAULT 0, -- in cents
    total_commission_approved INTEGER DEFAULT 0, -- in cents
    average_customer_value INTEGER DEFAULT 0, -- in cents
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    churn_rate NUMERIC(5,2) DEFAULT 0,
    last_referral_at TIMESTAMP WITH TIME ZONE,
    last_conversion_at TIMESTAMP WITH TIME ZONE,
    last_payout_at TIMESTAMP WITH TIME ZONE,
    current_month_earnings INTEGER DEFAULT 0, -- in cents
    last_month_earnings INTEGER DEFAULT 0, -- in cents
    lifetime_earnings INTEGER DEFAULT 0, -- in cents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for statistics
CREATE INDEX idx_partner_statistics_partner ON partner_statistics(partner_id);

-- =====================================================
-- PARTNER RESOURCES TABLE
-- Marketing materials and resources for partners
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('email_template', 'social_post', 'document', 'video', 'image', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- For text-based resources
    file_url TEXT, -- For file-based resources
    file_size INTEGER,
    mime_type TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for resources
CREATE INDEX idx_partner_resources_type ON partner_resources(resource_type);
CREATE INDEX idx_partner_resources_active ON partner_resources(is_active);

-- =====================================================
-- PARTNER RESOURCE DOWNLOADS TABLE
-- Track resource downloads by partners
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_resource_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES partner_resources(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for downloads
CREATE INDEX idx_partner_downloads_partner ON partner_resource_downloads(partner_id);
CREATE INDEX idx_partner_downloads_resource ON partner_resource_downloads(resource_id);

-- =====================================================
-- PARTNER ACTIVITY LOGS TABLE
-- Track all partner activities
-- =====================================================
CREATE TABLE IF NOT EXISTS partner_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for activity logs
CREATE INDEX idx_partner_activity_partner ON partner_activity_logs(partner_id);
CREATE INDEX idx_partner_activity_type ON partner_activity_logs(activity_type);
CREATE INDEX idx_partner_activity_date ON partner_activity_logs(created_at);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Generate unique partner referral code
CREATE OR REPLACE FUNCTION generate_partner_referral_code(partner_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_code TEXT;
    final_code TEXT;
    counter INTEGER := 0;
BEGIN
    -- Clean the partner name and create base code
    base_code := LOWER(REGEXP_REPLACE(partner_name, '[^a-zA-Z0-9]', '', 'g'));
    base_code := SUBSTRING(base_code, 1, 10);

    -- Add random suffix
    final_code := base_code || SUBSTRING(MD5(RANDOM()::TEXT), 1, 4);

    -- Check for uniqueness and regenerate if needed
    WHILE EXISTS (SELECT 1 FROM partners WHERE referral_code = final_code) LOOP
        counter := counter + 1;
        final_code := base_code || SUBSTRING(MD5(RANDOM()::TEXT || counter), 1, 4);

        -- Prevent infinite loop
        IF counter > 100 THEN
            final_code := 'partner' || SUBSTRING(MD5(RANDOM()::TEXT || NOW()), 1, 8);
            EXIT;
        END IF;
    END LOOP;

    RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Calculate partner tier based on performance
CREATE OR REPLACE FUNCTION calculate_partner_tier(p_partner_id UUID)
RETURNS TEXT AS $$
DECLARE
    active_referrals INTEGER;
    new_tier TEXT;
BEGIN
    -- Count active customers referred by this partner
    SELECT COUNT(*)
    INTO active_referrals
    FROM partner_referrals
    WHERE partner_id = p_partner_id
    AND status = 'active';

    -- Determine tier based on performance
    IF active_referrals >= 10 THEN
        new_tier := 'premium';
    ELSE
        new_tier := 'standard';
    END IF;

    -- Update partner tier
    UPDATE partners
    SET tier = new_tier,
        commission_rate = CASE
            WHEN new_tier = 'premium' THEN 0.30
            ELSE 0.25
        END
    WHERE id = p_partner_id;

    RETURN new_tier;
END;
$$ LANGUAGE plpgsql;

-- Update partner statistics
CREATE OR REPLACE FUNCTION update_partner_statistics(p_partner_id UUID)
RETURNS void AS $$
BEGIN
    -- Update or insert partner statistics
    INSERT INTO partner_statistics (
        partner_id,
        total_clicks,
        total_signups,
        total_trials,
        total_customers,
        active_customers,
        churned_customers,
        total_revenue_generated,
        total_commission_earned,
        total_commission_paid,
        total_commission_pending,
        total_commission_approved,
        conversion_rate,
        churn_rate,
        updated_at
    )
    SELECT
        p_partner_id,
        (SELECT COUNT(*) FROM partner_clicks WHERE partner_id = p_partner_id),
        (SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status != 'clicked'),
        (SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status IN ('trial', 'active', 'churned')),
        (SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status IN ('active', 'churned')),
        (SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status = 'active'),
        (SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status = 'churned'),
        COALESCE((SELECT SUM(lifetime_value) FROM partner_referrals WHERE partner_id = p_partner_id), 0),
        COALESCE((SELECT SUM(amount_cents) FROM partner_commissions WHERE partner_id = p_partner_id AND status != 'reversed'), 0),
        COALESCE((SELECT SUM(amount_cents) FROM partner_commissions WHERE partner_id = p_partner_id AND status = 'paid'), 0),
        COALESCE((SELECT SUM(amount_cents) FROM partner_commissions WHERE partner_id = p_partner_id AND status = 'pending'), 0),
        COALESCE((SELECT SUM(amount_cents) FROM partner_commissions WHERE partner_id = p_partner_id AND status = 'approved'), 0),
        CASE
            WHEN (SELECT COUNT(*) FROM partner_clicks WHERE partner_id = p_partner_id) > 0
            THEN ((SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status = 'active')::NUMERIC /
                  (SELECT COUNT(*) FROM partner_clicks WHERE partner_id = p_partner_id)::NUMERIC * 100)
            ELSE 0
        END,
        CASE
            WHEN (SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status IN ('active', 'churned')) > 0
            THEN ((SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status = 'churned')::NUMERIC /
                  (SELECT COUNT(*) FROM partner_referrals WHERE partner_id = p_partner_id AND status IN ('active', 'churned'))::NUMERIC * 100)
            ELSE 0
        END,
        NOW()
    ON CONFLICT (partner_id) DO UPDATE
    SET
        total_clicks = EXCLUDED.total_clicks,
        total_signups = EXCLUDED.total_signups,
        total_trials = EXCLUDED.total_trials,
        total_customers = EXCLUDED.total_customers,
        active_customers = EXCLUDED.active_customers,
        churned_customers = EXCLUDED.churned_customers,
        total_revenue_generated = EXCLUDED.total_revenue_generated,
        total_commission_earned = EXCLUDED.total_commission_earned,
        total_commission_paid = EXCLUDED.total_commission_paid,
        total_commission_pending = EXCLUDED.total_commission_pending,
        total_commission_approved = EXCLUDED.total_commission_approved,
        conversion_rate = EXCLUDED.conversion_rate,
        churn_rate = EXCLUDED.churn_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_referrals_updated_at BEFORE UPDATE ON partner_referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_payouts_updated_at BEFORE UPDATE ON partner_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_resources_updated_at BEFORE UPDATE ON partner_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_statistics_updated_at BEFORE UPDATE ON partner_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all partner tables
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_resource_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_activity_logs ENABLE ROW LEVEL SECURITY;

-- Partner can only see their own data
CREATE POLICY "Partners can view own data" ON partners
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Partners can view own referrals" ON partner_referrals
    FOR SELECT USING (
        partner_id IN (
            SELECT id FROM partners WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Partners can view own commissions" ON partner_commissions
    FOR SELECT USING (
        partner_id IN (
            SELECT id FROM partners WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Partners can view own payouts" ON partner_payouts
    FOR SELECT USING (
        partner_id IN (
            SELECT id FROM partners WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Partners can view own statistics" ON partner_statistics
    FOR SELECT USING (
        partner_id IN (
            SELECT id FROM partners WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Public can submit applications
CREATE POLICY "Public can submit partner applications" ON partner_applications
    FOR INSERT WITH CHECK (true);

-- Partners can view resources
CREATE POLICY "Active partners can view resources" ON partner_resources
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM partners
            WHERE email = auth.jwt() ->> 'email'
            AND status = 'active'
        )
    );

-- Admin policies (assuming you have an admin role check function)
CREATE POLICY "Admins can manage all partner data" ON partners
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'admin' OR
        EXISTS (
            SELECT 1 FROM user_organizations
            WHERE user_id = auth.uid()
            AND role = 'owner'
        )
    );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX idx_partner_commissions_partner_status ON partner_commissions(partner_id, status);
CREATE INDEX idx_partner_commissions_partner_month ON partner_commissions(partner_id, month);
CREATE INDEX idx_partner_referrals_partner_status ON partner_referrals(partner_id, status);
CREATE INDEX idx_partner_clicks_partner_date ON partner_clicks(partner_id, clicked_at);
CREATE INDEX idx_partner_payouts_partner_status ON partner_payouts(partner_id, status);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default partner resources
INSERT INTO partner_resources (resource_type, title, description, content, category, is_active) VALUES
('email_template', 'Introduction Email', 'Introduce LoadVoice to your clients',
'Subject: Tool I''ve been recommending to my clients

Hey [Client Name],

Quick note. I''ve been working with a tool called LoadVoice that I think would save your sales team serious time.

It automatically extracts CRM data from sales calls. Your reps upload a call recording, AI pulls out all the key details (pain points, budget, timeline, next steps), and they paste it into [CRM] in 60 seconds instead of 20 minutes.

Worth checking out: [YOUR REFERRAL LINK]

Let me know if you want me to walk you through it.

[Your Name]',
'email', true),

('email_template', 'Follow-up Email', 'Follow up with interested prospects',
'Subject: Following up on LoadVoice

Hi [Client Name],

Just wanted to follow up on our conversation about LoadVoice.

Have you had a chance to check it out? I''ve seen it save my other clients 15-20 hours per week on CRM updates.

Happy to jump on a quick call to show you how it works if that would be helpful.

[YOUR REFERRAL LINK]

Best,
[Your Name]',
'email', true),

('social_post', 'LinkedIn Post', 'Share on LinkedIn',
'Sales reps spend 2+ hours/day on CRM updates. Most just... don''t do it. That''s why CRM data is always garbage.

Found a tool that cuts this to 60 seconds. Upload call → AI extracts everything → paste into CRM.

Worth checking out if you''re tired of fighting your team on data hygiene: [YOUR LINK]

#sales #CRM #productivity',
'social', true);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;