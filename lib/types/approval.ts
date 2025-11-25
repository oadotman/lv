/**
 * Type definitions for Human-in-the-Loop (HITL) approval workflow
 */

// =====================================================
// CALL STATUS TYPES
// =====================================================

export type CallStatus =
  | 'uploading'      // Initial upload state
  | 'processing'     // General processing state
  | 'transcribing'   // AssemblyAI transcription in progress
  | 'transcribed'    // Transcription complete, awaiting review
  | 'pending_review' // Flagged for human review
  | 'in_review'      // Currently being reviewed by user
  | 'approved'       // User approved, ready for extraction/use
  | 'extracting'     // GPT-4o extraction in progress
  | 'completed'      // All processing complete
  | 'rejected'       // User rejected, needs attention
  | 'failed';        // Processing failed

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | null;

// =====================================================
// REVIEW TRIGGER REASONS
// =====================================================

export type ReviewTriggerReason =
  | 'low_confidence_transcription'  // Transcript confidence < 0.8
  | 'low_confidence_fields'         // 3+ fields with confidence < 0.7
  | 'high_value_deal'               // Qualification score > 80
  | 'high_budget'                   // Budget > $50,000
  | 'qualified_lead'                // Call outcome = qualified
  | 'follow_up_needed'              // Requires follow-up
  | 'negative_sentiment'            // Overall negative sentiment
  | 'missing_required_fields'       // Missing critical fields
  | 'user_preference'               // User always wants review
  | 'manual_flag';                  // Manually flagged by user

// =====================================================
// EDIT TYPES
// =====================================================

export type EditType =
  | 'transcript'       // Edited transcript text
  | 'field'           // Edited CRM field
  | 'speaker_mapping' // Corrected speaker labels
  | 'notes'           // Added manual notes
  | 'approval'        // Approved/rejected
  | 'quality_override'; // Manual quality override

export type NoteType =
  | 'general'     // General note
  | 'follow_up'   // Follow-up action
  | 'correction'  // Correction to transcript/extraction
  | 'context'     // Additional context
  | 'internal';   // Internal note (not for export)

// =====================================================
// DATABASE TYPES
// =====================================================

export interface Call {
  id: string;
  user_id: string;
  organization_id: string | null;

  // Basic info
  call_title: string;
  call_date: string;
  audio_file_path: string;
  audio_duration: number | null;
  file_size: number;

  // Status
  status: CallStatus;

  // Approval workflow (NEW)
  reviewed_by: string | null;
  reviewed_at: string | null;
  approval_status: ApprovalStatus;
  review_notes: string | null;
  requires_review: boolean;
  review_trigger_reason: string | null;
  auto_approved: boolean;

  // Quality metrics (NEW)
  transcription_quality_score: number | null;
  extraction_quality_score: number | null;
  low_confidence_fields_count: number;

  // Processing
  assemblyai_transcript_id: string | null;
  assemblyai_error: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CallEdit {
  id: string;
  call_id: string;
  user_id: string;

  // Edit details
  edit_type: EditType;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  edit_reason: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CallNote {
  id: string;
  call_id: string;
  user_id: string;

  // Note content
  note_text: string;
  note_type: NoteType | null;

  // Visibility
  is_internal: boolean;
  is_pinned: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

// =====================================================
// QUALITY CHECK TYPES
// =====================================================

export interface QualityCheckResult {
  // Confidence issues
  lowConfidenceTranscription: boolean;
  transcriptionConfidence: number;

  lowConfidenceFields: number;
  lowConfidenceFieldNames: string[];

  // Business logic triggers
  highValueDeal: boolean;
  qualificationScore: number | null;
  budget: string | null;

  qualifiedLead: boolean;
  followUpNeeded: boolean;
  negativeOutcome: boolean;

  // Missing data
  missingRequiredFields: string[];

  // Sentiment
  negativeSentiment: boolean;
  overallSentiment: 'positive' | 'neutral' | 'negative' | null;

  // Final decision
  requiresReview: boolean;
  triggerReasons: ReviewTriggerReason[];
  recommendedAction: 'auto_approve' | 'manual_review' | 'flag_urgent';
}

export interface ReviewTriggerConfig {
  // Confidence thresholds
  transcriptionConfidenceThreshold: number;  // Default: 0.8
  fieldConfidenceThreshold: number;          // Default: 0.7
  maxLowConfidenceFields: number;            // Default: 3

  // Value thresholds
  qualificationScoreThreshold: number;       // Default: 80
  budgetThreshold: number | null;            // Default: 50000

  // Trigger options
  alwaysReviewQualified: boolean;           // Default: true
  alwaysReviewFollowUp: boolean;            // Default: true
  alwaysReviewNegative: boolean;            // Default: false

  // User preference
  alwaysRequireReview: boolean;             // Default: false
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface ApproveCallRequest {
  notes?: string;
  skipExtraction?: boolean; // If true, don't trigger extraction
}

export interface ApproveCallResponse {
  success: boolean;
  message: string;
  call: {
    id: string;
    status: CallStatus;
    approval_status: ApprovalStatus;
    reviewed_at: string;
  };
  extractionTriggered?: boolean;
}

export interface RejectCallRequest {
  reason: string;
  requestReExtraction?: boolean;
}

export interface RejectCallResponse {
  success: boolean;
  message: string;
  call: {
    id: string;
    status: CallStatus;
    approval_status: ApprovalStatus;
  };
}

export interface UpdateTranscriptRequest {
  utterances: Array<{
    id: string;
    text?: string;
    speaker?: string;
  }>;
  notes?: string;
}

export interface UpdateFieldsRequest {
  fields: Array<{
    field_name: string;
    field_value: string | null;
    confidence?: number;
  }>;
  notes?: string;
}

export interface AddNoteRequest {
  note_text: string;
  note_type?: NoteType;
  is_internal?: boolean;
  is_pinned?: boolean;
}

// =====================================================
// REVIEW QUEUE TYPES
// =====================================================

export interface PendingReviewCall {
  id: string;
  user_id: string;
  organization_id: string | null;
  status: CallStatus;
  approval_status: ApprovalStatus;
  requires_review: boolean;
  review_trigger_reason: string | null;
  transcription_quality_score: number | null;
  extraction_quality_score: number | null;
  low_confidence_fields_count: number;
  call_title: string;
  created_at: string;
  updated_at: string;
  user_email: string | null;
  edit_count: number;
  has_notes: boolean;
}

export interface QualityMetrics {
  id: string;
  user_id: string;
  organization_id: string | null;
  status: CallStatus;
  call_title: string;
  transcription_quality_score: number | null;
  extraction_quality_score: number | null;
  low_confidence_fields_count: number;
  requires_review: boolean;
  review_trigger_reason: string | null;

  // Transcript stats
  transcript_confidence: number | null;
  word_count: number | null;
  sentiment_overall: 'positive' | 'neutral' | 'negative' | null;

  // Field stats
  total_fields: number;
  low_confidence_fields: number;
  avg_field_confidence: number | null;

  // Review status
  reviewed_by: string | null;
  reviewed_at: string | null;
  approval_status: ApprovalStatus;
  auto_approved: boolean;

  // Timing
  created_at: string;
  updated_at: string;
}

// =====================================================
// HELPER TYPES
// =====================================================

export interface ReviewStats {
  totalCalls: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  autoApproved: number;
  averageReviewTime: number; // minutes
  averageQualityScore: number;
}

export interface ReviewFilters {
  status?: CallStatus[];
  requiresReview?: boolean;
  approvalStatus?: ApprovalStatus[];
  hasLowConfidence?: boolean;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}
