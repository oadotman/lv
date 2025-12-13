-- =====================================================
-- REFERRAL SYSTEM DATABASE MIGRATION
-- Version: 1.0
-- Description: Adds comprehensive referral system with tiered rewards
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. REFERRALS TABLE - Main tracking table
-- =====================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_email TEXT NOT NULL CHECK (referred_email = LOWER(referred_email)),
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_type TEXT DEFAULT 'calliq' CHECK (product_type IN ('calliq', 'synqall', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'clicked', 'signed_up', 'active', 'rewarded', 'expired', 'cancelled')),
  signup_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  reward_tier INTEGER DEFAULT 0,
  reward_minutes INTEGER DEFAULT 0,
  reward_credits_cents INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  referred_plan_type TEXT,
  referred_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_referral_per_email_product UNIQUE(referred_email, product_type),
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_user_id OR referred_user_id IS NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_email ON referrals(referred_email);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_org ON referrals(organization_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created ON referrals(created_at DESC);

-- =====================================================
-- 2. REFERRAL_REWARDS TABLE - Tracks rewards earned
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('minutes', 'credits', 'both')),
  reward_minutes INTEGER DEFAULT 0,
  reward_credits_cents INTEGER DEFAULT 0,
  tier_reached INTEGER NOT NULL,
  tier_name TEXT,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  applied_to_account BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON referral_rewards(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_claimed ON referral_rewards(claimed);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_expires ON referral_rewards(expires_at);

-- =====================================================
-- 3. REFERRAL_STATISTICS TABLE - Aggregated stats
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  total_referrals_sent INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_active INTEGER DEFAULT 0,
  total_rewarded INTEGER DEFAULT 0,
  current_tier INTEGER DEFAULT 0,
  next_tier INTEGER DEFAULT 1,
  referrals_to_next_tier INTEGER DEFAULT 1,
  total_minutes_earned INTEGER DEFAULT 0,
  total_credits_earned_cents INTEGER DEFAULT 0,
  total_minutes_claimed INTEGER DEFAULT 0,
  total_credits_claimed_cents INTEGER DEFAULT 0,
  available_minutes INTEGER DEFAULT 0,
  available_credits_cents INTEGER DEFAULT 0,
  last_referral_date TIMESTAMPTZ,
  last_reward_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_stats_per_user UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_statistics_user ON referral_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_statistics_org ON referral_statistics(organization_id);

-- =====================================================
-- 4. REFERRAL_TIERS TABLE - Configuration for reward tiers
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_level INTEGER NOT NULL UNIQUE,
  tier_name TEXT NOT NULL,
  referrals_required INTEGER NOT NULL,
  reward_minutes INTEGER DEFAULT 0,
  reward_credits_cents INTEGER DEFAULT 0,
  is_cumulative BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tier configuration
INSERT INTO referral_tiers (tier_level, tier_name, referrals_required, reward_minutes, reward_credits_cents, description)
VALUES
  (1, 'Bronze', 1, 60, 0, 'Your first successful referral'),
  (2, 'Silver', 3, 200, 0, 'Growing your network'),
  (3, 'Gold', 5, 500, 5000, 'Referral champion'),
  (4, 'Platinum', 10, 1000, 10000, 'Referral master')
ON CONFLICT (tier_level) DO NOTHING;

-- =====================================================
-- 5. REFERRAL_CLICK_TRACKING TABLE - Track link clicks
-- =====================================================
CREATE TABLE IF NOT EXISTS referral_click_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_click_tracking_code ON referral_click_tracking(referral_code);
CREATE INDEX IF NOT EXISTS idx_click_tracking_created ON referral_click_tracking(created_at DESC);

-- =====================================================
-- 6. Add referral tracking columns to organizations table
-- =====================================================
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS referral_code_used TEXT,
ADD COLUMN IF NOT EXISTS referral_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bonus_minutes_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_credits_balance_cents INTEGER DEFAULT 0;

-- =====================================================
-- 7. FUNCTIONS FOR REFERRAL SYSTEM
-- =====================================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate code: first 4 chars of user_id + random 6 chars
    code := UPPER(SUBSTRING(user_id::TEXT, 1, 4) || SUBSTRING(md5(random()::text), 1, 6));

    -- Check if code exists
    SELECT COUNT(*) INTO exists_check FROM referrals WHERE referral_code = code;

    EXIT WHEN exists_check = 0;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate reward tier
CREATE OR REPLACE FUNCTION calculate_reward_tier(successful_referrals INTEGER)
RETURNS TABLE(
  tier INTEGER,
  tier_name TEXT,
  minutes_reward INTEGER,
  credits_reward INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tier_level,
    referral_tiers.tier_name,
    reward_minutes,
    reward_credits_cents
  FROM referral_tiers
  WHERE referrals_required <= successful_referrals
  ORDER BY tier_level DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to process referral reward
CREATE OR REPLACE FUNCTION process_referral_reward(p_referral_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
  v_organization_id UUID;
  v_current_tier INTEGER;
  v_new_tier INTEGER;
  v_tier_name TEXT;
  v_minutes_reward INTEGER;
  v_credits_reward INTEGER;
  v_total_successful INTEGER;
BEGIN
  -- Get referral details
  SELECT referrer_id, organization_id
  INTO v_referrer_id, v_organization_id
  FROM referrals
  WHERE id = p_referral_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Count total successful referrals
  SELECT COUNT(*)
  INTO v_total_successful
  FROM referrals
  WHERE referrer_id = v_referrer_id
    AND status IN ('active', 'rewarded');

  -- Get current tier from statistics
  SELECT current_tier
  INTO v_current_tier
  FROM referral_statistics
  WHERE user_id = v_referrer_id;

  -- Calculate new tier and rewards
  SELECT tier, tier_name, minutes_reward, credits_reward
  INTO v_new_tier, v_tier_name, v_minutes_reward, v_credits_reward
  FROM calculate_reward_tier(v_total_successful);

  -- Only give rewards if new tier is higher (cumulative system)
  IF v_new_tier > COALESCE(v_current_tier, 0) THEN
    -- Create reward record
    INSERT INTO referral_rewards (
      user_id, organization_id, referral_id, reward_type,
      reward_minutes, reward_credits_cents, tier_reached, tier_name
    ) VALUES (
      v_referrer_id, v_organization_id, p_referral_id,
      CASE
        WHEN v_credits_reward > 0 AND v_minutes_reward > 0 THEN 'both'
        WHEN v_credits_reward > 0 THEN 'credits'
        ELSE 'minutes'
      END,
      v_minutes_reward, v_credits_reward, v_new_tier, v_tier_name
    );

    -- Update referral record
    UPDATE referrals
    SET
      status = 'rewarded',
      rewarded_at = NOW(),
      reward_tier = v_new_tier,
      reward_minutes = v_minutes_reward,
      reward_credits_cents = v_credits_reward,
      updated_at = NOW()
    WHERE id = p_referral_id;

    -- Update or insert statistics
    INSERT INTO referral_statistics (
      user_id, organization_id, current_tier, total_rewarded,
      total_minutes_earned, total_credits_earned_cents,
      available_minutes, available_credits_cents, last_reward_date
    ) VALUES (
      v_referrer_id, v_organization_id, v_new_tier, 1,
      v_minutes_reward, v_credits_reward,
      v_minutes_reward, v_credits_reward, NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      current_tier = v_new_tier,
      total_rewarded = referral_statistics.total_rewarded + 1,
      total_minutes_earned = referral_statistics.total_minutes_earned + v_minutes_reward,
      total_credits_earned_cents = referral_statistics.total_credits_earned_cents + v_credits_reward,
      available_minutes = referral_statistics.available_minutes + v_minutes_reward,
      available_credits_cents = referral_statistics.available_credits_cents + v_credits_reward,
      last_reward_date = NOW(),
      updated_at = NOW();

    -- Add bonus to organization balance
    UPDATE organizations
    SET
      bonus_minutes_balance = COALESCE(bonus_minutes_balance, 0) + v_minutes_reward,
      bonus_credits_balance_cents = COALESCE(bonus_credits_balance_cents, 0) + v_credits_reward,
      updated_at = NOW()
    WHERE id = v_organization_id;

    RETURN TRUE;
  END IF;

  -- Mark as rewarded even if no new tier reached
  UPDATE referrals
  SET status = 'rewarded', rewarded_at = NOW(), updated_at = NOW()
  WHERE id = p_referral_id;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger to update statistics on referral status change
CREATE OR REPLACE FUNCTION update_referral_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update statistics based on status change
  IF NEW.status != OLD.status THEN
    -- Update or create statistics record
    INSERT INTO referral_statistics (user_id, organization_id)
    VALUES (NEW.referrer_id, NEW.organization_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update counts based on new status
    IF NEW.status = 'signed_up' AND OLD.status != 'signed_up' THEN
      UPDATE referral_statistics
      SET total_signups = total_signups + 1, updated_at = NOW()
      WHERE user_id = NEW.referrer_id;
    ELSIF NEW.status = 'active' AND OLD.status != 'active' THEN
      UPDATE referral_statistics
      SET total_active = total_active + 1, updated_at = NOW()
      WHERE user_id = NEW.referrer_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_statistics
AFTER UPDATE ON referrals
FOR EACH ROW
EXECUTE FUNCTION update_referral_statistics();

-- =====================================================
-- 9. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on tables
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_click_tracking ENABLE ROW LEVEL SECURITY;

-- Referrals policies
CREATE POLICY "Users can view their own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referrals" ON referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update their own referrals" ON referrals
  FOR UPDATE USING (auth.uid() = referrer_id);

-- Referral rewards policies
CREATE POLICY "Users can view their own rewards" ON referral_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create rewards" ON referral_rewards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own rewards" ON referral_rewards
  FOR UPDATE USING (auth.uid() = user_id);

-- Referral statistics policies
CREATE POLICY "Users can view their own statistics" ON referral_statistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage statistics" ON referral_statistics
  FOR ALL USING (true);

-- Referral tiers policies (read-only for all authenticated users)
CREATE POLICY "All users can view tiers" ON referral_tiers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Click tracking policies
CREATE POLICY "Public can insert click tracking" ON referral_click_tracking
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view click tracking" ON referral_click_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 10. INITIAL DATA AND INDEXES
-- =====================================================

-- Create initial statistics for existing users
INSERT INTO referral_statistics (user_id, organization_id)
SELECT DISTINCT u.id, uo.organization_id
FROM auth.users u
JOIN user_organizations uo ON u.id = uo.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Add audit log entry for migration
INSERT INTO audit_logs (user_id, action, resource_type, metadata)
VALUES (
  NULL,
  'migration:referral_system',
  'database',
  jsonb_build_object(
    'version', '1.0',
    'tables_created', ARRAY['referrals', 'referral_rewards', 'referral_statistics', 'referral_tiers', 'referral_click_tracking'],
    'timestamp', NOW()
  )
);