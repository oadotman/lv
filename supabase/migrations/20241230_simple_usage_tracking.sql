-- =====================================================
-- SIMPLE USAGE TRACKING
-- Just track minutes used per organization per month
-- =====================================================

-- Add simple usage tracking columns to organizations if not exists
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS usage_minutes_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_minutes_limit INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS usage_reset_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 month';

-- Simple usage log table
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References auth.users
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,

  -- Usage info
  minutes_used INTEGER NOT NULL,
  is_overage BOOLEAN DEFAULT false,

  -- When
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  month_year TEXT GENERATED ALWAYS AS (TO_CHAR(created_at, 'YYYY-MM')) STORED
);

-- Create indexes
CREATE INDEX idx_usage_logs_org ON public.usage_logs(organization_id);
CREATE INDEX idx_usage_logs_user ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_month ON public.usage_logs(month_year);

-- Enable RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their organization's usage
CREATE POLICY "Users can view their org usage" ON public.usage_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Simple function to log usage
CREATE OR REPLACE FUNCTION log_call_usage(
  p_call_id UUID,
  p_duration_minutes INTEGER
) RETURNS void AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_current_usage INTEGER;
  v_limit INTEGER;
  v_is_overage BOOLEAN;
BEGIN
  -- Get org and user from call
  SELECT organization_id, user_id
  INTO v_org_id, v_user_id
  FROM public.calls
  WHERE id = p_call_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Get current usage and limit
  SELECT usage_minutes_current, usage_minutes_limit
  INTO v_current_usage, v_limit
  FROM public.organizations
  WHERE id = v_org_id;

  -- Check if this will be overage
  v_is_overage := (v_current_usage + p_duration_minutes) > v_limit;

  -- Log the usage
  INSERT INTO public.usage_logs (
    organization_id,
    user_id,
    call_id,
    minutes_used,
    is_overage
  ) VALUES (
    v_org_id,
    v_user_id,
    p_call_id,
    p_duration_minutes,
    v_is_overage
  );

  -- Update organization's current usage
  UPDATE public.organizations
  SET usage_minutes_current = usage_minutes_current + p_duration_minutes
  WHERE id = v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_call_usage TO authenticated;

-- Simple function to calculate overage for billing
CREATE OR REPLACE FUNCTION calculate_overage(
  p_organization_id UUID
) RETURNS TABLE (
  minutes_used INTEGER,
  minutes_limit INTEGER,
  overage_minutes INTEGER,
  overage_charge DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.usage_minutes_current as minutes_used,
    o.usage_minutes_limit as minutes_limit,
    GREATEST(0, o.usage_minutes_current - o.usage_minutes_limit) as overage_minutes,
    GREATEST(0, o.usage_minutes_current - o.usage_minutes_limit) * 0.20 as overage_charge
  FROM public.organizations o
  WHERE o.id = p_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_overage TO authenticated;

-- Simple function to reset monthly usage (run via cron job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.organizations
  SET
    usage_minutes_current = 0,
    usage_reset_date = CURRENT_DATE + INTERVAL '1 month'
  WHERE usage_reset_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for simple usage dashboard
CREATE OR REPLACE VIEW public.usage_summary AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  o.subscription_plan,
  o.usage_minutes_current,
  o.usage_minutes_limit,
  GREATEST(0, o.usage_minutes_current - o.usage_minutes_limit) as overage_minutes,
  GREATEST(0, o.usage_minutes_current - o.usage_minutes_limit) * 0.20 as overage_charge,
  ROUND((o.usage_minutes_current::NUMERIC / NULLIF(o.usage_minutes_limit, 0) * 100), 1) as usage_percentage,
  o.usage_reset_date,
  CASE
    WHEN o.usage_minutes_current >= o.usage_minutes_limit THEN 'overage'
    WHEN o.usage_minutes_current >= o.usage_minutes_limit * 0.9 THEN 'warning'
    ELSE 'ok'
  END as usage_status
FROM public.organizations o;

-- Grant permissions
GRANT SELECT ON public.usage_summary TO authenticated;

-- Update usage limits based on plan (run when plan changes)
CREATE OR REPLACE FUNCTION update_usage_limit_for_plan()
RETURNS TRIGGER AS $$
BEGIN
  -- Update limit based on new plan
  NEW.usage_minutes_limit := CASE NEW.subscription_plan
    WHEN 'free' THEN 30
    WHEN 'solo' THEN 500
    WHEN 'starter' THEN 1500
    WHEN 'professional' THEN 4000
    WHEN 'enterprise' THEN 15000
    WHEN 'custom' THEN 999999
    ELSE 30
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update limits when plan changes
CREATE TRIGGER update_usage_on_plan_change
  BEFORE UPDATE OF subscription_plan ON public.organizations
  FOR EACH ROW
  WHEN (OLD.subscription_plan IS DISTINCT FROM NEW.subscription_plan)
  EXECUTE FUNCTION update_usage_limit_for_plan();

-- =====================================================
-- That's it! Simple usage tracking:
-- 1. Log minutes when calls complete
-- 2. Track if it's overage
-- 3. Calculate overage charge at $0.20/min
-- 4. Reset monthly
-- =====================================================