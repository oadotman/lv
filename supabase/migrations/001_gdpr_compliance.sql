-- =====================================================
-- GDPR COMPLIANCE DATABASE SCHEMA
-- Audit logs, data deletion requests, consents, etc.
-- =====================================================

-- =====================================================
-- AUDIT LOGS TABLE
-- Comprehensive audit trail for compliance
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- TEXT to support 'system' and 'deleted_user'
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid()::text OR user_id = 'system');

-- Policy: System can insert audit logs
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- DATA DELETION REQUESTS TABLE
-- Tracks GDPR deletion requests with 30-day grace period
-- =====================================================
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  deleted_data_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for deletion requests
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled ON data_deletion_requests(scheduled_for);

-- Enable Row Level Security
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own deletion requests
CREATE POLICY deletion_requests_select_policy ON data_deletion_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create their own deletion requests
CREATE POLICY deletion_requests_insert_policy ON data_deletion_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: System can update deletion requests
CREATE POLICY deletion_requests_update_policy ON data_deletion_requests
  FOR UPDATE
  USING (true);

-- =====================================================
-- DATA EXPORT REQUESTS TABLE
-- Tracks GDPR data export requests
-- =====================================================
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  format TEXT NOT NULL CHECK (format IN ('json', 'csv')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for export requests
CREATE INDEX IF NOT EXISTS idx_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_export_requests_expires ON data_export_requests(expires_at);

-- Enable Row Level Security
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own export requests
CREATE POLICY export_requests_select_policy ON data_export_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can create their own export requests
CREATE POLICY export_requests_insert_policy ON data_export_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- USER CONSENTS TABLE
-- Tracks user consent for data processing (GDPR Article 7)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'terms_of_service',
    'privacy_policy',
    'marketing_emails',
    'analytics',
    'data_processing'
  )),
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

-- Indexes for consents
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);

-- Enable Row Level Security
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own consents
CREATE POLICY user_consents_select_policy ON user_consents
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can manage their own consents
CREATE POLICY user_consents_insert_policy ON user_consents
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_consents_update_policy ON user_consents
  FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- DATA PROCESSING RECORDS TABLE
-- Tracks data processing activities (GDPR Article 30)
-- =====================================================
CREATE TABLE IF NOT EXISTS data_processing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  processing_activity TEXT NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'consent',
    'contract',
    'legal_obligation',
    'vital_interests',
    'public_task',
    'legitimate_interests'
  )),
  data_categories TEXT[] NOT NULL,
  retention_period TEXT,
  third_party_recipients TEXT[],
  cross_border_transfer BOOLEAN DEFAULT false,
  safeguards TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for processing records
CREATE INDEX IF NOT EXISTS idx_processing_records_user_id ON data_processing_records(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_records_activity ON data_processing_records(processing_activity);

-- Enable Row Level Security
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own processing records
CREATE POLICY processing_records_select_policy ON data_processing_records
  FOR SELECT
  USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_data_deletion_requests_updated_at
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_export_requests_updated_at
  BEFORE UPDATE ON data_export_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON user_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RETENTION POLICY FUNCTION
-- Automatically delete old audit logs (called by cron)
-- =====================================================
CREATE OR REPLACE FUNCTION apply_audit_log_retention()
RETURNS void AS $$
BEGIN
  -- Anonymize audit logs older than 7 years (legal requirement)
  UPDATE audit_logs
  SET
    ip_address = 'redacted',
    user_agent = 'redacted',
    metadata = jsonb_set(metadata, '{archived}', 'true'::jsonb)
  WHERE
    created_at < NOW() - INTERVAL '7 years'
    AND ip_address IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP EXPIRED EXPORT REQUESTS
-- Remove expired data export download URLs
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS void AS $$
BEGIN
  DELETE FROM data_export_requests
  WHERE
    status = 'completed'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE data_deletion_requests IS 'Tracks GDPR Right to be Forgotten requests with 30-day grace period';
COMMENT ON TABLE data_export_requests IS 'Tracks GDPR Right to Data Portability requests';
COMMENT ON TABLE user_consents IS 'Tracks user consent for data processing activities';
COMMENT ON TABLE data_processing_records IS 'Records of Processing Activities (GDPR Article 30)';
