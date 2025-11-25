-- =====================================================
-- CALLSYNC AI - COMPREHENSIVE DATABASE SCHEMA
-- PROPER ORDERING: Tables → Functions → Triggers → RLS
-- =====================================================
-- Version: 2.0 (FIXED)
-- Date: November 20, 2025
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PART 1: CREATE ALL TABLES (NO RLS YET)
-- =====================================================

-- 1. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 2. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'solo', 'team_5', 'team_10', 'team_20', 'enterprise')),
  billing_email TEXT,
  max_members INTEGER DEFAULT 1,
  max_minutes_monthly INTEGER DEFAULT 30,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_max_members CHECK (max_members > 0),
  CONSTRAINT valid_max_minutes CHECK (max_minutes_monthly >= 0)
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- 3. USER_ORGANIZATIONS
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_role ON user_organizations(role);

-- 4. TEAM_INVITATIONS
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email = LOWER(email)),
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resend_message_id TEXT,
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires ON team_invitations(expires_at);

-- 5. CUSTOM_TEMPLATES
CREATE TABLE IF NOT EXISTS custom_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom' CHECK (category IN ('standard', 'custom')),
  field_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_templates_user ON custom_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_org ON custom_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_active ON custom_templates(is_active) WHERE is_active = true;

-- 6. TEMPLATE_FIELDS
CREATE TABLE IF NOT EXISTS template_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES custom_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'picklist', 'boolean', 'url', 'email')),
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  picklist_values TEXT[],
  validation_rules JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_fields_template ON template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_order ON template_fields(template_id, sort_order);

-- 7. CALLS
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  audio_url TEXT,
  mime_type TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_company TEXT,
  sales_rep TEXT,
  call_date TIMESTAMPTZ DEFAULT NOW(),
  call_type TEXT,
  duration INTEGER,
  sentiment_type TEXT CHECK (sentiment_type IN ('positive', 'neutral', 'negative')),
  sentiment_score NUMERIC(5,2),
  summary TEXT,
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'failed')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  assemblyai_transcript_id TEXT,
  assemblyai_error TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calls_user ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_org ON calls(organization_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_date ON calls(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_calls_deleted ON calls(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calls_assemblyai ON calls(assemblyai_transcript_id);

-- 8. TRANSCRIPTS
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  full_text TEXT,
  language_code TEXT DEFAULT 'en',
  confidence_score NUMERIC(5,2),
  word_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_call ON transcripts(call_id);

-- 9. TRANSCRIPT_UTTERANCES
CREATE TABLE IF NOT EXISTS transcript_utterances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  start_time NUMERIC(10,2),
  end_time NUMERIC(10,2),
  confidence NUMERIC(5,2),
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_utterances_transcript ON transcript_utterances(transcript_id);
CREATE INDEX IF NOT EXISTS idx_utterances_speaker ON transcript_utterances(transcript_id, speaker);
CREATE INDEX IF NOT EXISTS idx_utterances_time ON transcript_utterances(transcript_id, start_time);

-- 10. CALL_INSIGHTS
CREATE TABLE IF NOT EXISTS call_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pain_point', 'action_item', 'competitor', 'objection', 'question', 'key_moment')),
  insight_text TEXT NOT NULL,
  confidence_score NUMERIC(5,2),
  timestamp_in_call NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_call ON call_insights(call_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON call_insights(call_id, insight_type);

-- 11. CALL_FIELDS
CREATE TABLE IF NOT EXISTS call_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  template_id UUID REFERENCES custom_templates(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  field_value TEXT,
  confidence_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fields_call ON call_fields(call_id);
CREATE INDEX IF NOT EXISTS idx_fields_template ON call_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_fields_name ON call_fields(call_id, field_name);

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'call_uploaded', 'call_completed', 'call_failed',
    'team_invitation', 'team_member_joined',
    'usage_warning', 'billing_update'
  )),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- PART 2: CREATE ALL FUNCTIONS
-- =====================================================

-- Function: log_audit()
CREATE OR REPLACE FUNCTION log_audit(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_audit TO authenticated;

-- Function: get_user_organization()
CREATE OR REPLACE FUNCTION get_user_organization(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  user_role TEXT,
  plan_type TEXT,
  max_members INTEGER,
  max_minutes_monthly INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, o.slug, uo.role, o.plan_type, o.max_members, o.max_minutes_monthly
  FROM organizations o
  INNER JOIN user_organizations uo ON uo.organization_id = o.id
  WHERE uo.user_id = p_user_id AND o.deleted_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_organization TO authenticated;

-- Function: can_manage_team()
CREATE OR REPLACE FUNCTION can_manage_team(
  p_organization_id UUID,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_manage_team TO authenticated;

-- Function: update_organization_timestamp()
CREATE OR REPLACE FUNCTION update_organization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 3: CREATE TRIGGERS
-- =====================================================

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_organization_timestamp();

-- =====================================================
-- PART 4: ENABLE RLS AND CREATE POLICIES
-- (All tables now exist, so policies can reference them)
-- =====================================================

-- AUDIT_LOGS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- ORGANIZATIONS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Owners can delete organization"
  ON organizations FOR DELETE
  USING (
    id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- USER_ORGANIZATIONS
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their memberships"
  ON user_organizations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view organization members"
  ON user_organizations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can add members"
  ON user_organizations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners and admins can remove members"
  ON user_organizations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations uo
      WHERE uo.user_id = auth.uid() AND uo.role IN ('owner', 'admin')
    )
    AND role != 'owner'
    AND user_id != auth.uid()
  );

CREATE POLICY "Owners can update member roles"
  ON user_organizations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    AND role != 'owner'
  );

-- TEAM_INVITATIONS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can view invitations"
  ON team_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team admins can create invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can accept invitations with valid token"
  ON team_invitations FOR UPDATE
  USING (accepted_at IS NULL AND expires_at > NOW());

CREATE POLICY "Team admins can revoke invitations"
  ON team_invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- CUSTOM_TEMPLATES
ALTER TABLE custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org templates"
  ON custom_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create templates"
  ON custom_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their templates"
  ON custom_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their templates"
  ON custom_templates FOR DELETE
  USING (user_id = auth.uid());

-- TEMPLATE_FIELDS
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template fields"
  ON template_fields FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM custom_templates
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- CALLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's calls"
  ON calls FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations
      WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create calls"
  ON calls FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their calls"
  ON calls FOR UPDATE
  USING (user_id = auth.uid());

-- TRANSCRIPTS
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transcripts for accessible calls"
  ON transcripts FOR SELECT
  USING (
    call_id IN (
      SELECT id FROM calls
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
      OR user_id = auth.uid()
    )
  );

-- TRANSCRIPT_UTTERANCES
ALTER TABLE transcript_utterances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view utterances for accessible transcripts"
  ON transcript_utterances FOR SELECT
  USING (
    transcript_id IN (
      SELECT t.id FROM transcripts t
      JOIN calls c ON t.call_id = c.id
      WHERE c.organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
      OR c.user_id = auth.uid()
    )
  );

-- CALL_INSIGHTS
ALTER TABLE call_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view insights for accessible calls"
  ON call_insights FOR SELECT
  USING (
    call_id IN (
      SELECT id FROM calls
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
      OR user_id = auth.uid()
    )
  );

-- CALL_FIELDS
ALTER TABLE call_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call fields for accessible calls"
  ON call_fields FOR SELECT
  USING (
    call_id IN (
      SELECT id FROM calls
      WHERE organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
      )
      OR user_id = auth.uid()
    )
  );

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
  CASE
    WHEN COUNT(*) = 12 THEN '✅ All 12 tables created successfully!'
    ELSE '⚠️ Only ' || COUNT(*)::text || '/12 tables created'
  END as tables_status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'audit_logs', 'organizations', 'user_organizations', 'team_invitations',
    'custom_templates', 'template_fields', 'calls', 'transcripts',
    'transcript_utterances', 'call_insights', 'call_fields', 'notifications'
  );

SELECT
  CASE
    WHEN COUNT(*) = 4 THEN '✅ All 4 functions created successfully!'
    ELSE '⚠️ Only ' || COUNT(*)::text || '/4 functions created'
  END as functions_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('log_audit', 'get_user_organization', 'can_manage_team', 'update_organization_timestamp');

SELECT
  CASE
    WHEN COUNT(*) = 12 THEN '✅ RLS enabled on all 12 tables!'
    ELSE '⚠️ RLS only on ' || COUNT(*)::text || '/12 tables'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename IN (
    'audit_logs', 'organizations', 'user_organizations', 'team_invitations',
    'custom_templates', 'template_fields', 'calls', 'transcripts',
    'transcript_utterances', 'call_insights', 'call_fields', 'notifications'
  );

SELECT '🎉 Database schema created successfully!' as message;
SELECT 'Next: Delete test users and test signup at http://localhost:3000/signup' as next_step;
