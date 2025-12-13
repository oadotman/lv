# 🚨 CRITICAL DEPLOYMENT - Usage Tracking Fix

## ROOT CAUSE IDENTIFIED
The `organizations` table is MISSING the `used_minutes` column!
This is why team usage is NOT being deducted.

## IMMEDIATE ACTIONS REQUIRED

### Step 1: Deploy Code Changes (Already Pushed)
The code changes have been pushed to GitHub. Deploy them:

```bash
# On production server
cd /var/www/synqall
git pull origin main
npm install
npm run build
pm2 restart synqall
```

### Step 2: Execute SQL Migration (CRITICAL - RUN IMMEDIATELY)
Run this in Supabase SQL Editor:

```sql
-- =====================================================
-- CRITICAL: ADD MISSING used_minutes COLUMN
-- =====================================================

-- 1. Add the missing column (THIS IS THE ROOT CAUSE FIX!)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS used_minutes INTEGER DEFAULT 0;

-- 2. Add column comment
COMMENT ON COLUMN organizations.used_minutes IS 'Total minutes used in current billing period';

-- 3. Create the increment function
CREATE OR REPLACE FUNCTION increment_used_minutes(
  org_id UUID,
  minutes_to_add INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET
    used_minutes = COALESCE(used_minutes, 0) + minutes_to_add,
    updated_at = NOW()
  WHERE id = org_id;

  RAISE NOTICE 'Updated organization % used_minutes by % minutes', org_id, minutes_to_add;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION increment_used_minutes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_used_minutes TO service_role;

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_used_minutes ON organizations(used_minutes);

-- 6. CRITICAL: Fix historical data - populate used_minutes from usage_metrics
UPDATE organizations o
SET used_minutes = (
  SELECT COALESCE(SUM(metric_value), 0)
  FROM usage_metrics um
  WHERE um.organization_id = o.id
  AND um.metric_type = 'minutes_transcribed'
);

-- 7. Fix orphaned calls without organization_id
UPDATE calls c
SET organization_id = (
  SELECT uo.organization_id
  FROM user_organizations uo
  WHERE uo.user_id = c.user_id
  LIMIT 1
)
WHERE c.organization_id IS NULL
  AND EXISTS (
    SELECT 1 FROM user_organizations uo
    WHERE uo.user_id = c.user_id
  );
```

### Step 3: Verify Deployment

Run these verification queries in Supabase:

```sql
-- Check if organizations now have correct used_minutes
SELECT
  o.name,
  o.plan_type,
  o.max_minutes_monthly,
  o.used_minutes,
  COUNT(DISTINCT c.id) as total_calls,
  SUM(c.duration_minutes) as calculated_usage,
  CASE
    WHEN o.used_minutes = SUM(c.duration_minutes) THEN '✅ SYNCED'
    WHEN o.used_minutes IS NULL THEN '❌ NULL'
    ELSE '⚠️ MISMATCH'
  END as status
FROM organizations o
LEFT JOIN calls c ON c.organization_id = o.id AND c.status = 'completed'
GROUP BY o.id, o.name, o.plan_type, o.max_minutes_monthly, o.used_minutes
ORDER BY status DESC, o.name;

-- Check for orphaned users without organizations
SELECT COUNT(*) as orphaned_users
FROM auth.users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.organization_id IS NULL;

-- Check for orphaned calls without organization_id
SELECT COUNT(*) as orphaned_calls
FROM calls
WHERE organization_id IS NULL
  AND status = 'completed';
```

## VERIFICATION CHECKLIST

- [ ] Code deployed and PM2 restarted
- [ ] SQL migration executed successfully
- [ ] No orphaned users (query should return 0)
- [ ] No orphaned calls (query should return 0)
- [ ] Organizations have synced used_minutes
- [ ] Test a new transcription and verify usage updates

## MONITORING

Monitor these after deployment:

1. **Check logs for usage updates:**
```bash
pm2 logs synqall --lines 100 | grep "used_minutes"
```

2. **Watch for errors:**
```bash
pm2 logs synqall --lines 100 | grep -E "CRITICAL|Failed to update organization"
```

3. **Real-time usage monitoring:**
```sql
-- Run this query periodically to see usage changes
SELECT
  o.name,
  o.used_minutes,
  o.max_minutes_monthly - o.used_minutes as remaining,
  o.updated_at
FROM organizations o
ORDER BY o.updated_at DESC
LIMIT 10;
```

## ROLLBACK PLAN

If issues occur:

1. **Revert code:**
```bash
git revert HEAD
npm run build
pm2 restart synqall
```

2. **Keep the SQL function** - it won't hurt if unused

## SUCCESS CRITERIA

✅ New transcriptions deduct from organization's used_minutes
✅ Invitation flow preserves organization context
✅ No users without organizations
✅ All calls have organization_id
✅ Usage tracking is accurate

## SUPPORT CONTACTS

If issues persist:
- Check Supabase logs for database errors
- Check PM2 logs for application errors
- Review the ORGANIZATION_TRACKING_FIX.md for detailed explanations