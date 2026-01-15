-- =====================================================
-- RECORDING DISCLOSURE SETTINGS - FIXED VERSION
-- Adds configuration for legal compliance with two-party consent states
-- Fixed: Removed non-immutable function from index
-- =====================================================

-- Add recording disclosure settings to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS always_announce_recording BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS never_announce_recording BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recording_disclosure_message TEXT,
ADD COLUMN IF NOT EXISTS recording_consent_states TEXT[] DEFAULT ARRAY['CA','CT','FL','IL','MD','MA','MI','MT','NV','NH','PA','WA'];

-- Add constraint to prevent both always and never being true
ALTER TABLE public.organizations
ADD CONSTRAINT check_recording_announcement_flags
CHECK (NOT (always_announce_recording = true AND never_announce_recording = true));

-- Add comments for clarity
COMMENT ON COLUMN public.organizations.always_announce_recording IS 'Always play recording disclosure regardless of state (recommended for compliance)';
COMMENT ON COLUMN public.organizations.never_announce_recording IS 'Never play recording disclosure (use at your own legal risk)';
COMMENT ON COLUMN public.organizations.recording_disclosure_message IS 'Custom message to play when announcing recording. Defaults to standard message if NULL';
COMMENT ON COLUMN public.organizations.recording_consent_states IS 'List of states that require two-party consent for recording';

-- Update existing organizations to default to safe settings
UPDATE public.organizations
SET
  always_announce_recording = true,
  never_announce_recording = false,
  recording_disclosure_message = NULL
WHERE always_announce_recording IS NULL;

-- Add recording disclosure tracking to twilio_calls metadata
-- This is already handled in the raw_webhook_data JSONB field, but let's add dedicated columns for reporting
ALTER TABLE public.twilio_calls
ADD COLUMN IF NOT EXISTS recording_disclosure_played BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS caller_state TEXT,
ADD COLUMN IF NOT EXISTS is_two_party_consent_state BOOLEAN DEFAULT false;

-- Create a view for compliance reporting
CREATE OR REPLACE VIEW public.recording_compliance_audit AS
SELECT
  tc.id,
  tc.organization_id,
  o.name as organization_name,
  tc.twilio_call_sid,
  tc.from_number,
  tc.to_number,
  tc.direction,
  tc.created_at,
  tc.recording_disclosure_played,
  tc.caller_state,
  tc.is_two_party_consent_state,
  o.always_announce_recording as org_always_announce,
  o.never_announce_recording as org_never_announce,
  CASE
    WHEN tc.recording_disclosure_played THEN 'Compliant'
    WHEN tc.is_two_party_consent_state AND NOT tc.recording_disclosure_played THEN 'Non-Compliant - Two-Party State'
    WHEN o.never_announce_recording THEN 'Disabled by Organization'
    ELSE 'One-Party Consent State'
  END as compliance_status
FROM public.twilio_calls tc
JOIN public.organizations o ON tc.organization_id = o.id
WHERE tc.created_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'
ORDER BY tc.created_at DESC;

-- Grant permissions
GRANT SELECT ON public.recording_compliance_audit TO authenticated;

-- Function to check if a phone number is from a two-party consent state
-- This is a simplified version - in production, you'd use a proper area code to state mapping
CREATE OR REPLACE FUNCTION is_two_party_consent_number(phone_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  two_party_states TEXT[] := ARRAY['CA','CT','FL','IL','MD','MA','MI','MT','NV','NH','PA','WA'];
  -- This would need a proper area code to state mapping table in production
BEGIN
  -- For now, return NULL as we can't determine without proper mapping
  -- Twilio provides FromState and ToState in webhooks which is more reliable
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add an index for compliance queries
-- FIXED: Removed WHERE clause with NOW() function
-- Instead, create a simple index without the date filter
CREATE INDEX IF NOT EXISTS idx_twilio_calls_compliance
ON public.twilio_calls(organization_id, is_two_party_consent_state, recording_disclosure_played, created_at DESC);

-- Add a compliance summary function for reporting
CREATE OR REPLACE FUNCTION get_recording_compliance_summary(
  p_organization_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_calls BIGINT,
  calls_with_disclosure BIGINT,
  calls_without_disclosure BIGINT,
  two_party_state_calls BIGINT,
  compliant_two_party_calls BIGINT,
  non_compliant_calls BIGINT,
  compliance_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_calls,
    COUNT(*) FILTER (WHERE recording_disclosure_played = true)::BIGINT as calls_with_disclosure,
    COUNT(*) FILTER (WHERE recording_disclosure_played = false)::BIGINT as calls_without_disclosure,
    COUNT(*) FILTER (WHERE is_two_party_consent_state = true)::BIGINT as two_party_state_calls,
    COUNT(*) FILTER (WHERE is_two_party_consent_state = true AND recording_disclosure_played = true)::BIGINT as compliant_two_party_calls,
    COUNT(*) FILTER (WHERE is_two_party_consent_state = true AND recording_disclosure_played = false)::BIGINT as non_compliant_calls,
    CASE
      WHEN COUNT(*) FILTER (WHERE is_two_party_consent_state = true) > 0 THEN
        ROUND(
          COUNT(*) FILTER (WHERE is_two_party_consent_state = true AND recording_disclosure_played = true)::NUMERIC /
          COUNT(*) FILTER (WHERE is_two_party_consent_state = true)::NUMERIC * 100,
          2
        )
      ELSE 100.00
    END as compliance_rate
  FROM public.twilio_calls
  WHERE organization_id = p_organization_id
    AND created_at >= CURRENT_TIMESTAMP - (p_days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_recording_compliance_summary TO authenticated;