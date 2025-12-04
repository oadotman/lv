-- =====================================================
-- AUTOMATIC STUCK CALL CLEANUP SYSTEM
-- Automatically marks calls as failed after 1 hour stuck
-- =====================================================

-- Function to cleanup stuck calls
CREATE OR REPLACE FUNCTION cleanup_stuck_calls()
RETURNS TABLE (
  cleaned_count INTEGER,
  call_ids UUID[]
) AS $$
DECLARE
  one_hour_ago TIMESTAMPTZ;
  cleaned_ids UUID[];
  cleaned_count_var INTEGER;
BEGIN
  one_hour_ago := NOW() - INTERVAL '1 hour';

  -- Update stuck calls and collect their IDs
  WITH updated_calls AS (
    UPDATE calls
    SET
      status = 'failed',
      processing_error = 'Automatically marked as failed after being stuck for over 1 hour',
      processing_attempts = COALESCE(processing_attempts, 0) + 1,
      last_processing_attempt = NOW(),
      updated_at = NOW()
    WHERE
      status IN ('processing', 'transcribing', 'extracting')
      AND updated_at < one_hour_ago
      AND deleted_at IS NULL
    RETURNING id
  )
  SELECT
    COUNT(*)::INTEGER,
    ARRAY_AGG(id)
  INTO cleaned_count_var, cleaned_ids
  FROM updated_calls;

  -- Log the cleanup action
  IF cleaned_count_var > 0 THEN
    INSERT INTO system_logs (
      log_type,
      message,
      metadata,
      created_at
    ) VALUES (
      'auto_cleanup',
      format('Automatically cleaned up %s stuck calls', cleaned_count_var),
      jsonb_build_object(
        'call_ids', cleaned_ids,
        'cleanup_time', NOW()
      ),
      NOW()
    );
  END IF;

  RETURN QUERY SELECT cleaned_count_var, cleaned_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  log_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for system logs
CREATE INDEX IF NOT EXISTS idx_system_logs_type_created
ON system_logs(log_type, created_at DESC);

-- Function to get stuck calls (for monitoring)
CREATE OR REPLACE FUNCTION get_stuck_calls(minutes_threshold INTEGER DEFAULT 60)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  status TEXT,
  minutes_stuck INTEGER,
  processing_attempts INTEGER,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.file_name,
    c.status,
    EXTRACT(EPOCH FROM (NOW() - c.updated_at))::INTEGER / 60 AS minutes_stuck,
    c.processing_attempts,
    c.updated_at
  FROM calls c
  WHERE c.status IN ('processing', 'transcribing', 'extracting')
    AND c.updated_at < NOW() - (minutes_threshold || ' minutes')::INTERVAL
    AND c.deleted_at IS NULL
  ORDER BY c.updated_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job using pg_cron (if available)
-- This runs every 15 minutes to cleanup stuck calls
-- Note: pg_cron must be enabled in Supabase
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule cleanup job every 15 minutes
    PERFORM cron.schedule(
      'cleanup-stuck-calls',
      '*/15 * * * *',
      'SELECT cleanup_stuck_calls();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available, will need to use external scheduler
    NULL;
END $$;

-- Manual cleanup trigger function (can be called via API)
CREATE OR REPLACE FUNCTION trigger_stuck_call_cleanup()
RETURNS jsonb AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM cleanup_stuck_calls();

  RETURN jsonb_build_object(
    'success', true,
    'cleaned_count', result.cleaned_count,
    'call_ids', result.call_ids,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_stuck_calls TO authenticated;
GRANT EXECUTE ON FUNCTION get_stuck_calls TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_stuck_call_cleanup TO authenticated;

-- Add RLS policies for system_logs
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System logs viewable by authenticated users" ON system_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Success message
SELECT '✅ Auto-cleanup system for stuck calls created successfully' as status;