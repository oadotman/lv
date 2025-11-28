-- =====================================================
-- Migration: Add Transcription Progress Tracking
-- Adds real-time progress tracking for transcription
-- =====================================================

-- Add progress tracking columns to calls table
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_message TEXT;

-- Add helpful comment
COMMENT ON COLUMN calls.processing_progress IS 'Transcription progress percentage (0-100)';
COMMENT ON COLUMN calls.processing_message IS 'Current transcription status message';

-- Create index for querying calls by progress (for monitoring)
CREATE INDEX IF NOT EXISTS idx_calls_processing_progress ON calls(processing_progress) WHERE status = 'transcribing';
