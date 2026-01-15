/**
 * Advanced Rate Negotiation Extraction for LoadVoice
 * Handles complex price negotiations in freight broker calls
 *
 * This module properly identifies:
 * - Final agreed rates vs initial offers
 * - Pending vs confirmed agreements
 * - Rejection reasons and callback conditions
 * - Contingencies and accessorials
 */

export interface NegotiationOutcome {
  status: 'agreed' | 'pending' | 'rejected' | 'callback_requested';
  agreed_rate: number | null;
  rate_type: 'flat' | 'per_mile';
  rate_includes_fuel: boolean | 'unknown';

  broker_final_position: number | null;
  carrier_final_position: number | null;

  pending_reason?: string;
  rejection_reason?: string;
  callback_conditions?: string;

  accessorials_discussed?: {
    detention?: string;
    lumper?: string;
    tonu?: string;
    other?: string;
  };

  contingencies?: string[];

  confidence: {
    agreement_status: number;
    agreed_rate: number;
    final_positions: number;
  };
}

export const NEGOTIATION_AWARE_CARRIER_PROMPT = `You are an expert freight broker assistant specialized in understanding rate negotiations. Extract carrier information and CAREFULLY analyze the rate negotiation to determine the actual outcome.

CRITICAL NEGOTIATION ANALYSIS:
You must identify whether the parties reached an agreement and what the final rate is. Multiple rates are often mentioned during negotiation - you must extract the CORRECT final outcome.

NEGOTIATION STATUS DETERMINATION:

1. AGREED STATUS - Look for these confirmation signals:
   - Explicit acceptance: "Deal", "Done", "Book it", "Let's do it", "I'll take it", "You got it"
   - Mutual confirmation: "We're good at [amount]", "Okay [amount] works"
   - Action commitments: "Send the rate con", "I'll dispatch him", "What's your MC?"
   - Logistics discussion after rate: Carrier providing truck/driver details implies acceptance
   - Broker restating rate for confirmation: "So we're confirmed at $2,000?"

2. PENDING STATUS - Agreement conditional on something:
   - "Let me check with my driver/dispatcher"
   - "I need to confirm with the shipper"
   - "If you can move pickup to [time]"
   - "Pending [specific condition]"
   - Rate agreed but waiting on logistics confirmation

3. REJECTED STATUS - No deal reached:
   - "That's too light", "Can't do it", "I'll pass", "Not interested"
   - "That won't work", "I'm out"
   - Call ending without confirmation after negotiation
   - Parties too far apart on rate

4. CALLBACK_REQUESTED - Door left open:
   - "Call me if it gets better"
   - "Let me know if the rate goes up"
   - "I'll think about it"
   - "Keep me in mind if you get stuck"

RATE EXTRACTION RULES:
- If AGREED: Extract ONLY the final rate both parties confirmed
- If PENDING: Extract the last rate discussed that had conditional acceptance
- If REJECTED: Extract final positions from both sides
- If CALLBACK: Extract last positions and conditions for reconsideration

IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks.

Extract these fields:

NEGOTIATION_OUTCOME:
{
  "status": "agreed|pending|rejected|callback_requested",
  "agreed_rate": [number or null - ONLY if status is "agreed"],
  "rate_type": "flat|per_mile",
  "rate_includes_fuel": true|false|"unknown",

  "broker_final_position": [last rate broker offered],
  "carrier_final_position": [last rate carrier requested],

  "pending_reason": [if pending, what's being waited on],
  "rejection_reason": [if rejected, why - be specific],
  "callback_conditions": [if callback requested, under what circumstances],

  "accessorials_discussed": {
    "detention": [rate/terms if discussed],
    "lumper": [who pays, amount if mentioned],
    "tonu": [terms if discussed],
    "other": [any other extras mentioned]
  },

  "contingencies": [array of any conditions attached to the agreement],

  "confidence": {
    "agreement_status": [0-100 how confident in the status determination],
    "agreed_rate": [0-100 how confident in the rate if agreed],
    "final_positions": [0-100 how confident in broker/carrier positions]
  },

  "negotiation_summary": "Brief description of how the negotiation went",
  "rate_history": [array of all rates mentioned in order, with who said it]
}

CARRIER DETAILS (standard extraction):
- carrier_name: Name of trucking company
- mc_number: MC number (numbers only)
- dot_number: DOT number (numbers only)
- primary_contact: Name of dispatcher
- dispatch_phone: Phone number
- driver_name: Driver name if mentioned
- truck_number: Truck/unit number
- equipment_type: Type of equipment

Return format:
{
  "extraction_type": "carrier_negotiation",
  "negotiation_outcome": { ...complete negotiation analysis... },
  "carrier_details": { ...carrier information... },
  "metadata": {
    "call_duration_estimate": "short|medium|long",
    "negotiation_complexity": "simple|moderate|complex",
    "red_flags": []
  }
}`;

export const NEGOTIATION_ANALYSIS_SYSTEM_PROMPT = `You are an expert in freight rate negotiations with deep understanding of how freight brokers and carriers negotiate rates. You must:

1. NEVER assume agreement without explicit confirmation
2. Distinguish between initial offers, counter-offers, and final agreed rates
3. Recognize that rate discussions often involve multiple back-and-forth offers
4. Understand that carriers often accept by providing equipment/driver details
5. Know that "sounds good" followed by logistics means agreement
6. Recognize that no explicit response to a rate offer usually means non-acceptance
7. Understand contingent agreements (rate agreed but conditional on something)

Common negotiation patterns:
- Broker starts low, carrier counters high, they meet in middle
- Carrier accepts but with conditions (pickup time, detention, etc.)
- Multiple rates for different scenarios (with/without fuel, team vs solo)
- Rate per mile conversations that need conversion to flat rate
- "All in" rates vs base + fuel surcharge

Critical: If there's ANY doubt about whether agreement was reached, mark as "pending" not "agreed".`;

/**
 * Enhanced validation for negotiation outcomes
 */
export function validateNegotiationExtraction(extraction: any): any {
  // Ensure negotiation_outcome exists
  if (!extraction.negotiation_outcome) {
    extraction.negotiation_outcome = {
      status: 'pending',
      agreed_rate: null,
      confidence: {
        agreement_status: 0,
        agreed_rate: 0,
        final_positions: 0
      }
    };
  }

  const outcome = extraction.negotiation_outcome;

  // Validate status
  const validStatuses = ['agreed', 'pending', 'rejected', 'callback_requested'];
  if (!validStatuses.includes(outcome.status)) {
    outcome.status = 'pending';
  }

  // Only keep agreed_rate if status is actually agreed
  if (outcome.status !== 'agreed' && outcome.status !== 'pending') {
    outcome.agreed_rate = null;
  }

  // Ensure rate_type
  if (!outcome.rate_type) {
    outcome.rate_type = 'flat';
  }

  // Ensure numbers are actually numbers
  if (outcome.agreed_rate !== null) {
    outcome.agreed_rate = parseFloat(outcome.agreed_rate.toString().replace(/[^0-9.]/g, ''));
  }
  if (outcome.broker_final_position !== null) {
    outcome.broker_final_position = parseFloat(outcome.broker_final_position.toString().replace(/[^0-9.]/g, ''));
  }
  if (outcome.carrier_final_position !== null) {
    outcome.carrier_final_position = parseFloat(outcome.carrier_final_position.toString().replace(/[^0-9.]/g, ''));
  }

  // Validate confidence scores
  if (!outcome.confidence) {
    outcome.confidence = {
      agreement_status: 50,
      agreed_rate: 0,
      final_positions: 50
    };
  }

  // Ensure confidence scores are in valid range
  Object.keys(outcome.confidence).forEach(key => {
    const score = outcome.confidence[key];
    if (typeof score !== 'number' || score < 0 || score > 100) {
      outcome.confidence[key] = 50;
    }
  });

  // Add warning flags for suspicious patterns
  extraction.validation_warnings = [];

  // Warning: High agreed rate confidence but low agreement status confidence
  if (outcome.confidence.agreed_rate > 80 && outcome.confidence.agreement_status < 60) {
    extraction.validation_warnings.push('Rate identified but agreement uncertain - verify manually');
  }

  // Warning: Status is agreed but no rate
  if (outcome.status === 'agreed' && !outcome.agreed_rate) {
    extraction.validation_warnings.push('Agreement indicated but no rate captured - needs review');
    outcome.status = 'pending'; // Downgrade to pending
  }

  // Warning: Large discrepancy between broker and carrier positions
  if (outcome.broker_final_position && outcome.carrier_final_position) {
    const difference = Math.abs(outcome.broker_final_position - outcome.carrier_final_position);
    const average = (outcome.broker_final_position + outcome.carrier_final_position) / 2;
    const percentDiff = (difference / average) * 100;

    if (percentDiff > 20 && outcome.status === 'agreed') {
      extraction.validation_warnings.push('Large rate discrepancy despite agreement status - verify final rate');
    }
  }

  return extraction;
}

/**
 * Post-process rate confirmation generation
 */
export function shouldGenerateRateConfirmation(extraction: any): boolean {
  if (!extraction.negotiation_outcome) {
    return false;
  }

  const outcome = extraction.negotiation_outcome;

  // Only generate rate confirmation for agreed status with high confidence
  return (
    outcome.status === 'agreed' &&
    outcome.agreed_rate !== null &&
    outcome.confidence.agreement_status >= 70 &&
    outcome.confidence.agreed_rate >= 70
  );
}

/**
 * Get actionable next steps based on negotiation outcome
 */
export function getNextSteps(extraction: any): string[] {
  const steps: string[] = [];

  if (!extraction.negotiation_outcome) {
    steps.push('Review call manually - no negotiation data extracted');
    return steps;
  }

  const outcome = extraction.negotiation_outcome;

  switch (outcome.status) {
    case 'agreed':
      steps.push('Generate and send rate confirmation');
      steps.push('Dispatch carrier with load information');
      if (outcome.contingencies && outcome.contingencies.length > 0) {
        steps.push('Confirm contingencies are met: ' + outcome.contingencies.join(', '));
      }
      break;

    case 'pending':
      if (outcome.pending_reason) {
        steps.push('Follow up on: ' + outcome.pending_reason);
      }
      steps.push('Set reminder to check back with carrier');
      if (outcome.broker_final_position && outcome.carrier_final_position) {
        const gap = Math.abs(outcome.broker_final_position - outcome.carrier_final_position);
        if (gap > 0) {
          steps.push(`Rate gap of $${gap} needs resolution`);
        }
      }
      break;

    case 'rejected':
      if (outcome.rejection_reason) {
        steps.push('Rejection reason: ' + outcome.rejection_reason);
      }
      if (outcome.broker_final_position && outcome.carrier_final_position) {
        const gap = Math.abs(outcome.broker_final_position - outcome.carrier_final_position);
        steps.push(`Rate gap was $${gap} - consider if load can support higher rate`);
      }
      steps.push('Continue searching for another carrier');
      break;

    case 'callback_requested':
      if (outcome.callback_conditions) {
        steps.push('Callback if: ' + outcome.callback_conditions);
      }
      steps.push('Keep carrier as backup option');
      steps.push('Continue searching for committed carrier');
      break;
  }

  // Add warnings as steps
  if (extraction.validation_warnings && extraction.validation_warnings.length > 0) {
    extraction.validation_warnings.forEach(warning => {
      steps.push('⚠️ ' + warning);
    });
  }

  return steps;
}

/**
 * Analyze rate history to understand negotiation flow
 */
export function analyzeRateProgression(rateHistory: Array<{speaker: string, rate: number}>): {
  pattern: string;
  finalGap: number;
  numberOfRounds: number;
  convergence: boolean;
} {
  if (!rateHistory || rateHistory.length === 0) {
    return {
      pattern: 'no_negotiation',
      finalGap: 0,
      numberOfRounds: 0,
      convergence: false
    };
  }

  const brokerRates = rateHistory.filter(r => r.speaker === 'broker').map(r => r.rate);
  const carrierRates = rateHistory.filter(r => r.speaker === 'carrier').map(r => r.rate);

  if (brokerRates.length === 0 || carrierRates.length === 0) {
    return {
      pattern: 'one_sided',
      finalGap: 0,
      numberOfRounds: Math.max(brokerRates.length, carrierRates.length),
      convergence: false
    };
  }

  const lastBrokerRate = brokerRates[brokerRates.length - 1];
  const lastCarrierRate = carrierRates[carrierRates.length - 1];
  const finalGap = Math.abs(lastBrokerRate - lastCarrierRate);

  // Check if rates converged
  const firstGap = Math.abs(brokerRates[0] - carrierRates[0]);
  const convergence = finalGap < firstGap;

  // Determine pattern
  let pattern = 'standard_negotiation';
  if (finalGap === 0) {
    pattern = 'agreement_reached';
  } else if (finalGap > firstGap) {
    pattern = 'diverging_positions';
  } else if (brokerRates.length === 1 && carrierRates.length === 1) {
    pattern = 'single_round';
  }

  return {
    pattern,
    finalGap,
    numberOfRounds: Math.max(brokerRates.length, carrierRates.length),
    convergence
  };
}