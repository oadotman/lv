-- =====================================================
-- WORKING MONTHLY USAGE RESET - Based on Actual Schema
-- Date: January 9, 2026
-- =====================================================

-- Add column to track current month (since it doesn't exist)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS usage_current_month TEXT DEFAULT '2026-01';

-- Check if usage_logs table exists, if not create it
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  minutes_used INTEGER NOT NULL,
  is_overage BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  month_year TEXT NOT NULL DEFAULT '2026-01'
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_usage_logs_org ON public.usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_month ON public.usage_logs(month_year);

-- Enable RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their org usage
DROP POLICY IF EXISTS "Users can view their org usage" ON public.usage_logs;
CREATE POLICY "Users can view their org usage" ON public.usage_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Reset all organizations to January 2026
UPDATE public.organizations
SET
  usage_minutes_current = 0,
  usage_current_month = '2026-01',
  usage_reset_at = '2026-02-01 00:00:00+00'::TIMESTAMP WITH TIME ZONE;

-- If there are existing usage logs, recalculate for January 2026 only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.usage_logs WHERE month_year = '2026-01' LIMIT 1) THEN
    UPDATE public.organizations o
    SET usage_minutes_current = (
      SELECT COALESCE(SUM(ul.minutes_used), 0)
      FROM public.usage_logs ul
      WHERE ul.organization_id = o.id
      AND ul.month_year = '2026-01'
    );
  END IF;
END $$;

-- Create function to log usage with monthly reset
CREATE OR REPLACE FUNCTION log_call_usage(
  p_call_id UUID,
  p_duration_minutes INTEGER
) RETURNS void AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_current_month TEXT;
  v_org_month TEXT;
  v_limit INTEGER;
  v_current_usage INTEGER;
BEGIN
  -- Get org and user from call
  SELECT organization_id, user_id
  INTO v_org_id, v_user_id
  FROM public.calls
  WHERE id = p_call_id;

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Get current month
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get organization's current month and usage
  SELECT usage_current_month, usage_minutes_current, usage_minutes_limit
  INTO v_org_month, v_current_usage, v_limit
  FROM public.organizations
  WHERE id = v_org_id;

  -- Check if we need to reset for a new month
  IF v_org_month IS NULL OR v_org_month < v_current_month THEN
    UPDATE public.organizations
    SET
      usage_minutes_current = 0,
      usage_current_month = v_current_month,
      usage_reset_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE
    WHERE id = v_org_id;

    v_current_usage := 0;
  END IF;

  -- Log the usage
  INSERT INTO public.usage_logs (
    organization_id,
    user_id,
    call_id,
    minutes_used,
    is_overage,
    month_year
  ) VALUES (
    v_org_id,
    v_user_id,
    p_call_id,
    p_duration_minutes,
    (v_current_usage + p_duration_minutes) > COALESCE(v_limit, 30),
    v_current_month
  );

  -- Update organization's current usage
  UPDATE public.organizations
  SET usage_minutes_current = usage_minutes_current + p_duration_minutes
  WHERE id = v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate overage
CREATE OR REPLACE FUNCTION calculate_overage(
  p_organization_id UUID
) RETURNS TABLE (
  minutes_used INTEGER,
  minutes_limit INTEGER,
  overage_minutes INTEGER,
  overage_charge DECIMAL(10,2),
  current_month TEXT,
  days_remaining INTEGER
) AS $$
DECLARE
  v_current_month TEXT;
  v_org_month TEXT;
  v_days_remaining INTEGER;
BEGIN
  -- Get current month
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Calculate days remaining in month
  SELECT EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER
         - EXTRACT(DAY FROM CURRENT_DATE)::INTEGER + 1
  INTO v_days_remaining;

  -- Get organization's tracking month
  SELECT usage_current_month INTO v_org_month
  FROM public.organizations
  WHERE id = p_organization_id;

  -- If org is on old month, reset and return zeros
  IF v_org_month IS NULL OR v_org_month < v_current_month THEN
    -- Reset the organization
    UPDATE public.organizations
    SET
      usage_minutes_current = 0,
      usage_current_month = v_current_month,
      usage_reset_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE
    WHERE id = p_organization_id;

    -- Return zeros for fresh month
    RETURN QUERY
    SELECT
      0::INTEGER as minutes_used,
      COALESCE(o.usage_minutes_limit, 30) as minutes_limit,
      0::INTEGER as overage_minutes,
      0.00::DECIMAL(10,2) as overage_charge,
      v_current_month as current_month,
      v_days_remaining as days_remaining
    FROM public.organizations o
    WHERE o.id = p_organization_id;
  ELSE
    -- Return current usage
    RETURN QUERY
    SELECT
      COALESCE(o.usage_minutes_current, 0) as minutes_used,
      COALESCE(o.usage_minutes_limit, 30) as minutes_limit,
      GREATEST(0, COALESCE(o.usage_minutes_current, 0) - COALESCE(o.usage_minutes_limit, 30)) as overage_minutes,
      (GREATEST(0, COALESCE(o.usage_minutes_current, 0) - COALESCE(o.usage_minutes_limit, 30)) * 0.20)::DECIMAL(10,2) as overage_charge,
      v_current_month as current_month,
      v_days_remaining as days_remaining
    FROM public.organizations o
    WHERE o.id = p_organization_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually reset all organizations for new month
CREATE OR REPLACE FUNCTION reset_all_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  v_current_month TEXT;
  v_reset_count INTEGER;
BEGIN
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Reset organizations on old months
  UPDATE public.organizations
  SET
    usage_minutes_current = 0,
    usage_current_month = v_current_month,
    usage_reset_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE
  WHERE usage_current_month < v_current_month
     OR usage_current_month IS NULL;

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_call_usage TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_overage TO authenticated;
GRANT EXECUTE ON FUNCTION reset_all_monthly_usage TO authenticated;

-- Create a simple view for usage monitoring
CREATE OR REPLACE VIEW public.usage_summary AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  o.subscription_plan,
  COALESCE(o.usage_minutes_current, 0) as minutes_used,
  COALESCE(o.usage_minutes_limit, 30) as minutes_limit,
  CASE
    WHEN o.usage_current_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    THEN COALESCE(o.usage_minutes_current, 0)
    ELSE 0
  END as minutes_this_month,
  GREATEST(0, COALESCE(o.usage_minutes_current, 0) - COALESCE(o.usage_minutes_limit, 30)) as overage_minutes,
  (GREATEST(0, COALESCE(o.usage_minutes_current, 0) - COALESCE(o.usage_minutes_limit, 30)) * 0.20)::DECIMAL(10,2) as overage_charge,
  o.usage_current_month as tracking_month,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM') as current_month,
  o.usage_reset_at as next_reset,
  CASE
    WHEN COALESCE(o.usage_current_month, '') < TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN 'needs_reset'
    WHEN COALESCE(o.usage_minutes_current, 0) >= COALESCE(o.usage_minutes_limit, 30) THEN 'overage'
    WHEN COALESCE(o.usage_minutes_current, 0) >= COALESCE(o.usage_minutes_limit, 30) * 0.9 THEN 'warning'
    ELSE 'ok'
  END as status
FROM public.organizations o;

-- Grant select on view
GRANT SELECT ON public.usage_summary TO authenticated;

-- Update usage limits based on subscription plans
UPDATE public.organizations
SET usage_minutes_limit = CASE subscription_plan
  WHEN 'free' THEN 30
  WHEN 'solo' THEN 500
  WHEN 'starter' THEN 1500
  WHEN 'professional' THEN 4000
  WHEN 'enterprise' THEN 15000
  WHEN 'custom' THEN 999999
  ELSE 30
END
WHERE usage_minutes_limit IS NULL OR usage_minutes_limit = 0;

-- =====================================================
-- VERIFICATION: Run this after migration
-- =====================================================
-- SELECT
--   name,
--   usage_current_month,
--   usage_minutes_current,
--   usage_minutes_limit,
--   usage_reset_at
-- FROM organizations
-- LIMIT 5;
-- =====================================================