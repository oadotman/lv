-- =====================================================
-- 🔥 DROP EVERYTHING - CLEAN SLATE
-- Drops ALL tables, functions, triggers, and policies
-- Run this FIRST to get a clean slate
-- =====================================================

-- Disable all triggers temporarily
SET session_replication_role = 'replica';

-- =====================================================
-- DROP ALL TABLES (CASCADE removes all dependencies)
-- =====================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS call_fields CASCADE;
DROP TABLE IF EXISTS call_insights CASCADE;
DROP TABLE IF EXISTS transcript_utterances CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS template_fields CASCADE;
DROP TABLE IF EXISTS custom_templates CASCADE;
DROP TABLE IF EXISTS team_invitations CASCADE;
DROP TABLE IF EXISTS user_organizations CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- =====================================================
-- DROP ALL FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS log_audit(UUID, TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS get_user_organization(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_manage_team(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_organization_timestamp() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS migrate_user_data_to_organizations() CASCADE;

-- =====================================================
-- DROP ALL TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS organizations_updated_at ON organizations CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check no tables remain
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All tables dropped successfully!'
    ELSE '⚠️ ' || COUNT(*)::text || ' tables still exist: ' || string_agg(table_name, ', ')
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'audit_logs', 'organizations', 'user_organizations', 'team_invitations',
    'custom_templates', 'template_fields', 'calls', 'transcripts',
    'transcript_utterances', 'call_insights', 'call_fields', 'notifications'
  )
GROUP BY CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '⚠️' END;

-- Check no functions remain
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All functions dropped successfully!'
    ELSE '⚠️ ' || COUNT(*)::text || ' functions still exist'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'log_audit', 'get_user_organization', 'can_manage_team',
    'update_organization_timestamp', 'handle_new_user', 'migrate_user_data_to_organizations'
  );

-- Check no triggers remain on auth.users
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All triggers dropped successfully!'
    ELSE '⚠️ ' || COUNT(*)::text || ' triggers still exist'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND t.tgname = 'on_auth_user_created';

-- Summary
SELECT
  '🎉 Database wiped clean!' as message,
  'Next step: Run 001_COMPREHENSIVE_SCHEMA.sql' as next_action;
