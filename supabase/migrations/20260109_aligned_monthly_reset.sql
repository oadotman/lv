-- =====================================================
-- ALIGNED MONTHLY USAGE RESET - Perfectly Matched to LoadVoice App
-- Date: January 9, 2026
-- =====================================================

-- Add column to track current month (if it doesn't exist)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS usage_current_month TEXT;

-- Set all organizations to January 2026 and reset usage
UPDATE public.organizations
SET
  usage_minutes_current = 0,
  usage_current_month = '2026-01',
  usage_reset_at = '2026-02-01 00:00:00+00'::TIMESTAMP WITH TIME ZONE;

-- Ensure usage_logs table exists with correct structure
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  minutes_used INTEGER NOT NULL,
  is_overage BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  month_year TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_logs_org ON public.usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_month ON public.usage_logs(month_year);
CREATE INDEX IF NOT EXISTS idx_usage_logs_call ON public.usage_logs(call_id);

-- Enable RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for users to view their org's usage
DROP POLICY IF EXISTS "Users can view their org usage" ON public.usage_logs;
CREATE POLICY "Users can view their org usage" ON public.usage_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Recalculate January 2026 usage from existing logs
DO $$
BEGIN
  -- First check if we have any January 2026 logs
  IF EXISTS (SELECT 1 FROM public.usage_logs WHERE month_year = '2026-01' LIMIT 1) THEN
    -- Update each organization with their January total
    UPDATE public.organizations o
    SET usage_minutes_current = (
      SELECT COALESCE(SUM(ul.minutes_used), 0)
      FROM public.usage_logs ul
      WHERE ul.organization_id = o.id
      AND ul.month_year = '2026-01'
    );
  ELSE
    -- If no January logs exist, check calls table for January 2026 calls
    IF EXISTS (
      SELECT 1 FROM public.calls
      WHERE created_at >= '2026-01-01'::TIMESTAMP
      AND created_at < '2026-02-01'::TIMESTAMP
      AND status = 'completed'
      LIMIT 1
    ) THEN
      -- Calculate from completed calls in January
      UPDATE public.organizations o
      SET usage_minutes_current = (
        SELECT COALESCE(SUM(CEIL(c.duration / 60.0)), 0)::INTEGER
        FROM public.calls c
        WHERE c.organization_id = o.id
        AND c.created_at >= '2026-01-01'::TIMESTAMP
        AND c.created_at < '2026-02-01'::TIMESTAMP
        AND c.status = 'completed'
        AND c.duration IS NOT NULL
      );
    END IF;
  END IF;
END $$;

-- Create or replace the log_call_usage function (aligned with app logic)
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
  v_is_overage BOOLEAN;
BEGIN
  -- Get org and user from call
  SELECT organization_id, user_id
  INTO v_org_id, v_user_id
  FROM public.calls
  WHERE id = p_call_id;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Call % has no organization', p_call_id;
    RETURN;
  END IF;

  -- Get current month in YYYY-MM format
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Get organization's current tracking month and usage
  SELECT usage_current_month, usage_minutes_current, usage_minutes_limit
  INTO v_org_month, v_current_usage, v_limit
  FROM public.organizations
  WHERE id = v_org_id;

  -- Auto-reset if we're in a new month
  IF v_org_month IS NULL OR v_org_month < v_current_month THEN
    RAISE NOTICE 'Resetting org % from month % to %', v_org_id, v_org_month, v_current_month;

    UPDATE public.organizations
    SET
      usage_minutes_current = 0,
      usage_current_month = v_current_month,
      usage_reset_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE
    WHERE id = v_org_id;

    v_current_usage := 0;
  END IF;

  -- Calculate if this usage will be overage
  v_is_overage := (v_current_usage + p_duration_minutes) > COALESCE(v_limit, 60);

  -- Log the usage to audit table
  INSERT INTO public.usage_logs (
    organization_id,
    user_id,
    call_id,
    minutes_used,
    is_overage,
    month_year,
    created_at
  ) VALUES (
    v_org_id,
    v_user_id,
    p_call_id,
    p_duration_minutes,
    v_is_overage,
    v_current_month,
    NOW()
  );

  -- Update organization's current month usage
  UPDATE public.organizations
  SET usage_minutes_current = usage_minutes_current + p_duration_minutes
  WHERE id = v_org_id;

  RAISE NOTICE 'Logged % minutes for org %, new total: %',
    p_duration_minutes, v_org_id, v_current_usage + p_duration_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace calculate_overage function (aligned with app's simple-usage.ts)
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
  v_usage INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get current month
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Calculate days remaining in current month
  SELECT (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
         - CURRENT_DATE::DATE + 1
  INTO v_days_remaining;

  -- Get organization's current tracking month
  SELECT usage_current_month, usage_minutes_current, usage_minutes_limit
  INTO v_org_month, v_usage, v_limit
  FROM public.organizations
  WHERE id = p_organization_id;

  -- Default limit based on plan (60 for free is the app default)
  IF v_limit IS NULL THEN
    v_limit := 60;
  END IF;

  -- If organization is on an old month, reset them first
  IF v_org_month IS NULL OR v_org_month < v_current_month THEN
    -- Reset the organization to current month
    UPDATE public.organizations
    SET
      usage_minutes_current = 0,
      usage_current_month = v_current_month,
      usage_reset_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE
    WHERE id = p_organization_id;

    -- Return zeros for the fresh month
    RETURN QUERY
    SELECT
      0::INTEGER as minutes_used,
      v_limit as minutes_limit,
      0::INTEGER as overage_minutes,
      0.00::DECIMAL(10,2) as overage_charge,
      v_current_month as current_month,
      v_days_remaining as days_remaining;
  ELSE
    -- Return current month's usage
    RETURN QUERY
    SELECT
      COALESCE(v_usage, 0) as minutes_used,
      v_limit as minutes_limit,
      GREATEST(0, COALESCE(v_usage, 0) - v_limit) as overage_minutes,
      (GREATEST(0, COALESCE(v_usage, 0) - v_limit) * 0.20)::DECIMAL(10,2) as overage_charge,
      v_current_month as current_month,
      v_days_remaining as days_remaining;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually reset all organizations (for cron job)
CREATE OR REPLACE FUNCTION reset_all_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  v_current_month TEXT;
  v_reset_count INTEGER;
BEGIN
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  -- Reset organizations that are on old months
  UPDATE public.organizations
  SET
    usage_minutes_current = 0,
    usage_current_month = v_current_month,
    usage_reset_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::TIMESTAMP WITH TIME ZONE
  WHERE usage_current_month < v_current_month
     OR usage_current_month IS NULL;

  GET DIAGNOSTICS v_reset_count = ROW_COUNT;

  RAISE NOTICE 'Reset % organizations to month %', v_reset_count, v_current_month;
  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_call_usage TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_overage TO authenticated;
GRANT EXECUTE ON FUNCTION reset_all_monthly_usage TO authenticated;

-- Create comprehensive usage summary view
CREATE OR REPLACE VIEW public.usage_summary AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  o.subscription_plan,
  CASE
    WHEN o.usage_current_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    THEN COALESCE(o.usage_minutes_current, 0)
    ELSE 0
  END as minutes_used,
  COALESCE(o.usage_minutes_limit, 60) as minutes_limit,
  CASE
    WHEN o.usage_current_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    THEN GREATEST(0, COALESCE(o.usage_minutes_current, 0) - COALESCE(o.usage_minutes_limit, 60))
    ELSE 0
  END as overage_minutes,
  CASE
    WHEN o.usage_current_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    THEN (GREATEST(0, COALESCE(o.usage_minutes_current, 0) - COALESCE(o.usage_minutes_limit, 60)) * 0.20)::DECIMAL(10,2)
    ELSE 0.00
  END as overage_charge,
  COALESCE(o.usage_current_month, TO_CHAR(CURRENT_DATE, 'YYYY-MM')) as tracking_month,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM') as current_month,
  o.usage_current_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM') as is_current_month,
  o.usage_reset_at as next_reset,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
    - CURRENT_DATE::DATE + 1 as days_until_reset,
  CASE
    WHEN o.usage_current_month IS NULL OR o.usage_current_month < TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN 'needs_reset'
    WHEN COALESCE(o.usage_minutes_current, 0) >= COALESCE(o.usage_minutes_limit, 60) THEN 'overage'
    WHEN COALESCE(o.usage_minutes_current, 0) >= COALESCE(o.usage_minutes_limit, 60) * 0.9 THEN 'warning'
    WHEN COALESCE(o.usage_minutes_current, 0) >= COALESCE(o.usage_minutes_limit, 60) * 0.8 THEN 'caution'
    ELSE 'ok'
  END as usage_status,
  o.has_unpaid_overage,
  o.overage_debt,
  o.can_upgrade
FROM public.organizations o;

-- Grant select on view
GRANT SELECT ON public.usage_summary TO authenticated;

-- Update usage limits based on subscription plans (matching lib/pricing.ts)
UPDATE public.organizations
SET usage_minutes_limit = CASE subscription_plan
  WHEN 'free' THEN 60        -- Free tier: 60 minutes
  WHEN 'solo' THEN 500       -- Solo: 500 minutes
  WHEN 'starter' THEN 1500   -- Team/Starter: 1500 minutes
  WHEN 'professional' THEN 4000  -- Growing/Professional: 4000 minutes
  WHEN 'enterprise' THEN 15000   -- Enterprise: 15000 minutes
  WHEN 'custom' THEN 999999      -- Custom: Unlimited
  ELSE 60  -- Default to free tier
END
WHERE usage_minutes_limit IS NULL OR usage_minutes_limit = 0;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check current state
SELECT
  name,
  subscription_plan,
  usage_current_month,
  usage_minutes_current || '/' || usage_minutes_limit as "Usage",
  CASE
    WHEN usage_minutes_current > usage_minutes_limit
    THEN 'OVERAGE: $' || ((usage_minutes_current - usage_minutes_limit) * 0.20)::TEXT
    ELSE 'OK'
  END as "Status",
  usage_reset_at
FROM organizations
ORDER BY usage_minutes_current DESC
LIMIT 10;

-- Check January 2026 usage logs
SELECT
  COUNT(*) as log_count,
  SUM(minutes_used) as total_minutes,
  SUM(CASE WHEN is_overage THEN minutes_used ELSE 0 END) as overage_minutes
FROM usage_logs
WHERE month_year = '2026-01';

-- =====================================================
-- SUCCESS! The system now:
-- 1. Tracks usage per calendar month (YYYY-MM format)
-- 2. Automatically resets on first activity of new month
-- 3. Shows only January 2026 usage (not all-time)
-- 4. Aligns with app's 60-minute free tier default
-- 5. Works with existing overage and billing systems
-- =====================================================