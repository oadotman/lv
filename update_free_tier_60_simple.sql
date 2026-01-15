-- =====================================================
-- SIMPLE UPDATE SCRIPT: FREE TIER TO 60 MINUTES
-- =====================================================

-- Step 1: Add missing columns if they don't exist
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS usage_minutes_limit INTEGER DEFAULT 60;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS usage_minutes_current INTEGER DEFAULT 0;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month');

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS overage_cap_reached BOOLEAN DEFAULT FALSE;

-- Step 2: Check current state BEFORE update
SELECT
    'BEFORE UPDATE' as status,
    COUNT(*) as total_free_orgs,
    AVG(max_minutes)::numeric(10,2) as avg_max_minutes,
    MIN(max_minutes) as min_max_minutes,
    MAX(max_minutes) as max_max_minutes
FROM organizations
WHERE plan_type = 'free' OR subscription_plan = 'free';

-- Step 3: Update all free tier organizations to 60 minutes
UPDATE organizations
SET
    max_minutes = 60,
    max_minutes_monthly = 60,
    usage_minutes_limit = 60
WHERE (plan_type = 'free' OR subscription_plan = 'free')
    AND (
        COALESCE(max_minutes, 0) != 60 OR
        COALESCE(max_minutes_monthly, 0) != 60 OR
        COALESCE(usage_minutes_limit, 0) != 60
    );

-- Step 4: Update column defaults for new organizations
ALTER TABLE organizations
ALTER COLUMN max_minutes SET DEFAULT 60;

ALTER TABLE organizations
ALTER COLUMN max_minutes_monthly SET DEFAULT 60;

ALTER TABLE organizations
ALTER COLUMN usage_minutes_limit SET DEFAULT 60;

-- Step 5: Verify the update worked
SELECT
    'AFTER UPDATE' as status,
    COUNT(*) as total_free_orgs,
    AVG(max_minutes)::numeric(10,2) as avg_max_minutes,
    MIN(max_minutes) as min_max_minutes,
    MAX(max_minutes) as max_max_minutes
FROM organizations
WHERE plan_type = 'free' OR subscription_plan = 'free';

-- Step 6: Show any organizations that still need attention
SELECT
    id,
    name,
    plan_type,
    subscription_plan,
    max_minutes,
    max_minutes_monthly,
    usage_minutes_limit
FROM organizations
WHERE (plan_type = 'free' OR subscription_plan = 'free')
    AND (
        COALESCE(max_minutes, 0) != 60 OR
        COALESCE(max_minutes_monthly, 0) != 60 OR
        COALESCE(usage_minutes_limit, 0) != 60
    );

-- Step 7: Summary by plan type
SELECT
    COALESCE(subscription_plan, plan_type, 'unknown') as plan,
    COUNT(*) as count,
    AVG(max_minutes)::numeric(10,2) as avg_minutes,
    AVG(usage_minutes_limit)::numeric(10,2) as avg_limit
FROM organizations
GROUP BY COALESCE(subscription_plan, plan_type, 'unknown')
ORDER BY count DESC;