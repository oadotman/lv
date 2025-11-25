-- =====================================================
-- OVERAGE SYSTEM MIGRATION
-- Adds support for Paddle payments and overage tracking
-- =====================================================
-- Version: 1.0
-- Date: November 21, 2025
-- =====================================================

-- Add Paddle payment fields to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS overage_minutes_purchased INTEGER DEFAULT 0 CHECK (overage_minutes_purchased >= 0);

-- Create index on Paddle fields for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_paddle_customer ON organizations(paddle_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_paddle_subscription ON organizations(paddle_subscription_id);

-- Add comments for documentation
COMMENT ON COLUMN organizations.paddle_customer_id IS 'Paddle customer ID for payment processing';
COMMENT ON COLUMN organizations.paddle_subscription_id IS 'Paddle subscription ID for active subscription';
COMMENT ON COLUMN organizations.overage_minutes_purchased IS 'Additional minutes purchased as overage packs, reset at billing period renewal';

-- Create usage_metrics table for tracking overage purchases and billing
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('overage_pack_purchased', 'overage_billed', 'usage_warning', 'limit_reached')),
  metric_value NUMERIC NOT NULL,
  cost_cents INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for usage metrics
CREATE INDEX IF NOT EXISTS idx_usage_metrics_org ON usage_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_type ON usage_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_created ON usage_metrics(created_at DESC);

-- Add comments
COMMENT ON TABLE usage_metrics IS 'Tracks overage pack purchases, billing events, and usage warnings';
COMMENT ON COLUMN usage_metrics.metric_type IS 'Type of usage event: overage_pack_purchased, overage_billed, usage_warning, limit_reached';
COMMENT ON COLUMN usage_metrics.metric_value IS 'Numeric value (e.g., minutes purchased, minutes billed)';
COMMENT ON COLUMN usage_metrics.cost_cents IS 'Cost in cents (for purchases and billing events)';

-- Enable RLS on usage_metrics
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Organization members can view their usage metrics
CREATE POLICY "Users can view their organization's usage metrics"
ON usage_metrics
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_organizations
    WHERE user_id = auth.uid()
  )
);

-- RLS Policy: Only system can insert usage metrics (via service role)
CREATE POLICY "System can insert usage metrics"
ON usage_metrics
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Add audit log for migration
INSERT INTO audit_logs (action, resource_type, metadata)
VALUES (
  'migration_applied',
  'database',
  jsonb_build_object(
    'migration', '003_ADD_OVERAGE_SYSTEM',
    'description', 'Added Paddle payment fields and overage tracking system',
    'timestamp', NOW()
  )
);
