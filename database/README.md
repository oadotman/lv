# 🗄️ SynQall - Database Setup

**Clean slate approach** - Fresh start with properly designed schema.

---

## 🚨 CRITICAL FIX: Permission Error Resolved

**Problem Found:** Signup was failing with `permission denied for schema public` (error code 42501).

**Root Cause:** The service role didn't have proper permissions on the public schema, even though it should bypass RLS.

**Solution:** Run the new permission fix script after creating the schema.

---

## 📁 Files in This Folder

1. **`000_DROP_EVERYTHING.sql`** - Drops all tables, functions, triggers (run first)
2. **`001_COMPREHENSIVE_SCHEMA.sql`** - Complete database schema (run second)
3. **`002_FIX_PERMISSIONS.sql`** - **NEW! Fixes permission errors (run third)**
4. **`README.md`** - This file

---

## 🚀 Quick Start (4 Steps)

### Step 1: Drop Everything
Open **Supabase SQL Editor** and run:
```
000_DROP_EVERYTHING.sql
```

Expected output:
```
✅ All tables dropped successfully!
✅ All functions dropped successfully!
✅ All triggers dropped successfully!
🎉 Database wiped clean!
```

---

### Step 2: Create Schema
Run in **Supabase SQL Editor**:
```
001_COMPREHENSIVE_SCHEMA.sql
```

Expected output:
```
✅ All 12 tables created successfully!
✅ All 4 functions created successfully!
✅ RLS enabled on all tables!
🎉 Database schema created successfully!
```

---

### Step 3: Fix Permissions (NEW - CRITICAL!)
Run in **Supabase SQL Editor**:
```
002_FIX_PERMISSIONS.sql
```

Expected output:
```
✅ service_role has INSERT permission on organizations
🎉 Permissions fixed! Service role can now access all tables.
```

This grants the service role proper permissions to:
- Insert organizations during signup
- Create user_organizations memberships
- Bypass RLS for admin operations

---

### Step 4: Test Signup
1. Delete all test users (if any):
   ```sql
   DELETE FROM auth.users;
   ```

2. Go to: `http://localhost:3000/signup`

3. Fill in form:
   - Full name: **Test User**
   - Email: **test@example.com**
   - Organization: **Test Company**
   - Password: **password123**

4. Click **"Create account"**

5. Should see **success message** (NO 500 errors!)

---

## ✅ Verify It Works

Run in Supabase SQL Editor:
```sql
SELECT
  u.email,
  o.name as organization,
  o.plan_type,
  o.max_members,
  uo.role
FROM auth.users u
JOIN user_organizations uo ON u.id = uo.user_id
JOIN organizations o ON uo.organization_id = o.id;
```

Expected result:
```
email: test@example.com
organization: Test Company
plan_type: free
max_members: 1
role: owner
```

---

## 📊 What Gets Created

### 12 Tables:
1. `audit_logs` - Audit trail
2. `organizations` - Teams/companies
3. `user_organizations` - User-org membership
4. `team_invitations` - Team invites
5. `custom_templates` - CRM templates
6. `template_fields` - Template fields
7. `calls` - Call records
8. `transcripts` - Full transcripts
9. `transcript_utterances` - Speaker turns
10. `call_insights` - AI insights
11. `call_fields` - Extracted CRM fields
12. `notifications` - User notifications

### 4 Functions:
- `log_audit()` - Create audit logs
- `get_user_organization()` - Get user's org
- `can_manage_team()` - Check permissions
- `update_organization_timestamp()` - Auto-update timestamps

### Security:
- ✅ Row Level Security (RLS) on all tables
- ✅ Proper indexes for performance
- ✅ Foreign key constraints
- ✅ Check constraints for data validation

---

## 🔧 Troubleshooting

### "column does not exist" errors
**Solution:** Run `000_DROP_EVERYTHING.sql` first, then `001_COMPREHENSIVE_SCHEMA.sql`

### Signup gives 500 error "permission denied for schema public"
**Solution:** Run `002_FIX_PERMISSIONS.sql` in Supabase SQL Editor

### Other 500 errors
**Solution:**
1. Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
2. Restart dev server: `npm run dev`
3. Check browser console for detailed error info (debugInfo object)
4. Check terminal logs for server-side errors

### Migration says "already exists"
**Solution:** Run `000_DROP_EVERYTHING.sql` to clean everything

---

## 📋 Pricing Plans

| Plan | Price | Users | Minutes/Month |
|------|-------|-------|---------------|
| Free | $0 | 1 | 30 |
| Solo | $49 | 1 | 1,500 |
| Team 5 | $149 | 5 | 6,000 |
| Team 10 | $299 | 10 | 15,000 |
| Team 20 | $499 | 20 | 35,000 |

---

**That's it!** 🎉 Your database is ready to use.
