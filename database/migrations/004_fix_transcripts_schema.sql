-- =====================================================
-- FIX TRANSCRIPTS TABLE SCHEMA
-- Adds missing columns required by the processing code
-- =====================================================

-- Add missing columns to transcripts table
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS assemblyai_id TEXT,
ADD COLUMN IF NOT EXISTS text TEXT,
ADD COLUMN IF NOT EXISTS utterances JSONB,
ADD COLUMN IF NOT EXISTS words JSONB,
ADD COLUMN IF NOT EXISTS speaker_mapping JSONB,
ADD COLUMN IF NOT EXISTS speakers_count INTEGER,
ADD COLUMN IF NOT EXISTS audio_duration NUMERIC(10,2);

-- Create index on assemblyai_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_assemblyai ON transcripts(assemblyai_id);

-- Add helpful comments
COMMENT ON COLUMN transcripts.assemblyai_id IS 'AssemblyAI transcript ID for reference';
COMMENT ON COLUMN transcripts.text IS 'Full transcript text';
COMMENT ON COLUMN transcripts.utterances IS 'Array of speaker utterances with timestamps';
COMMENT ON COLUMN transcripts.words IS 'Array of individual words with timestamps';
COMMENT ON COLUMN transcripts.speaker_mapping IS 'Mapping of speaker labels to roles (A/B)';
COMMENT ON COLUMN transcripts.speakers_count IS 'Number of unique speakers detected';
COMMENT ON COLUMN transcripts.audio_duration IS 'Audio duration in seconds';

-- Migrate existing data from full_text to text if needed
UPDATE transcripts SET text = full_text WHERE text IS NULL AND full_text IS NOT NULL;

-- =====================================================
-- FIX CALLS TABLE - ADD MISSING COLUMNS
-- =====================================================

-- Add missing columns to calls table
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS assemblyai_audio_url TEXT,
ADD COLUMN IF NOT EXISTS trim_start NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS trim_end NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_steps TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add helpful comments
COMMENT ON COLUMN calls.assemblyai_audio_url IS 'URL of audio file sent to AssemblyAI';
COMMENT ON COLUMN calls.trim_start IS 'Trim start time in seconds';
COMMENT ON COLUMN calls.trim_end IS 'Trim end time in seconds';
COMMENT ON COLUMN calls.duration_minutes IS 'Call duration in minutes (for billing)';
COMMENT ON COLUMN calls.processed_at IS 'Timestamp when processing completed';
COMMENT ON COLUMN calls.next_steps IS 'Extracted next steps from call';
COMMENT ON COLUMN calls.metadata IS 'Additional metadata (participants, etc)';

-- Create index for processed_at for analytics queries
CREATE INDEX IF NOT EXISTS idx_calls_processed_at ON calls(processed_at) WHERE processed_at IS NOT NULL;

-- =====================================================
-- FIX CALL_FIELDS TABLE - ADD MISSING COLUMNS
-- =====================================================

-- Add missing columns to call_fields table
ALTER TABLE call_fields
ADD COLUMN IF NOT EXISTS field_type TEXT,
ADD COLUMN IF NOT EXISTS source TEXT;

-- Add helpful comments
COMMENT ON COLUMN call_fields.field_type IS 'Field data type (text, json, number, select, etc)';
COMMENT ON COLUMN call_fields.source IS 'AI model used for extraction (gpt-4o, etc)';

-- Create index for source for analytics
CREATE INDEX IF NOT EXISTS idx_call_fields_source ON call_fields(source) WHERE source IS NOT NULL;
