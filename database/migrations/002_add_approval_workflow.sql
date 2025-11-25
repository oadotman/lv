-- =====================================================
-- MIGRATION: Add Human-in-the-Loop Approval Workflow
-- Version: 002
-- Date: 2025-01-24
-- Description: Adds review and approval capabilities for transcriptions and extractions
-- =====================================================

-- =====================================================
-- 1. UPDATE CALL STATUS ENUM
-- Add new status states for review workflow
-- =====================================================

-- Drop existing constraint
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_status_check;

-- Add new constraint with additional status values
ALTER TABLE calls ADD CONSTRAINT calls_status_check
  CHECK (status IN (
    'uploading',      -- Initial upload state
    'processing',     -- General processing state
    'transcribing',   -- AssemblyAI transcription in progress
    'transcribed',    -- Transcription complete, awaiting review
    'pending_review', -- Flagged for human review
    'in_review',      -- Currently being reviewed by user
    'approved',       -- User approved, ready for extraction/use
    'extracting',     -- GPT-4o extraction in progress
    'completed',      -- All processing complete
    'rejected',       -- User rejected, needs attention
    'failed'          -- Processing failed
  ));

-- =====================================================
-- 2. ADD APPROVAL WORKFLOW FIELDS TO CALLS TABLE
-- =====================================================

-- Approval tracking
ALTER TABLE calls ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS approval_status TEXT
  CHECK (approval_status IN ('pending', 'approved', 'rejected', NULL));
ALTER TABLE calls ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Review triggers
ALTER TABLE calls ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT FALSE;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS review_trigger_reason TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;

-- Quality metrics (for review decisions)
ALTER TABLE calls ADD COLUMN IF NOT EXISTS transcription_quality_score NUMERIC(5,2);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS extraction_quality_score NUMERIC(5,2);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS low_confidence_fields_count INTEGER DEFAULT 0;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calls_approval_status ON calls(approval_status);
CREATE INDEX IF NOT EXISTS idx_calls_requires_review ON calls(requires_review) WHERE requires_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_calls_status_pending_review ON calls(status) WHERE status IN ('transcribed', 'pending_review');
CREATE INDEX IF NOT EXISTS idx_calls_reviewed_by ON calls(reviewed_by);

-- =====================================================
-- 3. CREATE CALL EDITS HISTORY TABLE
-- Track all manual edits made by users
-- =====================================================

CREATE TABLE IF NOT EXISTS call_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What was edited
  edit_type TEXT NOT NULL CHECK (edit_type IN (
    'transcript',       -- Edited transcript text
    'field',           -- Edited CRM field
    'speaker_mapping', -- Corrected speaker labels
    'notes',           -- Added manual notes
    'approval',        -- Approved/rejected
    'quality_override' -- Manual quality override
  )),

  -- Edit details
  field_name TEXT,           -- Which field was edited (for 'field' type)
  old_value TEXT,            -- Previous value
  new_value TEXT,            -- New value
  edit_reason TEXT,          -- Why the edit was made

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_edits_call_id ON call_edits(call_id);
CREATE INDEX IF NOT EXISTS idx_call_edits_user_id ON call_edits(user_id);
CREATE INDEX IF NOT EXISTS idx_call_edits_type ON call_edits(edit_type);
CREATE INDEX IF NOT EXISTS idx_call_edits_created_at ON call_edits(created_at DESC);

-- =====================================================
-- 4. CREATE CALL NOTES TABLE
-- Allow users to add manual notes and context
-- =====================================================

CREATE TABLE IF NOT EXISTS call_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Note content
  note_text TEXT NOT NULL,
  note_type TEXT CHECK (note_type IN (
    'general',        -- General note
    'follow_up',      -- Follow-up action
    'correction',     -- Correction to transcript/extraction
    'context',        -- Additional context
    'internal'        -- Internal note (not for export)
  )),

  -- Visibility
  is_internal BOOLEAN DEFAULT FALSE,  -- If true, won't be exported to CRM
  is_pinned BOOLEAN DEFAULT FALSE,    -- Pin important notes to top

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_notes_call_id ON call_notes(call_id);
CREATE INDEX IF NOT EXISTS idx_call_notes_user_id ON call_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_call_notes_pinned ON call_notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_call_notes_created_at ON call_notes(created_at DESC);

-- =====================================================
-- 5. CREATE REVIEW QUEUE VIEW
-- Convenience view for calls needing review
-- =====================================================

CREATE OR REPLACE VIEW calls_pending_review AS
SELECT
  c.id,
  c.user_id,
  c.organization_id,
  c.status,
  c.approval_status,
  c.requires_review,
  c.review_trigger_reason,
  c.transcription_quality_score,
  c.extraction_quality_score,
  c.low_confidence_fields_count,
  c.call_title,
  c.created_at,
  c.updated_at,
  u.email as user_email,
  -- Count of edits made
  (SELECT COUNT(*) FROM call_edits ce WHERE ce.call_id = c.id) as edit_count,
  -- Has manual notes
  (SELECT COUNT(*) > 0 FROM call_notes cn WHERE cn.call_id = c.id) as has_notes
FROM calls c
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE c.status IN ('transcribed', 'pending_review', 'in_review')
  OR c.requires_review = TRUE
ORDER BY
  CASE
    WHEN c.requires_review THEN 0
    ELSE 1
  END,
  c.created_at DESC;

-- =====================================================
-- 6. CREATE QUALITY METRICS VIEW
-- Convenience view for quality analysis
-- =====================================================

CREATE OR REPLACE VIEW call_quality_metrics AS
SELECT
  c.id,
  c.user_id,
  c.organization_id,
  c.status,
  c.call_title,
  c.transcription_quality_score,
  c.extraction_quality_score,
  c.low_confidence_fields_count,
  c.requires_review,
  c.review_trigger_reason,
  -- Transcript stats
  t.confidence_score as transcript_confidence,
  t.word_count,
  t.sentiment_overall,
  -- Field stats
  (SELECT COUNT(*) FROM call_fields cf WHERE cf.call_id = c.id) as total_fields,
  (SELECT COUNT(*) FROM call_fields cf WHERE cf.call_id = c.id AND cf.confidence_score < 0.7) as low_confidence_fields,
  (SELECT AVG(cf.confidence_score) FROM call_fields cf WHERE cf.call_id = c.id) as avg_field_confidence,
  -- Review status
  c.reviewed_by,
  c.reviewed_at,
  c.approval_status,
  c.auto_approved,
  -- Timing
  c.created_at,
  c.updated_at
FROM calls c
LEFT JOIN transcripts t ON c.id = t.call_id
WHERE c.status IN ('transcribed', 'pending_review', 'in_review', 'approved', 'completed');

-- =====================================================
-- 7. ADD ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE call_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_notes ENABLE ROW LEVEL SECURITY;

-- Call edits policies
CREATE POLICY "Users can view their own call edits"
  ON call_edits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_edits.call_id
      AND (calls.user_id = auth.uid() OR calls.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create call edits for their calls"
  ON call_edits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_edits.call_id
      AND (calls.user_id = auth.uid() OR calls.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Call notes policies
CREATE POLICY "Users can view their own call notes"
  ON call_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_notes.call_id
      AND (calls.user_id = auth.uid() OR calls.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create call notes for their calls"
  ON call_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_notes.call_id
      AND (calls.user_id = auth.uid() OR calls.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can update their own call notes"
  ON call_notes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own call notes"
  ON call_notes FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 8. ADD HELPFUL COMMENTS
-- =====================================================

COMMENT ON COLUMN calls.reviewed_by IS 'User who reviewed and approved/rejected this call';
COMMENT ON COLUMN calls.reviewed_at IS 'Timestamp when call was reviewed';
COMMENT ON COLUMN calls.approval_status IS 'Current approval status: pending, approved, rejected';
COMMENT ON COLUMN calls.review_notes IS 'Notes from reviewer about their decision';
COMMENT ON COLUMN calls.requires_review IS 'Flag indicating if this call needs human review';
COMMENT ON COLUMN calls.review_trigger_reason IS 'Why this call was flagged for review (low confidence, high value, etc.)';
COMMENT ON COLUMN calls.auto_approved IS 'If true, call was automatically approved (no triggers met)';
COMMENT ON COLUMN calls.transcription_quality_score IS 'Overall quality score for transcription (0-100)';
COMMENT ON COLUMN calls.extraction_quality_score IS 'Overall quality score for CRM extraction (0-100)';
COMMENT ON COLUMN calls.low_confidence_fields_count IS 'Number of extracted fields with confidence < 0.7';

COMMENT ON TABLE call_edits IS 'Audit trail of all manual edits made to calls, transcripts, and fields';
COMMENT ON TABLE call_notes IS 'User-added notes and context for calls';
COMMENT ON VIEW calls_pending_review IS 'All calls currently in review queue';
COMMENT ON VIEW call_quality_metrics IS 'Quality metrics and confidence scores for all calls';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
