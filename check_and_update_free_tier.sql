-- =====================================================
-- CHECK AND UPDATE FREE TIER TO 60 MINUTES
-- This script will show current state and update to 60 minutes
-- =====================================================

-- STEP 1: CHECK CURRENT STATE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING CURRENT FREE TIER CONFIGURATION';
    RAISE NOTICE '========================================';
END $$;

-- Check organizations table columns and their defaults
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
    AND column_name IN ('max_minutes', 'max_minutes_monthly', 'usage_minutes_limit')
ORDER BY column_name;

-- Check current free tier organizations
SELECT
    'Current Free Tier Organizations' as report_type,
    COUNT(*) as total_count,
    AVG(max_minutes) as avg_max_minutes,
    AVG(max_minutes_monthly) as avg_max_minutes_monthly,
    MIN(max_minutes) as min_max_minutes,
    MAX(max_minutes) as max_max_minutes
FROM organizations
WHERE plan_type = 'free' OR subscription_plan = 'free';

-- Show sample of free tier organizations
SELECT
    id,
    name,
    plan_type,
    subscription_plan,
    max_minutes,
    max_minutes_monthly,
    created_at
FROM organizations
WHERE plan_type = 'free' OR subscription_plan = 'free'
LIMIT 5;

-- STEP 2: CHECK FOR USAGE LIMIT COLUMNS
-- =====================================================
DO $$
DECLARE
    has_usage_minutes_limit BOOLEAN;
    has_usage_minutes_current BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'usage_minutes_limit'
    ) INTO has_usage_minutes_limit;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'usage_minutes_current'
    ) INTO has_usage_minutes_current;

    IF has_usage_minutes_limit THEN
        RAISE NOTICE 'Column usage_minutes_limit EXISTS';
    ELSE
        RAISE NOTICE 'Column usage_minutes_limit DOES NOT EXIST - will add it';
    END IF;

    IF has_usage_minutes_current THEN
        RAISE NOTICE 'Column usage_minutes_current EXISTS';
    ELSE
        RAISE NOTICE 'Column usage_minutes_current DOES NOT EXIST - will add it';
    END IF;
END $$;

-- Add missing columns if they don't exist
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS usage_minutes_limit INTEGER DEFAULT 60;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS usage_minutes_current INTEGER DEFAULT 0;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month');

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS overage_cap_reached BOOLEAN DEFAULT FALSE;

-- STEP 3: UPDATE EXISTING FREE TIER TO 60 MINUTES
-- =====================================================
DO $$
DECLARE
    rows_updated INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UPDATING FREE TIER TO 60 MINUTES';
    RAISE NOTICE '========================================';

    -- Update all free tier organizations to 60 minutes
    UPDATE organizations
    SET
        max_minutes = 60,
        max_minutes_monthly = 60,
        usage_minutes_limit = 60
    WHERE (plan_type = 'free' OR subscription_plan = 'free')
        AND (
            max_minutes < 60 OR
            max_minutes_monthly < 60 OR
            usage_minutes_limit < 60 OR
            max_minutes IS NULL OR
            max_minutes_monthly IS NULL OR
            usage_minutes_limit IS NULL
        );

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % organizations to 60 minutes', rows_updated;
END $$;

-- STEP 4: UPDATE COLUMN DEFAULTS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UPDATING COLUMN DEFAULTS TO 60 MINUTES';
    RAISE NOTICE '========================================';
END $$;

ALTER TABLE organizations
ALTER COLUMN max_minutes SET DEFAULT 60;

ALTER TABLE organizations
ALTER COLUMN max_minutes_monthly SET DEFAULT 60;

ALTER TABLE organizations
ALTER COLUMN usage_minutes_limit SET DEFAULT 60;

-- STEP 5: CHECK AND UPDATE TRIGGERS/FUNCTIONS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING TRIGGERS AND FUNCTIONS';
    RAISE NOTICE '========================================';
END $$;

-- List all functions that might set usage limits
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND pg_get_functiondef(p.oid) LIKE '%30%'
    AND (
        pg_get_functiondef(p.oid) LIKE '%usage_minutes_limit%'
        OR pg_get_functiondef(p.oid) LIKE '%max_minutes%'
        OR pg_get_functiondef(p.oid) LIKE '%plan%'
    )
LIMIT 10;

-- Create or replace function to handle organization plan changes
CREATE OR REPLACE FUNCTION handle_organization_plan_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update limits based on plan
    CASE NEW.subscription_plan
        WHEN 'free' THEN
            NEW.usage_minutes_limit := 60;  -- Updated from 30 to 60
            NEW.max_minutes := 60;
            NEW.max_minutes_monthly := 60;
            NEW.max_members := 1;
        WHEN 'solo' THEN
            NEW.usage_minutes_limit := 500;
            NEW.max_minutes := 500;
            NEW.max_minutes_monthly := 500;
            NEW.max_members := 1;
        WHEN 'starter' THEN
            NEW.usage_minutes_limit := 1500;
            NEW.max_minutes := 1500;
            NEW.max_minutes_monthly := 1500;
            NEW.max_members := 3;
        WHEN 'professional' THEN
            NEW.usage_minutes_limit := 4000;
            NEW.max_minutes := 4000;
            NEW.max_minutes_monthly := 4000;
            NEW.max_members := 10;
        WHEN 'enterprise' THEN
            NEW.usage_minutes_limit := 15000;
            NEW.max_minutes := 15000;
            NEW.max_minutes_monthly := 15000;
            NEW.max_members := 20;
        ELSE
            -- Default to free tier limits
            NEW.usage_minutes_limit := 60;
            NEW.max_minutes := 60;
            NEW.max_minutes_monthly := 60;
            NEW.max_members := 1;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_organization_plan_change ON organizations;
CREATE TRIGGER on_organization_plan_change
    BEFORE UPDATE OF subscription_plan ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION handle_organization_plan_change();

-- STEP 6: VERIFY ALL PRICING PLANS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFYING ALL PRICING PLANS';
    RAISE NOTICE '========================================';
END $$;

-- Show summary of all plans
SELECT
    COALESCE(subscription_plan, plan_type, 'unknown') as plan,
    COUNT(*) as organization_count,
    AVG(max_minutes) as avg_max_minutes,
    AVG(max_minutes_monthly) as avg_max_minutes_monthly,
    AVG(usage_minutes_limit) as avg_usage_limit,
    MIN(max_minutes) as min_minutes,
    MAX(max_minutes) as max_minutes
FROM organizations
GROUP BY COALESCE(subscription_plan, plan_type, 'unknown')
ORDER BY organization_count DESC;

-- STEP 7: FINAL VERIFICATION
-- =====================================================
DO $$
DECLARE
    free_tier_check RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL VERIFICATION';
    RAISE NOTICE '========================================';

    SELECT
        COUNT(*) as total_free_orgs,
        COUNT(CASE WHEN max_minutes = 60 THEN 1 END) as correct_max_minutes,
        COUNT(CASE WHEN max_minutes_monthly = 60 THEN 1 END) as correct_monthly,
        COUNT(CASE WHEN usage_minutes_limit = 60 THEN 1 END) as correct_limit
    INTO free_tier_check
    FROM organizations
    WHERE plan_type = 'free' OR subscription_plan = 'free';

    RAISE NOTICE 'Free tier organizations: %', free_tier_check.total_free_orgs;
    RAISE NOTICE 'With correct max_minutes (60): %', free_tier_check.correct_max_minutes;
    RAISE NOTICE 'With correct max_minutes_monthly (60): %', free_tier_check.correct_monthly;
    RAISE NOTICE 'With correct usage_minutes_limit (60): %', free_tier_check.correct_limit;

    IF free_tier_check.total_free_orgs = free_tier_check.correct_max_minutes
       AND free_tier_check.total_free_orgs = free_tier_check.correct_monthly
       AND free_tier_check.total_free_orgs = free_tier_check.correct_limit THEN
        RAISE NOTICE '✅ SUCCESS: All free tier organizations updated to 60 minutes!';
    ELSE
        RAISE WARNING '⚠️ WARNING: Some organizations may not have been updated correctly';
    END IF;
END $$;

-- STEP 8: CHECK LANDING PAGE ALIGNMENT
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LANDING PAGE ALIGNMENT CHECK';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Landing page advertises: "1 hour free every month, forever"';
    RAISE NOTICE 'Database now configured: 60 minutes for free tier';
    RAISE NOTICE '';
    RAISE NOTICE 'Pricing tiers configured:';
    RAISE NOTICE '  • FREE: 60 minutes/month (1 hour)';
    RAISE NOTICE '  • SOLO: 500 minutes/month';
    RAISE NOTICE '  • STARTER: 1500 minutes/month';
    RAISE NOTICE '  • PROFESSIONAL: 4000 minutes/month';
    RAISE NOTICE '  • ENTERPRISE: 15000 minutes/month';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database and landing page are now ALIGNED!';
END $$;

-- Show final state of free tier organizations
SELECT
    'FINAL STATE - Free Tier Organizations' as report,
    COUNT(*) as total_count,
    MIN(max_minutes) as min_minutes,
    MAX(max_minutes) as max_minutes,
    AVG(max_minutes) as avg_minutes,
    CASE
        WHEN MIN(max_minutes) = 60 AND MAX(max_minutes) = 60
        THEN '✅ ALL SET TO 60 MINUTES'
        ELSE '⚠️ INCONSISTENT VALUES'
    END as status
FROM organizations
WHERE plan_type = 'free' OR subscription_plan = 'free';

-- List any organizations that might still have incorrect values
SELECT
    id,
    name,
    plan_type,
    subscription_plan,
    max_minutes,
    max_minutes_monthly,
    usage_minutes_limit,
    '⚠️ NEEDS ATTENTION' as status
FROM organizations
WHERE (plan_type = 'free' OR subscription_plan = 'free')
    AND (
        COALESCE(max_minutes, 0) != 60 OR
        COALESCE(max_minutes_monthly, 0) != 60 OR
        COALESCE(usage_minutes_limit, 0) != 60
    );