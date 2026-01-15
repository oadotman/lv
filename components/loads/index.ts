/**
 * Load Management Components
 * Export all load-related components and utilities
 */

// Status Badge Components
export {
  LoadStatusBadge,
  LoadStatusDot,
  LoadStatusProgress,
  LOAD_STATUS_CONFIG,
  LOAD_STATUSES,
  LOAD_STATUS_LABELS
} from './LoadStatusBadge';

// Status Filter Components
export {
  LoadStatusFilter,
  QuickStatusFilters,
  StatusStatistics
} from './LoadStatusFilter';

// Demo Component (for reference/testing)
export { LoadStatusDemo } from './LoadStatusDemo';

// Rate Confirmation Components
export {
  RateConfirmationButton,
  QuickRateConfirmationButton
} from './RateConfirmationButton';

// Enhanced Rate Confirmation Components (API-based)
export {
  EnhancedRateConfirmationButton,
  QuickEnhancedRateConfirmation
} from './EnhancedRateConfirmationButton';

export { RateConfirmationModal } from './RateConfirmationModal';

// Re-export workflow utilities for convenience
export {
  isValidTransition,
  getAvailableTransitions,
  canReverseStatus,
  getPreviousStatus,
  transitionStatus,
  getStatusProgress,
  isTerminalStatus,
  getStatusTimeline,
  calculateStatusMetrics,
  formatStatus,
  getStatusColor,
  type StatusTransitionResult,
  type StatusEvent,
  type StatusMetrics
} from '@/lib/loads/statusWorkflow';