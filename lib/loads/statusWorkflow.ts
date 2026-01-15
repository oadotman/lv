import type { LoadStatus } from '@/lib/types';

/**
 * Load Status Workflow Management
 * Handles status transitions and validations for freight loads
 */

// Valid status transitions (what statuses can move to what)
const VALID_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  quoted: ['needs_carrier', 'cancelled'],
  needs_carrier: ['dispatched', 'cancelled'],
  dispatched: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: ['completed', 'cancelled'],
  completed: [], // Terminal status (no transitions except to cancelled)
  cancelled: [] // Terminal status (no transitions from cancelled)
};

// Reverse transitions (for undo operations)
const REVERSE_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  quoted: [],
  needs_carrier: ['quoted'],
  dispatched: ['needs_carrier'],
  in_transit: ['dispatched'],
  delivered: ['in_transit'],
  completed: ['delivered'],
  cancelled: [] // Cannot reverse from cancelled
};

// Status workflow order for progression tracking
export const STATUS_ORDER: LoadStatus[] = [
  'quoted',
  'needs_carrier',
  'dispatched',
  'in_transit',
  'delivered',
  'completed'
];

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  currentStatus: LoadStatus,
  newStatus: LoadStatus
): boolean {
  // Special case: can always transition to cancelled (except from cancelled)
  if (newStatus === 'cancelled' && currentStatus !== 'cancelled') {
    return true;
  }

  // Check if the transition is in the valid transitions map
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get available next statuses from current status
 */
export function getAvailableTransitions(currentStatus: LoadStatus): LoadStatus[] {
  // Can always cancel (except if already cancelled)
  const transitions = [...(VALID_TRANSITIONS[currentStatus] || [])];

  if (currentStatus !== 'cancelled' && !transitions.includes('cancelled')) {
    transitions.push('cancelled');
  }

  return transitions;
}

/**
 * Check if a status can be reversed (undo)
 */
export function canReverseStatus(currentStatus: LoadStatus): boolean {
  return REVERSE_TRANSITIONS[currentStatus].length > 0;
}

/**
 * Get the previous status for undo operations
 */
export function getPreviousStatus(currentStatus: LoadStatus): LoadStatus | null {
  const previousStatuses = REVERSE_TRANSITIONS[currentStatus];
  return previousStatuses.length > 0 ? previousStatuses[0] : null;
}

/**
 * Validate and perform status transition
 */
export interface StatusTransitionResult {
  success: boolean;
  newStatus?: LoadStatus;
  error?: string;
  requiredFields?: string[];
}

export function transitionStatus(
  currentStatus: LoadStatus,
  newStatus: LoadStatus,
  loadData?: {
    carrier_id?: string;
    pickup_date?: string;
    delivery_date?: string;
    rate_to_carrier?: number;
    rate_to_shipper?: number;
  }
): StatusTransitionResult {
  // Check if transition is valid
  if (!isValidTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`
    };
  }

  // Validate required fields for specific transitions
  const requiredFields: string[] = [];

  switch (newStatus) {
    case 'needs_carrier':
      // Must have shipper rate confirmed
      if (!loadData?.rate_to_shipper) {
        requiredFields.push('rate_to_shipper');
      }
      if (!loadData?.pickup_date) {
        requiredFields.push('pickup_date');
      }
      if (!loadData?.delivery_date) {
        requiredFields.push('delivery_date');
      }
      break;

    case 'dispatched':
      // Must have carrier assigned
      if (!loadData?.carrier_id) {
        requiredFields.push('carrier_id');
      }
      if (!loadData?.rate_to_carrier) {
        requiredFields.push('rate_to_carrier');
      }
      break;

    case 'in_transit':
      // Should have pickup confirmation
      if (!loadData?.pickup_date) {
        requiredFields.push('pickup_date');
      }
      break;

    case 'delivered':
      // Should have delivery confirmation
      if (!loadData?.delivery_date) {
        requiredFields.push('delivery_date');
      }
      break;

    case 'completed':
      // All financial data should be present
      if (!loadData?.rate_to_shipper) {
        requiredFields.push('rate_to_shipper');
      }
      if (!loadData?.rate_to_carrier) {
        requiredFields.push('rate_to_carrier');
      }
      break;
  }

  if (requiredFields.length > 0) {
    return {
      success: false,
      error: 'Missing required fields for this transition',
      requiredFields
    };
  }

  return {
    success: true,
    newStatus
  };
}

/**
 * Get status progress percentage (for progress bars)
 */
export function getStatusProgress(status: LoadStatus): number {
  if (status === 'cancelled') return 0;

  const index = STATUS_ORDER.indexOf(status);
  if (index === -1) return 0;

  return Math.round(((index + 1) / STATUS_ORDER.length) * 100);
}

/**
 * Check if a status is terminal (no further transitions except cancel)
 */
export function isTerminalStatus(status: LoadStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/**
 * Get status timeline events for a load
 */
export interface StatusEvent {
  status: LoadStatus;
  timestamp: string;
  user?: string;
  notes?: string;
}

export function getStatusTimeline(events: StatusEvent[]): {
  current: LoadStatus;
  history: StatusEvent[];
  duration: {
    [key: string]: number; // Duration in each status (in hours)
  };
} {
  if (events.length === 0) {
    return {
      current: 'quoted',
      history: [],
      duration: {}
    };
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const current = sortedEvents[sortedEvents.length - 1].status;
  const duration: { [key: string]: number } = {};

  // Calculate duration in each status
  for (let i = 0; i < sortedEvents.length; i++) {
    const currentEvent = sortedEvents[i];
    const nextEvent = sortedEvents[i + 1];

    if (nextEvent) {
      const startTime = new Date(currentEvent.timestamp).getTime();
      const endTime = new Date(nextEvent.timestamp).getTime();
      const hours = (endTime - startTime) / (1000 * 60 * 60);

      duration[currentEvent.status] = (duration[currentEvent.status] || 0) + hours;
    } else {
      // Current status - calculate time until now
      const startTime = new Date(currentEvent.timestamp).getTime();
      const now = Date.now();
      const hours = (now - startTime) / (1000 * 60 * 60);

      duration[currentEvent.status] = (duration[currentEvent.status] || 0) + hours;
    }
  }

  return {
    current,
    history: sortedEvents,
    duration
  };
}

/**
 * Get status metrics for analytics
 */
export interface StatusMetrics {
  averageTimeInStatus: { [key in LoadStatus]?: number };
  mostCommonTransitions: Array<{ from: LoadStatus; to: LoadStatus; count: number }>;
  cancellationRate: number;
  completionRate: number;
  averageTimeToCompletion: number;
}

export function calculateStatusMetrics(loads: Array<{
  status: LoadStatus;
  statusHistory?: StatusEvent[];
}>): StatusMetrics {
  const timeInStatus: { [key in LoadStatus]: number[] } = {
    quoted: [],
    needs_carrier: [],
    dispatched: [],
    in_transit: [],
    delivered: [],
    completed: [],
    cancelled: []
  };

  const transitions: Map<string, number> = new Map();
  let completedCount = 0;
  let cancelledCount = 0;
  const completionTimes: number[] = [];

  loads.forEach(load => {
    if (load.status === 'completed') completedCount++;
    if (load.status === 'cancelled') cancelledCount++;

    if (load.statusHistory && load.statusHistory.length > 0) {
      const timeline = getStatusTimeline(load.statusHistory);

      // Track time in each status
      Object.entries(timeline.duration).forEach(([status, hours]) => {
        if (timeInStatus[status as LoadStatus]) {
          timeInStatus[status as LoadStatus].push(hours);
        }
      });

      // Track transitions
      for (let i = 0; i < load.statusHistory.length - 1; i++) {
        const from = load.statusHistory[i].status;
        const to = load.statusHistory[i + 1].status;
        const key = `${from}->${to}`;
        transitions.set(key, (transitions.get(key) || 0) + 1);
      }

      // Track completion time
      if (load.status === 'completed' && load.statusHistory.length > 0) {
        const firstEvent = load.statusHistory[0];
        const lastEvent = load.statusHistory[load.statusHistory.length - 1];
        const hours = (
          new Date(lastEvent.timestamp).getTime() -
          new Date(firstEvent.timestamp).getTime()
        ) / (1000 * 60 * 60);
        completionTimes.push(hours);
      }
    }
  });

  // Calculate averages
  const averageTimeInStatus: { [key in LoadStatus]?: number } = {};
  Object.entries(timeInStatus).forEach(([status, times]) => {
    if (times.length > 0) {
      averageTimeInStatus[status as LoadStatus] =
        times.reduce((sum, time) => sum + time, 0) / times.length;
    }
  });

  // Sort transitions by count
  const mostCommonTransitions = Array.from(transitions.entries())
    .map(([key, count]) => {
      const [from, to] = key.split('->') as [LoadStatus, LoadStatus];
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    averageTimeInStatus,
    mostCommonTransitions,
    cancellationRate: loads.length > 0 ? (cancelledCount / loads.length) * 100 : 0,
    completionRate: loads.length > 0 ? (completedCount / loads.length) * 100 : 0,
    averageTimeToCompletion:
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0
  };
}

/**
 * Format status for display
 */
export function formatStatus(status: LoadStatus): string {
  const labels: Record<LoadStatus, string> = {
    quoted: 'Quoted',
    needs_carrier: 'Needs Carrier',
    dispatched: 'Dispatched',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };

  return labels[status] || status;
}

/**
 * Get status color scheme
 */
export function getStatusColor(status: LoadStatus): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<LoadStatus, { bg: string; text: string; border: string }> = {
    quoted: {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300'
    },
    needs_carrier: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-300'
    },
    dispatched: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      border: 'border-orange-300'
    },
    in_transit: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-300'
    },
    delivered: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-300'
    },
    completed: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-300'
    },
    cancelled: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-300'
    }
  };

  return colors[status] || colors.quoted;
}