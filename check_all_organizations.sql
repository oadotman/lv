-- =====================================================
-- CHECK ALL ORGANIZATIONS AND THEIR PLANS
-- =====================================================

-- 1. Show all organizations with their plans and limits
SELECT
    id,
    name,
    plan_type,
    subscription_plan,
    max_minutes,
    max_minutes_monthly,
    usage_minutes_limit,
    usage_minutes_current,
    created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 20;

-- 2. Count organizations by plan type
SELECT
    'By plan_type' as grouping,
    plan_type,
    COUNT(*) as count
FROM organizations
GROUP BY plan_type
ORDER BY count DESC;

-- 3. Count organizations by subscription_plan
SELECT
    'By subscription_plan' as grouping,
    subscription_plan,
    COUNT(*) as count
FROM organizations
GROUP BY subscription_plan
ORDER BY count DESC;

-- 4. Check for organizations that should be free tier
-- (organizations with null or default plans)
SELECT
    id,
    name,
    plan_type,
    subscription_plan,
    max_minutes,
    max_minutes_monthly,
    usage_minutes_limit,
    CASE
        WHEN plan_type IS NULL AND subscription_plan IS NULL THEN 'Should be FREE'
        WHEN max_minutes <= 60 THEN 'Likely FREE tier'
        ELSE 'Check plan'
    END as recommendation
FROM organizations
WHERE
    (plan_type IS NULL AND subscription_plan IS NULL)
    OR (max_minutes <= 60 AND max_minutes IS NOT NULL)
ORDER BY created_at DESC;

-- 5. Update organizations that should be free tier
-- This will set proper free tier values for organizations without a plan
UPDATE organizations
SET
    plan_type = 'free',
    subscription_plan = 'free',
    max_minutes = 60,
    max_minutes_monthly = 60,
    usage_minutes_limit = 60
WHERE
    (plan_type IS NULL AND subscription_plan IS NULL)
    OR (
        -- Organizations with very low limits are likely free tier
        max_minutes <= 60
        AND (plan_type IS NULL OR subscription_plan IS NULL)
    )
RETURNING id, name, plan_type, subscription_plan, max_minutes;

-- 6. Final check - show updated free tier organizations
SELECT
    'FINAL CHECK - Free Tier Organizations' as report,
    COUNT(*) as total,
    AVG(max_minutes) as avg_minutes
FROM organizations
WHERE plan_type = 'free' OR subscription_plan = 'free';