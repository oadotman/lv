-- =====================================================
-- COMPLIANCE AUDIT TABLES - FIXED VERSION
-- Track all compliance-related decisions and disclaimers
-- For legal protection and audit trail
-- Fixed: Corrected index syntax
-- =====================================================

-- =====================================================
-- 1. COMPLIANCE MODE CHANGES
-- Track every time someone changes recording disclosure settings
-- =====================================================
CREATE TABLE IF NOT EXISTS public.compliance_mode_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References auth.users, no FK
  user_email TEXT NOT NULL,

  -- Mode change details
  previous_mode TEXT NOT NULL CHECK (previous_mode IN ('always', 'smart', 'never')),
  new_mode TEXT NOT NULL CHECK (new_mode IN ('always', 'smart', 'never')),

  -- Legal tracking
  disclaimer_accepted BOOLEAN DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp (immutable)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes separately (correct syntax)
CREATE INDEX idx_compliance_mode_org ON public.compliance_mode_changes(organization_id);
CREATE INDEX idx_compliance_mode_user ON public.compliance_mode_changes(user_id);
CREATE INDEX idx_compliance_mode_timestamp ON public.compliance_mode_changes(timestamp DESC);

-- Enable RLS
ALTER TABLE public.compliance_mode_changes ENABLE ROW LEVEL SECURITY;

-- Only admins can view compliance changes
CREATE POLICY "Admins can view compliance changes" ON public.compliance_mode_changes
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 2. LEGAL DISCLAIMER ACCEPTANCES
-- Track all legal disclaimer acceptances
-- =====================================================
CREATE TABLE IF NOT EXISTS public.legal_disclaimer_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References auth.users, no FK
  user_email TEXT NOT NULL,

  -- Disclaimer details
  disclaimer_type TEXT NOT NULL,
  disclaimer_version TEXT NOT NULL,
  disclaimer_text TEXT NOT NULL, -- Full text of what they agreed to

  -- Acceptance details
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address TEXT,
  user_agent TEXT,

  -- Additional context
  metadata JSONB
);

-- Create indexes separately
CREATE INDEX idx_disclaimer_org ON public.legal_disclaimer_acceptances(organization_id);
CREATE INDEX idx_disclaimer_user ON public.legal_disclaimer_acceptances(user_id);
CREATE INDEX idx_disclaimer_type ON public.legal_disclaimer_acceptances(disclaimer_type);
CREATE INDEX idx_disclaimer_accepted_at ON public.legal_disclaimer_acceptances(accepted_at DESC);

-- Enable RLS
ALTER TABLE public.legal_disclaimer_acceptances ENABLE ROW LEVEL SECURITY;

-- Only the user who accepted and admins can view
CREATE POLICY "Users can view their own acceptances" ON public.legal_disclaimer_acceptances
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 3. COMPLIANCE VIOLATIONS LOG
-- Track potential compliance violations for internal review
-- =====================================================
CREATE TABLE IF NOT EXISTS public.compliance_violations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,

  -- Violation details
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,

  -- Related entities
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  user_id UUID,

  -- Detection details
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  detection_method TEXT,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,

  -- Evidence
  evidence JSONB
);

-- Create indexes separately
CREATE INDEX idx_violations_org ON public.compliance_violations(organization_id);
CREATE INDEX idx_violations_severity ON public.compliance_violations(severity);
CREATE INDEX idx_violations_resolved ON public.compliance_violations(resolved);
CREATE INDEX idx_violations_detected_at ON public.compliance_violations(detected_at DESC);

-- Enable RLS
ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;

-- Only super admins can view violations
CREATE POLICY "Super admins can view violations" ON public.compliance_violations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE user_id = auth.uid()
      AND role = 'owner'
      AND organization_id = '00000000-0000-0000-0000-000000000000' -- System org
    )
  );

-- =====================================================
-- 4. AUDIT SUMMARY VIEW
-- Provides a comprehensive audit trail
-- =====================================================
CREATE OR REPLACE VIEW public.compliance_audit_summary AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  o.always_announce_recording,
  o.never_announce_recording,

  -- Recent mode changes
  (
    SELECT json_agg(json_build_object(
      'timestamp', timestamp,
      'user_email', user_email,
      'previous_mode', previous_mode,
      'new_mode', new_mode,
      'disclaimer_accepted', disclaimer_accepted
    ) ORDER BY timestamp DESC)
    FROM public.compliance_mode_changes
    WHERE organization_id = o.id
    LIMIT 10
  ) as recent_mode_changes,

  -- Disclaimer acceptances
  (
    SELECT COUNT(*)
    FROM public.legal_disclaimer_acceptances
    WHERE organization_id = o.id
    AND disclaimer_type = 'recording_disclosure_disabled'
  ) as disclaimer_acceptance_count,

  -- Last disclaimer acceptance
  (
    SELECT json_build_object(
      'user_email', user_email,
      'accepted_at', accepted_at,
      'ip_address', ip_address
    )
    FROM public.legal_disclaimer_acceptances
    WHERE organization_id = o.id
    AND disclaimer_type = 'recording_disclosure_disabled'
    ORDER BY accepted_at DESC
    LIMIT 1
  ) as last_disclaimer_acceptance,

  -- Compliance stats
  (
    SELECT COUNT(*)
    FROM public.twilio_calls
    WHERE organization_id = o.id
    AND is_two_party_consent_state = true
    AND recording_disclosure_played = false
    AND created_at >= NOW() - INTERVAL '30 days'
  ) as potential_violations_30d

FROM public.organizations o;

-- Grant permissions
GRANT SELECT ON public.compliance_audit_summary TO authenticated;

-- =====================================================
-- 5. TRIGGER TO PREVENT DELETION OF AUDIT RECORDS
-- These records must be immutable for legal protection
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_audit_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit records cannot be deleted for legal compliance reasons';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to audit tables
CREATE TRIGGER prevent_compliance_mode_deletion
  BEFORE DELETE ON public.compliance_mode_changes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_deletion();

CREATE TRIGGER prevent_disclaimer_deletion
  BEFORE DELETE ON public.legal_disclaimer_acceptances
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_deletion();

-- =====================================================
-- 6. FUNCTION TO LOG COMPLIANCE MODE CHANGE
-- Helper function for easy logging
-- =====================================================
CREATE OR REPLACE FUNCTION log_compliance_mode_change(
  p_org_id UUID,
  p_user_id UUID,
  p_user_email TEXT,
  p_previous_mode TEXT,
  p_new_mode TEXT,
  p_disclaimer_accepted BOOLEAN DEFAULT false,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_change_id UUID;
BEGIN
  INSERT INTO public.compliance_mode_changes (
    organization_id,
    user_id,
    user_email,
    previous_mode,
    new_mode,
    disclaimer_accepted,
    ip_address,
    user_agent
  ) VALUES (
    p_org_id,
    p_user_id,
    p_user_email,
    p_previous_mode,
    p_new_mode,
    p_disclaimer_accepted,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_change_id;

  -- If switching to "never" without disclaimer, log a potential violation
  IF p_new_mode = 'never' AND NOT p_disclaimer_accepted THEN
    INSERT INTO public.compliance_violations (
      organization_id,
      violation_type,
      severity,
      description,
      user_id,
      evidence
    ) VALUES (
      p_org_id,
      'disclaimer_not_accepted',
      'high',
      'User switched to never announce mode without accepting legal disclaimer',
      p_user_id,
      json_build_object(
        'change_id', v_change_id,
        'user_email', p_user_email,
        'timestamp', NOW()
      )
    );
  END IF;

  RETURN v_change_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_compliance_mode_change TO authenticated;

-- =====================================================
-- 7. ALERT ON HIGH-RISK CONFIGURATIONS
-- =====================================================
CREATE OR REPLACE FUNCTION check_compliance_risk()
RETURNS TRIGGER AS $$
BEGIN
  -- If organization disables announcements, create an alert
  IF NEW.never_announce_recording = true AND (OLD.never_announce_recording = false OR OLD.never_announce_recording IS NULL) THEN
    -- Check if system_alerts table exists before trying to insert
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_alerts') THEN
      INSERT INTO public.system_alerts (
        alert_type,
        severity,
        title,
        message,
        organization_id,
        metadata
      ) VALUES (
        'compliance_risk',
        'high',
        'Recording Disclosure Disabled',
        format('Organization %s has disabled recording disclosure announcements', NEW.name),
        NEW.id,
        json_build_object(
          'previous_setting', COALESCE(OLD.never_announce_recording, false),
          'new_setting', NEW.never_announce_recording,
          'timestamp', NOW()
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER monitor_compliance_settings
  AFTER UPDATE ON public.organizations
  FOR EACH ROW
  WHEN (OLD.never_announce_recording IS DISTINCT FROM NEW.never_announce_recording)
  EXECUTE FUNCTION check_compliance_risk();

-- =====================================================
-- 8. COMPLIANCE REPORT FUNCTION
-- Generate comprehensive compliance report for legal review
-- =====================================================
CREATE OR REPLACE FUNCTION generate_compliance_report(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  report_date DATE,
  organization_name TEXT,
  total_calls BIGINT,
  calls_with_disclosure BIGINT,
  calls_without_disclosure BIGINT,
  two_party_state_calls BIGINT,
  compliance_rate NUMERIC,
  mode_changes JSON,
  disclaimer_acceptances JSON,
  potential_violations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CURRENT_DATE as report_date,
    o.name as organization_name,
    COUNT(tc.*)::BIGINT as total_calls,
    COUNT(*) FILTER (WHERE tc.recording_disclosure_played = true)::BIGINT as calls_with_disclosure,
    COUNT(*) FILTER (WHERE tc.recording_disclosure_played = false)::BIGINT as calls_without_disclosure,
    COUNT(*) FILTER (WHERE tc.is_two_party_consent_state = true)::BIGINT as two_party_state_calls,
    CASE
      WHEN COUNT(*) FILTER (WHERE tc.is_two_party_consent_state = true) > 0 THEN
        ROUND(
          COUNT(*) FILTER (WHERE tc.is_two_party_consent_state = true AND tc.recording_disclosure_played = true)::NUMERIC /
          COUNT(*) FILTER (WHERE tc.is_two_party_consent_state = true)::NUMERIC * 100,
          2
        )
      ELSE 100.00
    END as compliance_rate,
    (
      SELECT json_agg(row_to_json(cmc.*))
      FROM public.compliance_mode_changes cmc
      WHERE cmc.organization_id = p_organization_id
      AND cmc.timestamp::DATE BETWEEN p_start_date AND p_end_date
    ) as mode_changes,
    (
      SELECT json_agg(row_to_json(lda.*))
      FROM public.legal_disclaimer_acceptances lda
      WHERE lda.organization_id = p_organization_id
      AND lda.accepted_at::DATE BETWEEN p_start_date AND p_end_date
    ) as disclaimer_acceptances,
    COUNT(*) FILTER (
      WHERE tc.is_two_party_consent_state = true
      AND tc.recording_disclosure_played = false
    )::BIGINT as potential_violations
  FROM public.organizations o
  LEFT JOIN public.twilio_calls tc ON tc.organization_id = o.id
    AND tc.created_at::DATE BETWEEN p_start_date AND p_end_date
  WHERE o.id = p_organization_id
  GROUP BY o.id, o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_compliance_report TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- This adds comprehensive audit logging for compliance
-- =====================================================