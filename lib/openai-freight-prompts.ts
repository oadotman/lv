/**
 * Freight-specific prompts for LoadVoice AI extraction
 * These prompts are optimized for extracting load, carrier, and shipper information
 * from freight broker phone calls
 */

export const SHIPPER_CALL_PROMPT = `You are an expert freight broker assistant. Extract the following information from this shipper call transcript. Be precise and only extract what is explicitly mentioned.

IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks.

Extract these fields:

LOAD DETAILS:
- origin_city: City where load picks up
- origin_state: State where load picks up (2-letter code)
- origin_zip: ZIP code of pickup (if mentioned)
- destination_city: City where load delivers
- destination_state: State where load delivers (2-letter code)
- destination_zip: ZIP code of delivery (if mentioned)
- commodity: What is being shipped (be specific)
- weight_lbs: Weight in pounds (convert if given in tons)
- pallet_count: Number of pallets (if mentioned)
- equipment_type: One of: dry_van, reefer, flatbed, step_deck, rgn, conestoga, power_only, box_truck, hotshot, tanker

DATES & TIMES:
- pickup_date: Date of pickup (YYYY-MM-DD format)
- pickup_time: Time of pickup (HH:MM format, 24-hour)
- pickup_window_start: Earliest pickup time (if window given)
- pickup_window_end: Latest pickup time (if window given)
- delivery_date: Date of delivery (YYYY-MM-DD format)
- delivery_time: Time of delivery (HH:MM format, 24-hour)
- delivery_window_start: Earliest delivery time (if window given)
- delivery_window_end: Latest delivery time (if window given)

FINANCIAL:
- shipper_rate: Rate quoted to shipper (number only, no $ or commas)
- special_requirements: Array of any special requirements mentioned (tarps, team drivers, hazmat, etc.)

SHIPPER INFO:
- shipper_name: Name of shipping company
- shipper_contact: Name of person calling
- shipper_phone: Phone number
- shipper_email: Email address (if mentioned)
- reference_number: PO number, order number, or reference (if mentioned)

CONFIDENCE SCORES:
For each field extracted, provide a confidence score (0-100):
- 90-100: Explicitly stated in call
- 70-89: Strongly implied or partial info
- 50-69: Inferred from context
- Below 50: Don't include

Return format:
{
  "extraction_type": "shipper_call",
  "data": {
    "load": { ...all load fields... },
    "shipper": { ...all shipper fields... }
  },
  "confidence": {
    "field_name": score (for each field)
  },
  "summary": "One sentence summary of the load",
  "special_notes": "Any important details that don't fit in fields"
}`;

export const CARRIER_CALL_PROMPT = `You are an expert freight broker assistant specialized in understanding rate negotiations. Extract carrier information and CAREFULLY analyze the rate negotiation to determine the actual outcome.

CRITICAL NEGOTIATION ANALYSIS:
Multiple rates are often mentioned during negotiation. You must identify:
1. Whether an agreement was actually reached
2. What the final agreed rate is (if any)
3. The negotiation status and any conditions

IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks.

NEGOTIATION STATUS (determine carefully):
- AGREED: Both parties explicitly accepted a rate
  * Look for: "Deal", "Done", "Book it", "I'll take it", "Send rate con"
  * Or: Carrier provides MC/truck details after rate discussion
- PENDING: Conditional or awaiting confirmation
  * "Let me check with driver", "If you can move pickup time", etc.
- REJECTED: No agreement reached
  * "Too light", "Can't do it", "Pass", call ends without confirmation
- CALLBACK_REQUESTED: Door left open
  * "Call me if rate improves", "Keep me in mind"

Extract these fields:

NEGOTIATION OUTCOME:
- status: agreed/pending/rejected/callback_requested
- agreed_rate: Final rate ONLY if agreed (number only)
- rate_type: flat or per_mile
- broker_final_position: Last rate broker offered
- carrier_final_position: Last rate carrier requested
- pending_reason: What's being waited on (if pending)
- rejection_reason: Why rejected (if rejected)
- callback_conditions: When to callback (if requested)
- contingencies: Any conditions on agreement
- rate_history: Array of all rates mentioned with speaker

CARRIER DETAILS:
- carrier_name: Name of trucking company
- mc_number: MC number (numbers only, no MC prefix)
- dot_number: DOT number (numbers only, no DOT prefix)
- primary_contact: Name of dispatcher
- dispatch_phone: Dispatcher phone number
- dispatch_email: Dispatcher email (if mentioned)
- driver_name: Name of driver (if different from dispatcher)
- driver_phone: Driver cell phone (if mentioned)

EQUIPMENT:
- truck_number: Truck unit number
- trailer_number: Trailer number
- equipment_type: Type available (dry_van, reefer, flatbed, etc.)
- equipment_length: Length of trailer (if mentioned)

AVAILABILITY:
- current_location_city: Where truck is now or will be
- current_location_state: State (2-letter code)
- available_date: When available (YYYY-MM-DD)
- available_time: When available (HH:MM)

ACCESSORIALS DISCUSSED:
- detention: Rate/terms if mentioned
- lumper: Who pays and amount
- tonu: Terms if discussed
- fuel_surcharge: Included or separate

LOAD ASSIGNMENT (if load was booked):
- pickup_confirmation: Did carrier confirm pickup? (yes/no)
- pickup_number: Pickup number given to carrier
- delivery_eta: Estimated delivery (if discussed)

CONFIDENCE SCORES:
For negotiation outcome and each field:
- 90-100: Explicitly stated
- 70-89: Strongly implied
- 50-69: Inferred
- Below 50: Uncertain

Return format:
{
  "extraction_type": "carrier_call",
  "negotiation_outcome": {
    "status": "agreed/pending/rejected/callback_requested",
    "agreed_rate": null or number,
    "rate_type": "flat/per_mile",
    "broker_final_position": number,
    "carrier_final_position": number,
    "pending_reason": "string if pending",
    "rejection_reason": "string if rejected",
    "callback_conditions": "string if callback",
    "contingencies": [],
    "rate_history": [{"speaker": "broker/carrier", "rate": number}],
    "negotiation_summary": "Brief description"
  },
  "data": {
    "carrier": { ...all carrier fields... },
    "equipment": { ...equipment details... },
    "accessorials": { ...additional charges... },
    "assignment": { ...if load was assigned... }
  },
  "confidence": {
    "negotiation_status": score,
    "agreed_rate": score,
    "field_name": score
  },
  "summary": "One sentence summary of the call outcome",
  "next_steps": ["Array of recommended actions based on outcome"],
  "warnings": ["Any red flags or concerns"]
}`;

export const CHECK_CALL_PROMPT = `You are an expert freight broker assistant. Extract status update information from this check call transcript with a carrier about a load in transit.

IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks.

Extract these fields:

LOAD STATUS:
- current_location_city: Where is the truck now?
- current_location_state: State (2-letter code)
- current_status: One of: at_pickup, loading, in_transit, at_delivery, unloading, delivered
- actual_pickup_date: When did they actually pick up? (YYYY-MM-DD)
- actual_pickup_time: Time of pickup (HH:MM)
- eta_delivery_date: Updated delivery ETA (YYYY-MM-DD)
- eta_delivery_time: Updated delivery time (HH:MM)

ISSUES/UPDATES:
- delays: Array of any delays mentioned
- delay_reasons: Reasons for delays
- issues: Any problems reported
- driver_requests: Any requests from driver (advance, layover, etc.)

CONFIRMATION:
- driver_name: Confirm driver name
- truck_number: Confirm truck number
- trailer_number: Confirm trailer number
- driver_phone: Driver's current contact

POD INFO (if delivered):
- delivered: true/false
- delivery_date: Actual delivery date
- delivery_time: Actual delivery time
- pod_received: Do we have POD? true/false
- receiver_name: Who signed for it?
- door_number: What door delivered to?

FINANCIAL:
- additional_charges: Any extra charges mentioned
- detention_time: Hours of detention (if any)
- lumper_fee: Lumper amount (if mentioned)

Return format:
{
  "extraction_type": "check_call",
  "data": {
    "status_update": { ...all status fields... },
    "issues": { ...any issues/delays... },
    "pod_info": { ...if delivered... },
    "additional_charges": { ...any extra costs... }
  },
  "confidence": {
    "field_name": score
  },
  "summary": "One sentence status update",
  "action_required": true/false,
  "urgent_notes": "Any urgent items needing attention"
}`;

/**
 * System prompt for freight context
 */
export const FREIGHT_SYSTEM_PROMPT = `You are an AI assistant specialized in the freight brokerage industry. You understand:

- Common freight terminology (LTL, FTL, partial, deadhead, backhaul, etc.)
- Equipment types and their uses
- Standard pickup and delivery windows
- Rate negotiations and market conditions
- Carrier vetting and safety requirements
- Common shipping lanes and routes
- Industry regulations (FMCSA, HOS, etc.)

Always be precise with:
- Cities and states (use standard abbreviations)
- Dates and times (convert to standard formats)
- Rates and money (extract numbers only)
- Equipment specifications

When information is ambiguous, use these defaults:
- If only day mentioned, assume current week
- If "tomorrow" or "today" used, calculate from current date
- If time not specified but "morning", assume 08:00
- If time not specified but "afternoon", assume 14:00
- If state not mentioned, mark confidence as low
- If equipment not specified but commodity suggests it, note in special_notes`;

/**
 * Function to enhance prompts with current date context
 */
export function enhancePromptWithContext(basePrompt: string): string {
  const today = new Date();
  const contextAddition = `\n\nCONTEXT:
Today's date is: ${today.toISOString().split('T')[0]}
Current day: ${today.toLocaleDateString('en-US', { weekday: 'long' })}
When "today" is mentioned, use: ${today.toISOString().split('T')[0]}
When "tomorrow" is mentioned, use: ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}
When day names are mentioned, calculate dates within the next 7 days.`;

  return basePrompt + contextAddition;
}

/**
 * Post-processing function to clean and validate extracted data
 */
export function validateAndCleanExtraction(extraction: any): any {
  // Handle negotiation outcome if present
  if (extraction.negotiation_outcome) {
    extraction = validateNegotiationOutcome(extraction);
  }

  // Ensure consistent state codes (uppercase, 2 letters)
  if (extraction.data?.load?.origin_state) {
    extraction.data.load.origin_state = extraction.data.load.origin_state.toUpperCase().substring(0, 2);
  }
  if (extraction.data?.load?.destination_state) {
    extraction.data.load.destination_state = extraction.data.load.destination_state.toUpperCase().substring(0, 2);
  }

  // Clean phone numbers (remove non-digits, format)
  const cleanPhone = (phone: string) => {
    if (!phone) return phone;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
    return digits;
  };

  if (extraction.data?.shipper?.shipper_phone) {
    extraction.data.shipper.shipper_phone = cleanPhone(extraction.data.shipper.shipper_phone);
  }
  if (extraction.data?.carrier?.dispatch_phone) {
    extraction.data.carrier.dispatch_phone = cleanPhone(extraction.data.carrier.dispatch_phone);
  }
  if (extraction.data?.carrier?.driver_phone) {
    extraction.data.carrier.driver_phone = cleanPhone(extraction.data.carrier.driver_phone);
  }

  // Ensure rates are numbers
  if (extraction.data?.load?.shipper_rate) {
    extraction.data.load.shipper_rate = parseFloat(extraction.data.load.shipper_rate.toString().replace(/[^0-9.]/g, ''));
  }
  if (extraction.data?.carrier?.carrier_rate) {
    extraction.data.carrier.carrier_rate = parseFloat(extraction.data.carrier.carrier_rate.toString().replace(/[^0-9.]/g, ''));
  }

  // Standardize equipment types
  const equipmentMap: { [key: string]: string } = {
    'van': 'dry_van',
    'dry': 'dry_van',
    'ref': 'reefer',
    'refrigerated': 'reefer',
    'flat': 'flatbed',
    'step': 'step_deck',
    'rgn': 'rgn',
    'lowboy': 'rgn',
    'removable gooseneck': 'rgn',
    'connie': 'conestoga',
    'curtain': 'conestoga',
    'power': 'power_only',
    'box': 'box_truck',
    'straight': 'box_truck',
    'hot': 'hotshot',
    'tank': 'tanker'
  };

  if (extraction.data?.load?.equipment_type) {
    const equipment = extraction.data.load.equipment_type.toLowerCase();
    extraction.data.load.equipment_type = equipmentMap[equipment] || extraction.data.load.equipment_type;
  }

  return extraction;
}

/**
 * Validate negotiation outcome data
 */
function validateNegotiationOutcome(extraction: any): any {
  const outcome = extraction.negotiation_outcome;

  // Validate status
  const validStatuses = ['agreed', 'pending', 'rejected', 'callback_requested'];
  if (!validStatuses.includes(outcome.status)) {
    outcome.status = 'pending';
  }

  // Only keep agreed_rate if status is agreed or pending
  if (outcome.status !== 'agreed' && outcome.status !== 'pending') {
    outcome.agreed_rate = null;
  }

  // Clean up rates
  if (outcome.agreed_rate !== null && outcome.agreed_rate !== undefined) {
    outcome.agreed_rate = parseFloat(outcome.agreed_rate.toString().replace(/[^0-9.]/g, ''));
  }
  if (outcome.broker_final_position !== null && outcome.broker_final_position !== undefined) {
    outcome.broker_final_position = parseFloat(outcome.broker_final_position.toString().replace(/[^0-9.]/g, ''));
  }
  if (outcome.carrier_final_position !== null && outcome.carrier_final_position !== undefined) {
    outcome.carrier_final_position = parseFloat(outcome.carrier_final_position.toString().replace(/[^0-9.]/g, ''));
  }

  // Add validation warnings
  if (!extraction.warnings) {
    extraction.warnings = [];
  }

  // Warning: Status is agreed but no rate
  if (outcome.status === 'agreed' && !outcome.agreed_rate) {
    extraction.warnings.push('Agreement indicated but no rate captured - needs manual review');
    outcome.status = 'pending'; // Downgrade to pending
  }

  // Warning: Large discrepancy in final positions
  if (outcome.broker_final_position && outcome.carrier_final_position && outcome.status === 'agreed') {
    const diff = Math.abs(outcome.broker_final_position - outcome.carrier_final_position);
    if (diff > 100) {
      extraction.warnings.push(`Large rate discrepancy ($${diff}) despite agreement - verify final rate`);
    }
  }

  // Generate next steps if not present
  if (!extraction.next_steps || extraction.next_steps.length === 0) {
    extraction.next_steps = generateNextSteps(outcome);
  }

  return extraction;
}

/**
 * Generate next steps based on negotiation outcome
 */
function generateNextSteps(outcome: any): string[] {
  const steps: string[] = [];

  switch (outcome.status) {
    case 'agreed':
      steps.push('Send rate confirmation to carrier');
      if (outcome.contingencies && outcome.contingencies.length > 0) {
        steps.push('Confirm contingencies are met');
      }
      break;
    case 'pending':
      if (outcome.pending_reason) {
        steps.push(`Follow up on: ${outcome.pending_reason}`);
      }
      steps.push('Set reminder to check back with carrier');
      break;
    case 'rejected':
      steps.push('Continue searching for another carrier');
      if (outcome.broker_final_position && outcome.carrier_final_position) {
        const gap = outcome.carrier_final_position - outcome.broker_final_position;
        if (gap > 0) {
          steps.push(`Consider increasing rate by $${gap} to match market`);
        }
      }
      break;
    case 'callback_requested':
      steps.push('Add carrier to backup list');
      if (outcome.callback_conditions) {
        steps.push(`Will callback if: ${outcome.callback_conditions}`);
      }
      break;
  }

  return steps;
}

/**
 * Function to determine which prompt to use based on call context
 */
export function selectPromptByCallType(transcript: string): string {
  const lowerTranscript = transcript.toLowerCase();

  // Keywords indicating call type
  const shipperKeywords = ['need a truck', 'need to ship', 'pickup at', 'deliver to', 'shipping', 'need a quote', 'have a load'];
  const carrierKeywords = ['have a truck', 'looking for loads', 'empty in', 'available', 'my truck', 'my driver', 'mc number'];
  const checkKeywords = ['where are you', 'status update', 'eta', 'delivered yet', 'pod', 'proof of delivery', 'any delays'];

  // Count keyword matches
  const shipperCount = shipperKeywords.filter(kw => lowerTranscript.includes(kw)).length;
  const carrierCount = carrierKeywords.filter(kw => lowerTranscript.includes(kw)).length;
  const checkCount = checkKeywords.filter(kw => lowerTranscript.includes(kw)).length;

  // Return appropriate prompt
  if (checkCount > shipperCount && checkCount > carrierCount) {
    return enhancePromptWithContext(CHECK_CALL_PROMPT);
  } else if (carrierCount > shipperCount) {
    return enhancePromptWithContext(CARRIER_CALL_PROMPT);
  } else {
    return enhancePromptWithContext(SHIPPER_CALL_PROMPT);
  }
}

/**
 * Export all prompts with context
 */
export function getFreightPrompts() {
  return {
    shipper: enhancePromptWithContext(SHIPPER_CALL_PROMPT),
    carrier: enhancePromptWithContext(CARRIER_CALL_PROMPT),
    check: enhancePromptWithContext(CHECK_CALL_PROMPT),
    system: FREIGHT_SYSTEM_PROMPT
  };
}