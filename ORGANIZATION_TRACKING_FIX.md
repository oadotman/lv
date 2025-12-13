# Organization Usage Tracking - Complete Fix Documentation

## 🚨 Critical Issues Fixed

### 1. **Missing Usage Deduction** (FIXED)
- **Problem**: Team member usage was recorded in `usage_metrics` table but NOT deducted from organization's `used_minutes`
- **Solution**: Added code to update `organizations.used_minutes` when transcription completes

### 2. **Lost Organization Context** (FIXED)
- **Problem**: Users could end up without an organization, making usage tracking impossible
- **Solution**: Created `ensureUserOrganization()` that guarantees every user has an organization

### 3. **Invitation Flow Breaking** (FIXED)
- **Problem**: When invited users clicked "Sign in", they lost invitation context
- **Solution**: Updated login flow to preserve invitation token through authentication

## 📊 How Organization ID is Captured

### **Scenario 1: Regular Signup (User Creates Organization)**
```
1. User signs up at /signup
2. Provides organization name
3. System creates:
   - User account
   - Organization (user as owner)
   - user_organizations record
4. All future calls have organization_id ✅
```

### **Scenario 2: Invitation Signup (User Joins Existing Organization)**
```
1. Admin sends invitation → Creates team_invitations record
2. User clicks link: https://synqall.com/invite/[token]
3. If not logged in → /invite-signup/[token]
4. User creates account with inviteToken
5. System:
   - Creates user account
   - Accepts invitation
   - Creates user_organizations record
   - Links user to invited organization
6. All future calls have organization_id ✅
```

### **Scenario 3: Existing User Accepts Invitation**
```
1. User clicks invitation link
2. Already logged in → Shows acceptance page
3. Accepts → Added to organization
4. All future calls use new organization_id ✅
```

## 🛡️ Fallback Logic Explained

### **Primary Fallback (in upload route):**
```typescript
// When uploading a call:
1. Try to get user's organization
2. If no organization found:
   - Create default organization for user
   - Name it "[email]'s Team"
   - Set as free plan
   - User becomes owner
3. Proceed with upload using this organization
```

### **Secondary Fallback (during transcription):**
```typescript
// When transcription completes:
if (!call.organization_id) {
  // Try to find user's organization
  const userOrg = getUserOrganization(user.id)

  if (userOrg) {
    // Update call with organization
    updateCall(call.id, { organization_id: userOrg.id })
    // Track usage
    updateOrganizationUsage(userOrg.id, minutes)
  } else {
    // Create default organization
    const newOrg = createDefaultOrganization(user.id)
    updateCall(call.id, { organization_id: newOrg.id })
    updateOrganizationUsage(newOrg.id, minutes)
  }
}
```

## 🔍 How to Verify Everything Works

### **Check Organization Assignment:**
```sql
-- Find users without organizations
SELECT u.email, u.created_at
FROM auth.users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.organization_id IS NULL;

-- Find calls without organizations
SELECT c.id, c.created_at, u.email
FROM calls c
JOIN auth.users u ON c.user_id = u.id
WHERE c.organization_id IS NULL;
```

### **Check Usage Tracking:**
```sql
-- Verify organizations have correct usage
SELECT
  o.name,
  o.used_minutes,
  o.max_minutes_monthly,
  COUNT(c.id) as total_calls,
  SUM(c.duration_minutes) as calculated_usage
FROM organizations o
LEFT JOIN calls c ON c.organization_id = o.id
GROUP BY o.id;
```

## 🚀 Deployment Checklist

1. **Deploy Application Code:**
   ```bash
   git pull origin main
   npm run build
   pm2 restart synqall
   ```

2. **Run SQL Migration:**
   - Execute `database/fix-usage-tracking.sql` in Supabase

3. **Fix Orphaned Data:**
   ```sql
   -- Run this to fix any orphaned calls
   UPDATE calls c
   SET organization_id = (
     SELECT uo.organization_id
     FROM user_organizations uo
     WHERE uo.user_id = c.user_id
     LIMIT 1
   )
   WHERE c.organization_id IS NULL;
   ```

4. **Update Environment Variables:**
   - Ensure `NEXT_PUBLIC_APP_URL=https://synqall.com` in production

## 🔐 Security Considerations

1. **RLS Policies**: Ensure users can only update their own organization's usage
2. **Admin Access**: Only service role can create organizations for users
3. **Invitation Security**: Tokens are single-use and expire after 7 days

## 📈 Monitoring

### **Key Metrics to Watch:**
- Organizations with `used_minutes > max_minutes_monthly`
- Calls without `organization_id`
- Users without organizations
- Failed usage updates in logs

### **Alert Conditions:**
```sql
-- Set up alerts for these conditions:

-- 1. Orphaned users
SELECT COUNT(*) FROM auth.users u
LEFT JOIN user_organizations uo ON u.id = uo.user_id
WHERE uo.organization_id IS NULL;

-- 2. Orphaned calls
SELECT COUNT(*) FROM calls
WHERE organization_id IS NULL
AND status = 'completed';

-- 3. Usage tracking failures
SELECT COUNT(*) FROM usage_metrics um
LEFT JOIN organizations o ON o.id = um.organization_id
WHERE o.used_minutes = 0
AND um.metric_value > 0;
```

## 🎯 Key Takeaways

1. **Every user MUST have an organization** - No exceptions
2. **Every call MUST have an organization_id** - Required for usage tracking
3. **Usage must update both tables** - `usage_metrics` AND `organizations.used_minutes`
4. **Invitation context must be preserved** - Through entire auth flow
5. **Fallback logic is critical** - Catches edge cases and prevents revenue loss

## 📞 Support Queries

If users report usage not being tracked:
1. Check if they have an organization
2. Check if their calls have organization_id
3. Check if organization.used_minutes is updating
4. Run the fix queries if needed