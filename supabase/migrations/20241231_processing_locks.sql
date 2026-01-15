-- =====================================================
-- PROCESSING LOCKS TABLE
-- Prevents concurrent job abuse by tracking active processing
-- =====================================================

CREATE TABLE IF NOT EXISTS public.processing_locks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  estimated_minutes INTEGER NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure one lock per call
  CONSTRAINT unique_call_lock UNIQUE (call_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_processing_locks_org ON public.processing_locks(organization_id);
CREATE INDEX idx_processing_locks_locked_at ON public.processing_locks(locked_at);

-- Enable RLS
ALTER TABLE public.processing_locks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their organization's locks
CREATE POLICY "Users can view their org locks" ON public.processing_locks
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Function to clean up stale locks (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_stale_processing_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM public.processing_locks
  WHERE locked_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_stale_processing_locks TO authenticated;