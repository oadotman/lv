-- =====================================================
-- ADD PROCESSING TRACKING COLUMNS
-- Tracks retry attempts and processing errors
-- =====================================================

-- Add columns to track processing attempts and errors
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS processing_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS last_processing_attempt TIMESTAMPTZ;

-- Add index for finding stuck calls
CREATE INDEX IF NOT EXISTS idx_calls_stuck_processing
ON calls(status, updated_at)
WHERE status = 'processing';

-- Add index for finding failed calls that need retry
CREATE INDEX IF NOT EXISTS idx_calls_failed_retry
ON calls(status, processing_attempts)
WHERE status = 'failed' AND processing_attempts < 3;

-- Function to get calls needing retry
CREATE OR REPLACE FUNCTION get_calls_needing_retry()
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  processing_attempts INTEGER,
  last_error TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.file_name,
    c.processing_attempts,
    c.processing_error as last_error,
    c.created_at
  FROM calls c
  WHERE c.status IN ('processing', 'failed')
    AND c.processing_attempts < 3
    AND (
      -- Stuck in processing for more than 10 minutes
      (c.status = 'processing' AND c.updated_at < NOW() - INTERVAL '10 minutes')
      OR
      -- Failed but can be retried
      (c.status = 'failed' AND c.processing_attempts < 3)
    )
    AND c.deleted_at IS NULL
  ORDER BY c.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_calls_needing_retry TO authenticated;

-- Add comment
COMMENT ON COLUMN calls.processing_attempts IS 'Number of times processing has been attempted';
COMMENT ON COLUMN calls.processing_error IS 'Last processing error message';
COMMENT ON COLUMN calls.last_processing_attempt IS 'Timestamp of last processing attempt';

-- Success message
SELECT '✅ Processing tracking columns added successfully' as status;