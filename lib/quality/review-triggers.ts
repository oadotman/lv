/**
 * Quality Check and Review Trigger Logic
 * Determines if a call requires human review based on confidence scores and business rules
 */

import type {
  QualityCheckResult,
  ReviewTriggerConfig,
  ReviewTriggerReason,
} from '../types/approval';

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

export const DEFAULT_REVIEW_CONFIG: ReviewTriggerConfig = {
  // Confidence thresholds - Set very low to minimize blocking
  transcriptionConfidenceThreshold: 0.6,  // Only block catastrophic failures
  fieldConfidenceThreshold: 0.5,          // Very low - just for visual indicators
  maxLowConfidenceFields: 999,            // Effectively unlimited

  // Value thresholds - Disabled by default
  qualificationScoreThreshold: 100,       // Never trigger (max is ~100)
  budgetThreshold: null,                  // Disabled

  // Trigger options - All disabled by default (frictionless)
  alwaysReviewQualified: false,           // Don't block on qualified leads
  alwaysReviewFollowUp: false,            // Don't block on follow-ups
  alwaysReviewNegative: false,            // Don't block on negative sentiment

  // User preference - Let user opt-in to stricter review
  alwaysRequireReview: false,             // Default: no review required
};

// =====================================================
// QUALITY CHECK FUNCTIONS
// =====================================================

interface TranscriptData {
  confidence_score: number;
  sentiment_overall: 'positive' | 'neutral' | 'negative' | null;
}

interface FieldData {
  field_name: string;
  field_value: string | null;
  confidence_score: number;
}

interface ExtractionData {
  call_outcome?: 'qualified' | 'nurture' | 'not_interested' | 'follow_up_needed';
  qualification_score?: number;
  budget?: string | null;
  urgency?: 'low' | 'medium' | 'high';
  next_steps?: string | null;
}

interface QualityCheckInput {
  transcript: TranscriptData;
  fields: FieldData[];
  extraction: ExtractionData;
  requiredFields?: string[];  // Fields that must have values
  userConfig?: Partial<ReviewTriggerConfig>;
}

/**
 * Main quality check function
 * Analyzes transcript, fields, and extraction to determine if review is needed
 */
export function checkCallQuality(input: QualityCheckInput): QualityCheckResult {
  const config: ReviewTriggerConfig = {
    ...DEFAULT_REVIEW_CONFIG,
    ...input.userConfig,
  };

  const triggerReasons: ReviewTriggerReason[] = [];

  // 1. Check transcription confidence
  const lowConfidenceTranscription =
    input.transcript.confidence_score < config.transcriptionConfidenceThreshold;

  if (lowConfidenceTranscription) {
    triggerReasons.push('low_confidence_transcription');
  }

  // 2. Check field confidence
  const lowConfidenceFieldsList = input.fields.filter(
    (f) => f.field_value !== null && f.confidence_score < config.fieldConfidenceThreshold
  );

  const lowConfidenceFields = lowConfidenceFieldsList.length;
  const lowConfidenceFieldNames = lowConfidenceFieldsList.map((f) => f.field_name);

  if (lowConfidenceFields > config.maxLowConfidenceFields) {
    triggerReasons.push('low_confidence_fields');
  }

  // 3. Check for high-value deals
  const qualificationScore = input.extraction.qualification_score || 0;
  const highValueDeal = qualificationScore > config.qualificationScoreThreshold;

  if (highValueDeal && config.alwaysReviewQualified) {
    triggerReasons.push('high_value_deal');
  }

  // 4. Check budget threshold
  const budget = parseBudget(input.extraction.budget);
  if (budget && config.budgetThreshold && budget > config.budgetThreshold) {
    triggerReasons.push('high_budget');
  }

  // 5. Check call outcome
  const callOutcome = input.extraction.call_outcome;
  const qualifiedLead = callOutcome === 'qualified';
  const followUpNeeded = callOutcome === 'follow_up_needed';
  const negativeOutcome = callOutcome === 'not_interested';

  if (qualifiedLead && config.alwaysReviewQualified) {
    triggerReasons.push('qualified_lead');
  }

  if (followUpNeeded && config.alwaysReviewFollowUp) {
    triggerReasons.push('follow_up_needed');
  }

  if (negativeOutcome && config.alwaysReviewNegative) {
    triggerReasons.push('negative_sentiment');
  }

  // 6. Check for missing required fields
  const missingRequiredFields: string[] = [];
  if (input.requiredFields) {
    for (const fieldName of input.requiredFields) {
      const field = input.fields.find((f) => f.field_name === fieldName);
      if (!field || !field.field_value) {
        missingRequiredFields.push(fieldName);
      }
    }
  }

  if (missingRequiredFields.length > 0) {
    triggerReasons.push('missing_required_fields');
  }

  // 7. Check overall sentiment
  const negativeSentiment = input.transcript.sentiment_overall === 'negative';
  if (negativeSentiment && config.alwaysReviewNegative) {
    if (!triggerReasons.includes('negative_sentiment')) {
      triggerReasons.push('negative_sentiment');
    }
  }

  // 8. User preference override
  if (config.alwaysRequireReview) {
    triggerReasons.push('user_preference');
  }

  // Determine if review is required
  const requiresReview = triggerReasons.length > 0;

  // Determine recommended action
  let recommendedAction: 'auto_approve' | 'manual_review' | 'flag_urgent' = 'auto_approve';

  if (requiresReview) {
    // Urgent if high-value and low confidence
    if (
      (highValueDeal || qualifiedLead) &&
      (lowConfidenceTranscription || lowConfidenceFields > 2)
    ) {
      recommendedAction = 'flag_urgent';
    } else {
      recommendedAction = 'manual_review';
    }
  }

  return {
    // Confidence issues
    lowConfidenceTranscription,
    transcriptionConfidence: input.transcript.confidence_score,
    lowConfidenceFields,
    lowConfidenceFieldNames,

    // Business logic triggers
    highValueDeal,
    qualificationScore,
    budget: input.extraction.budget || null,
    qualifiedLead,
    followUpNeeded,
    negativeOutcome,

    // Missing data
    missingRequiredFields,

    // Sentiment
    negativeSentiment,
    overallSentiment: input.transcript.sentiment_overall,

    // Final decision
    requiresReview,
    triggerReasons,
    recommendedAction,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Parse budget string to number
 * Handles various formats: "$50,000", "50k", "50000", etc.
 */
function parseBudget(budgetStr: string | null | undefined): number | null {
  if (!budgetStr) return null;

  // Remove currency symbols and commas
  let cleaned = budgetStr.replace(/[$,\s]/g, '');

  // Handle k/K for thousands
  if (cleaned.toLowerCase().includes('k')) {
    cleaned = cleaned.toLowerCase().replace('k', '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num * 1000;
  }

  // Handle m/M for millions
  if (cleaned.toLowerCase().includes('m')) {
    cleaned = cleaned.toLowerCase().replace('m', '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num * 1000000;
  }

  // Parse as regular number
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Generate human-readable trigger reason
 */
export function formatTriggerReason(reasons: ReviewTriggerReason[]): string {
  if (reasons.length === 0) return 'No review required';
  if (reasons.length === 1) {
    return formatSingleReason(reasons[0]);
  }

  // Multiple reasons - prioritize
  const priority: ReviewTriggerReason[] = [
    'high_value_deal',
    'qualified_lead',
    'low_confidence_transcription',
    'low_confidence_fields',
    'missing_required_fields',
    'follow_up_needed',
    'high_budget',
    'negative_sentiment',
    'user_preference',
    'manual_flag',
  ];

  const topReason = priority.find((r) => reasons.includes(r)) || reasons[0];
  const othersCount = reasons.length - 1;

  return `${formatSingleReason(topReason)}${othersCount > 0 ? ` +${othersCount} more` : ''}`;
}

function formatSingleReason(reason: ReviewTriggerReason): string {
  const messages: Record<ReviewTriggerReason, string> = {
    low_confidence_transcription: 'Low transcription confidence',
    low_confidence_fields: 'Multiple low-confidence fields',
    high_value_deal: 'High-value deal detected',
    high_budget: 'Large budget mentioned',
    qualified_lead: 'Qualified lead',
    follow_up_needed: 'Follow-up required',
    negative_sentiment: 'Negative sentiment detected',
    missing_required_fields: 'Missing required information',
    user_preference: 'Review always required',
    manual_flag: 'Manually flagged for review',
  };

  return messages[reason] || reason;
}

/**
 * Calculate overall quality score (0-100)
 */
export function calculateQualityScore(result: QualityCheckResult): number {
  let score = 100;

  // Deduct for confidence issues
  if (result.lowConfidenceTranscription) {
    score -= 20;
  }

  score -= Math.min(result.lowConfidenceFields * 5, 30); // Max -30 for fields

  // Deduct for missing data
  score -= Math.min(result.missingRequiredFields.length * 10, 30); // Max -30

  // Adjust for sentiment (minor impact)
  if (result.negativeSentiment) {
    score -= 5;
  }

  // Boost for complete, high-quality extractions
  if (
    result.transcriptionConfidence > 0.9 &&
    result.lowConfidenceFields === 0 &&
    result.missingRequiredFields.length === 0
  ) {
    score = 100;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get review priority (1-5, 5 = highest)
 */
export function getReviewPriority(result: QualityCheckResult): number {
  if (result.recommendedAction === 'flag_urgent') return 5;
  if (result.highValueDeal || result.qualifiedLead) return 4;
  if (result.followUpNeeded) return 3;
  if (result.lowConfidenceTranscription) return 3;
  if (result.lowConfidenceFields > 5) return 3;
  if (result.missingRequiredFields.length > 0) return 2;
  return 1;
}

/**
 * Get required fields based on call type
 */
export function getRequiredFields(callType?: string): string[] {
  // Default required fields for all calls
  const defaultRequired = [
    'customer_company',
    'key_points',
    'next_steps',
  ];

  // Add more required fields based on call type
  if (callType === 'sales') {
    return [
      ...defaultRequired,
      'qualification_score',
      'pain_points',
      'call_outcome',
    ];
  }

  if (callType === 'discovery') {
    return [
      ...defaultRequired,
      'pain_points',
      'current_solution',
      'decision_process',
    ];
  }

  return defaultRequired;
}

/**
 * Get visual confidence indicator (for UI display only, non-blocking)
 * Returns a simple rating: high, medium, low
 */
export function getConfidenceIndicator(
  confidence: number
): 'high' | 'medium' | 'low' {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.70) return 'medium';
  return 'low';
}

/**
 * Get confidence badge color for UI
 */
export function getConfidenceBadgeColor(
  confidence: number
): {
  bg: string;
  text: string;
  border: string;
  icon: '🟢' | '🟡' | '🔴';
} {
  if (confidence >= 0.85) {
    return {
      bg: 'bg-green-50 dark:bg-green-950/20',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      icon: '🟢',
    };
  }

  if (confidence >= 0.70) {
    return {
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: '🟡',
    };
  }

  return {
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    icon: '🔴',
  };
}

/**
 * Check if transcription is critically bad (should actually block)
 * This is the ONLY check that should prevent auto-approval
 */
export function isCatastrophicFailure(transcriptConfidence: number): boolean {
  return transcriptConfidence < 0.6; // Less than 60% confidence = unusable
}

/**
 * Generate user-friendly quality summary (non-blocking, informational only)
 */
export function generateQualitySummary(result: QualityCheckResult): {
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
  shouldNotifyUser: boolean; // Just a hint, not a blocker
  suggestions: string[];
} {
  const qualityScore = calculateQualityScore(result);

  if (qualityScore >= 90) {
    return {
      overallRating: 'excellent',
      message: 'High-quality transcription and extraction',
      shouldNotifyUser: false,
      suggestions: [],
    };
  }

  if (qualityScore >= 75) {
    return {
      overallRating: 'good',
      message: 'Good quality - minor improvements possible',
      shouldNotifyUser: false,
      suggestions: result.lowConfidenceFieldNames.length > 0
        ? [`Consider reviewing: ${result.lowConfidenceFieldNames.slice(0, 2).join(', ')}`]
        : [],
    };
  }

  if (qualityScore >= 60) {
    return {
      overallRating: 'fair',
      message: 'Acceptable quality - some fields may need review',
      shouldNotifyUser: true,
      suggestions: [
        ...result.lowConfidenceFieldNames.slice(0, 3).map((f) => `Review ${f}`),
        result.missingRequiredFields.length > 0
          ? 'Some information may be missing'
          : '',
      ].filter(Boolean),
    };
  }

  return {
    overallRating: 'poor',
    message: 'Low quality - review recommended',
    shouldNotifyUser: true,
    suggestions: [
      'Review transcript for accuracy',
      'Check extracted fields',
      'Add any missing information manually',
    ],
  };
}
