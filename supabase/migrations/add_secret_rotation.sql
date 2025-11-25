-- =====================================================
-- SECRET ROTATION SYSTEM
-- Stores encrypted secrets with versioning for zero-downtime rotation
-- =====================================================

-- Create secrets table
CREATE TABLE IF NOT EXISTS secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_type TEXT NOT NULL CHECK (secret_type IN (
    'session_secret',
    'csrf_secret',
    'webhook_secret_paddle',
    'webhook_secret_assemblyai',
    'encryption_key'
  )),
  secret_value TEXT NOT NULL, -- Encrypted
  version INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  revocation_reason TEXT,

  -- Ensure only one active secret per type
  CONSTRAINT unique_active_secret UNIQUE (secret_type, is_active)
    DEFERRABLE INITIALLY DEFERRED,

  -- Ensure unique version per type
  CONSTRAINT unique_secret_version UNIQUE (secret_type, version)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_secrets_type ON secrets(secret_type);
CREATE INDEX IF NOT EXISTS idx_secrets_active ON secrets(secret_type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_secrets_expires ON secrets(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_secrets_version ON secrets(secret_type, version);

-- Add comments
COMMENT ON TABLE secrets IS 'Encrypted storage for rotatable secrets with versioning';
COMMENT ON COLUMN secrets.secret_type IS 'Type of secret being stored';
COMMENT ON COLUMN secrets.secret_value IS 'Encrypted secret value (AES-256-GCM)';
COMMENT ON COLUMN secrets.version IS 'Secret version number (incremented on rotation)';
COMMENT ON COLUMN secrets.is_active IS 'Whether this version is currently active';
COMMENT ON COLUMN secrets.expires_at IS 'When this secret expires (NULL = no expiration)';
COMMENT ON COLUMN secrets.rotated_at IS 'When this secret was activated';
COMMENT ON COLUMN secrets.revoked IS 'Whether this secret has been revoked';
COMMENT ON COLUMN secrets.revocation_reason IS 'Reason for revocation (security incident, etc)';

-- Create audit log for secret operations
CREATE TABLE IF NOT EXISTS secret_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_id UUID REFERENCES secrets(id) ON DELETE CASCADE,
  secret_type TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('created', 'activated', 'rotated', 'revoked', 'expired')),
  performed_by TEXT, -- User ID or system
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_secret_audit_log_secret_id ON secret_audit_log(secret_id);
CREATE INDEX IF NOT EXISTS idx_secret_audit_log_type ON secret_audit_log(secret_type);
CREATE INDEX IF NOT EXISTS idx_secret_audit_log_performed_at ON secret_audit_log(performed_at);

COMMENT ON TABLE secret_audit_log IS 'Audit trail for all secret operations';

-- Function to automatically log secret operations
CREATE OR REPLACE FUNCTION log_secret_operation()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO secret_audit_log (secret_id, secret_type, operation, details)
    VALUES (NEW.id, NEW.secret_type, 'created', jsonb_build_object('version', NEW.version));
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log activation
    IF (NEW.is_active = true AND OLD.is_active = false) THEN
      INSERT INTO secret_audit_log (secret_id, secret_type, operation, details)
      VALUES (NEW.id, NEW.secret_type, 'activated', jsonb_build_object('version', NEW.version));
    END IF;

    -- Log revocation
    IF (NEW.revoked = true AND OLD.revoked = false) THEN
      INSERT INTO secret_audit_log (secret_id, secret_type, operation, details)
      VALUES (NEW.id, NEW.secret_type, 'revoked', jsonb_build_object(
        'version', NEW.version,
        'reason', NEW.revocation_reason
      ));
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_log_secret_operation ON secrets;
CREATE TRIGGER trigger_log_secret_operation
  AFTER INSERT OR UPDATE ON secrets
  FOR EACH ROW
  EXECUTE FUNCTION log_secret_operation();

-- Function to clean up expired secrets
CREATE OR REPLACE FUNCTION cleanup_expired_secrets()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete inactive secrets that have expired
  DELETE FROM secrets
  WHERE expires_at < NOW()
    AND is_active = false
    AND revoked = false;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log cleanup operation
  IF deleted_count > 0 THEN
    INSERT INTO secret_audit_log (secret_id, secret_type, operation, details, performed_by)
    VALUES (NULL, 'system', 'expired', jsonb_build_object('count', deleted_count), 'system');
  END IF;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active secret (for use in RLS policies)
CREATE OR REPLACE FUNCTION get_active_secret(p_secret_type TEXT)
RETURNS TEXT AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT secret_value INTO secret_value
  FROM secrets
  WHERE secret_type = p_secret_type
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND revoked = false
  LIMIT 1;

  RETURN secret_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (only service_role should access secrets)
REVOKE ALL ON secrets FROM authenticated;
REVOKE ALL ON secrets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON secrets TO service_role;

REVOKE ALL ON secret_audit_log FROM authenticated;
REVOKE ALL ON secret_audit_log FROM anon;
GRANT SELECT, INSERT ON secret_audit_log TO service_role;

-- Add comments about usage
COMMENT ON FUNCTION cleanup_expired_secrets() IS 'Removes expired inactive secrets, should be called via cron job';
COMMENT ON FUNCTION get_active_secret(TEXT) IS 'Retrieves active secret value for a given type (encrypted)';

-- Create view for monitoring (excludes secret values)
CREATE OR REPLACE VIEW secret_status AS
SELECT
  id,
  secret_type,
  version,
  is_active,
  expires_at,
  CASE
    WHEN expires_at IS NULL THEN false
    WHEN expires_at < NOW() + INTERVAL '30 days' THEN true
    ELSE false
  END as expiring_soon,
  created_at,
  rotated_at,
  revoked,
  revocation_reason
FROM secrets
ORDER BY secret_type, version DESC;

COMMENT ON VIEW secret_status IS 'Monitoring view for secret rotation status (no secret values exposed)';

-- Grant view access to authenticated users (for monitoring dashboard)
GRANT SELECT ON secret_status TO authenticated;