-- =====================================================
-- USER CORRECTIONS TABLE - FIXED VERSION
-- Store user corrections for continuous model improvement
-- Fixed to work with Supabase Auth (no public.users table)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Reference to the original call
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- What was corrected
  field_name TEXT NOT NULL, -- e.g., 'origin_city', 'carrier_name', 'rate'
  original_value TEXT, -- What the AI extracted
  corrected_value TEXT NOT NULL, -- What the user corrected it to

  -- Context for improvement
  correction_type TEXT CHECK (correction_type IN (
    'extraction_error', -- AI extracted wrong value
    'missing_field', -- AI missed this field
    'classification_error', -- Wrong call type
    'context_misunderstanding' -- Misunderstood context
  )),

  -- Optional feedback
  user_feedback TEXT,

  -- Who and when
  corrected_by UUID NOT NULL, -- References auth.users, no FK constraint
  corrected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- For tracking patterns
  confidence_score DECIMAL(3,2), -- Original AI confidence if available
  correction_applied BOOLEAN DEFAULT false, -- Has this been used to improve the model

  -- Metadata
  metadata JSONB DEFAULT '{}' -- Store additional context
);

-- Indexes for analysis
CREATE INDEX idx_user_corrections_call_id ON public.user_corrections(call_id);
CREATE INDEX idx_user_corrections_field_name ON public.user_corrections(field_name);
CREATE INDEX idx_user_corrections_correction_type ON public.user_corrections(correction_type);
CREATE INDEX idx_user_corrections_corrected_at ON public.user_corrections(corrected_at DESC);
CREATE INDEX idx_user_corrections_organization_id ON public.user_corrections(organization_id);

-- Row Level Security
ALTER TABLE public.user_corrections ENABLE ROW LEVEL SECURITY;

-- Users can view corrections for their organization
CREATE POLICY "Users can view their org corrections" ON public.user_corrections
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Users can create corrections for their organization
CREATE POLICY "Users can create corrections" ON public.user_corrections
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
    AND corrected_by = auth.uid()
  );

-- =====================================================
-- CORRECTION PATTERNS VIEW
-- Helps identify common mistakes
-- =====================================================

CREATE OR REPLACE VIEW public.correction_patterns AS
SELECT
  field_name,
  correction_type,
  COUNT(*) as correction_count,
  COUNT(DISTINCT organization_id) as affected_orgs,
  AVG(confidence_score) as avg_original_confidence,
  ARRAY_AGG(DISTINCT original_value ORDER BY original_value)
    FILTER (WHERE original_value IS NOT NULL) as common_original_values,
  ARRAY_AGG(DISTINCT corrected_value ORDER BY corrected_value)
    FILTER (WHERE corrected_value IS NOT NULL) as common_corrected_values
FROM public.user_corrections
WHERE corrected_at > NOW() - INTERVAL '30 days'
GROUP BY field_name, correction_type
HAVING COUNT(*) >= 3 -- Only show patterns with at least 3 occurrences
ORDER BY correction_count DESC;

-- =====================================================
-- FUNCTION: Log a correction
-- Helper function to make logging corrections easier
-- =====================================================

CREATE OR REPLACE FUNCTION log_user_correction(
  p_call_id UUID,
  p_field_name TEXT,
  p_original_value TEXT,
  p_corrected_value TEXT,
  p_correction_type TEXT DEFAULT 'extraction_error',
  p_feedback TEXT DEFAULT NULL,
  p_confidence DECIMAL DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_correction_id UUID;
BEGIN
  -- Get organization ID from the call
  SELECT organization_id INTO v_org_id
  FROM public.calls
  WHERE id = p_call_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Call not found: %', p_call_id;
  END IF;

  -- Insert the correction
  INSERT INTO public.user_corrections (
    call_id,
    organization_id,
    field_name,
    original_value,
    corrected_value,
    correction_type,
    user_feedback,
    corrected_by,
    confidence_score
  ) VALUES (
    p_call_id,
    v_org_id,
    p_field_name,
    p_original_value,
    p_corrected_value,
    p_correction_type,
    p_feedback,
    auth.uid(),
    p_confidence
  ) RETURNING id INTO v_correction_id;

  RETURN v_correction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.correction_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_correction TO authenticated;