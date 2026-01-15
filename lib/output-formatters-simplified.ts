// =====================================================
// SIMPLIFIED CRM OUTPUT FORMATTERS - FREIGHT FOCUSED
// Removes generic sales fields, focuses on operations
// =====================================================

interface CallData {
  call: {
    customer_name: string | null;
    customer_company: string | null;
    sales_rep: string | null;
    call_date: string;
    duration: number | null;
    sentiment_type: string | null;
    next_steps: string | null;
  };
  fields: Array<{
    field_name: string;
    field_value: string | null;
    field_type?: string;
  }>;
}

// Helper to get field value
const getField = (fields: any[], name: string): string => {
  const field = fields.find(f =>
    f.field_name.toLowerCase() === name.toLowerCase() ||
    f.field_name.toLowerCase().replace(/_/g, ' ') === name.toLowerCase()
  );

  if (!field) return '';

  let value = field.field_value;
  if (!value) return '';

  // Parse JSON arrays into clean text
  try {
    if (value.startsWith('[')) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item).join('\n• ');
      }
    }
  } catch {}

  return value;
};

// Get all fields with a prefix (e.g., shipper_, carrier_, check_)
const getFieldsWithPrefix = (fields: any[], prefix: string): Record<string, string> => {
  const result: Record<string, string> = {};

  fields
    .filter(f => f.field_name.startsWith(prefix))
    .forEach(f => {
      const fieldName = f.field_name.replace(prefix, '').replace(/_/g, ' ');
      result[fieldName] = f.field_value || '';
    });

  return result;
};

// Helper to format date
const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Helper to format time
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// =====================================================
// SIMPLIFIED PLAIN TEXT FORMAT
// =====================================================
export const formatSimplifiedPlainText = (data: CallData): string => {
  const { call, fields } = data;

  // Extract universal fields
  const summary = getField(fields, 'summary');
  const sentiment = getField(fields, 'sentiment');
  const actionItems = getField(fields, 'action_items');
  const nextSteps = getField(fields, 'next_steps');
  const callType = getField(fields, 'call_type');

  // Extract lane info
  const laneOrigin = getField(fields, 'lane_origin');
  const laneDestination = getField(fields, 'lane_destination');
  const rateDiscussed = getField(fields, 'rate_discussed');
  const equipmentDiscussed = getField(fields, 'equipment_discussed');

  // Get freight-specific data
  const shipperData = getFieldsWithPrefix(fields, 'shipper_');
  const carrierData = getFieldsWithPrefix(fields, 'carrier_');
  const checkData = getFieldsWithPrefix(fields, 'check_');

  let output = `CALL INFORMATION
====================
Date: ${formatDate(call.call_date)}
Duration: ${call.duration ? formatTime(call.duration) : 'Unknown'}
Type: ${callType || 'Unknown'}
Sentiment: ${sentiment || 'Neutral'}

CONTEXT SUMMARY
====================
${summary || 'No summary available'}
`;

  // Add lane/rate info if present
  if (laneOrigin || laneDestination || rateDiscussed || equipmentDiscussed) {
    output += `
KEY DETAILS
====================`;
    if (laneOrigin && laneDestination) {
      output += `
Lane: ${laneOrigin} → ${laneDestination}`;
    }
    if (rateDiscussed) {
      output += `
Rate: $${rateDiscussed}`;
    }
    if (equipmentDiscussed) {
      output += `
Equipment: ${equipmentDiscussed}`;
    }
    output += '\n';
  }

  // Add shipper data if present
  if (Object.keys(shipperData).length > 0 && callType === 'shipper_call') {
    output += `
SHIPPER INFORMATION
====================`;

    // Group related fields
    const origin = [
      shipperData['origin city'],
      shipperData['origin state'],
      shipperData['origin zip'],
    ].filter(Boolean).join(', ');

    const destination = [
      shipperData['destination city'],
      shipperData['destination state'],
      shipperData['destination zip'],
    ].filter(Boolean).join(', ');

    if (origin) output += `\nOrigin: ${origin}`;
    if (shipperData['origin facility']) output += ` (${shipperData['origin facility']})`;

    if (destination) output += `\nDestination: ${destination}`;
    if (shipperData['destination facility']) output += ` (${shipperData['destination facility']})`;

    if (shipperData['commodity']) output += `\nCommodity: ${shipperData['commodity']}`;
    if (shipperData['weight lbs']) output += `\nWeight: ${shipperData['weight lbs']} lbs`;
    if (shipperData['equipment type']) output += `\nEquipment: ${shipperData['equipment type']}`;
    if (shipperData['pickup date']) output += `\nPickup: ${shipperData['pickup date']}`;
    if (shipperData['pickup time']) output += ` at ${shipperData['pickup time']}`;
    if (shipperData['delivery date']) output += `\nDelivery: ${shipperData['delivery date']}`;
    if (shipperData['delivery time']) output += ` at ${shipperData['delivery time']}`;
    if (shipperData['rate to shipper']) output += `\nRate: $${shipperData['rate to shipper']}`;
    if (shipperData['reference number']) output += `\nReference: ${shipperData['reference number']}`;
    if (shipperData['special requirements']) output += `\nSpecial Requirements: ${shipperData['special requirements']}`;

    output += '\n';
  }

  // Add carrier data if present
  if (Object.keys(carrierData).length > 0 && callType === 'carrier_call') {
    output += `
CARRIER INFORMATION
====================`;

    if (carrierData['carrier name']) output += `\nCarrier: ${carrierData['carrier name']}`;
    if (carrierData['mc number']) output += `\nMC#: ${carrierData['mc number']}`;
    if (carrierData['dot number']) output += `\nDOT#: ${carrierData['dot number']}`;
    if (carrierData['driver name']) output += `\nDriver: ${carrierData['driver name']}`;
    if (carrierData['driver phone']) output += ` (${carrierData['driver phone']})`;
    if (carrierData['rate to carrier']) output += `\nRate: $${carrierData['rate to carrier']}`;
    if (carrierData['eta pickup']) output += `\nETA to Pickup: ${carrierData['eta pickup']}`;
    if (carrierData['eta delivery']) output += `\nETA to Delivery: ${carrierData['eta delivery']}`;
    if (carrierData['empty location']) output += `\nCurrent Location: ${carrierData['empty location']}`;
    if (carrierData['insurance verified']) output += `\nInsurance: ${carrierData['insurance verified'] === 'true' ? '✓ Verified' : '✗ Not Verified'}`;

    output += '\n';
  }

  // Add check call data if present
  if (Object.keys(checkData).length > 0 && callType === 'check_call') {
    output += `
STATUS UPDATE
====================`;

    if (checkData['current location']) output += `\nCurrent Location: ${checkData['current location']}`;
    if (checkData['current city'] && checkData['current state']) {
      output += ` (${checkData['current city']}, ${checkData['current state']})`;
    }
    if (checkData['miles out']) output += `\nMiles Out: ${checkData['miles out']}`;
    if (checkData['eta update']) output += `\nETA: ${checkData['eta update']}`;
    if (checkData['delay reason']) output += `\nDelay Reason: ${checkData['delay reason']}`;
    if (checkData['issues reported']) output += `\nIssues: ${checkData['issues reported']}`;

    output += '\n';
  }

  // Add action items and next steps
  if (actionItems || nextSteps) {
    output += `
ACTION ITEMS & NEXT STEPS
====================`;
    if (actionItems) output += `\nTo Do:\n• ${actionItems}`;
    if (nextSteps) output += `\nNext Steps:\n• ${nextSteps}`;
    output += '\n';
  }

  return output.trim();
};

// =====================================================
// FREIGHT BROKER CSV FORMAT
// =====================================================
export const formatFreightCSV = (data: CallData): string => {
  const { call, fields } = data;

  // Extract all relevant fields
  const callType = getField(fields, 'call_type');
  const summary = getField(fields, 'summary').replace(/"/g, '""');
  const sentiment = getField(fields, 'sentiment');
  const actionItems = getField(fields, 'action_items').replace(/"/g, '""');
  const nextSteps = getField(fields, 'next_steps').replace(/"/g, '""');

  // Build CSV based on call type
  let headers: string[] = [];
  let values: string[] = [];

  // Universal headers
  headers.push('Date', 'Duration', 'Type', 'Sentiment', 'Summary', 'Action Items', 'Next Steps');
  values.push(
    formatDate(call.call_date),
    call.duration ? Math.ceil(call.duration / 60).toString() : '0',
    callType || '',
    sentiment || '',
    `"${summary}"`,
    `"${actionItems}"`,
    `"${nextSteps}"`
  );

  // Add type-specific fields
  if (callType === 'shipper_call') {
    const shipperData = getFieldsWithPrefix(fields, 'shipper_');
    headers.push('Origin', 'Destination', 'Commodity', 'Weight', 'Equipment', 'Pickup Date', 'Delivery Date', 'Rate');
    values.push(
      `"${shipperData['origin city'] || ''}, ${shipperData['origin state'] || ''}"`,
      `"${shipperData['destination city'] || ''}, ${shipperData['destination state'] || ''}"`,
      shipperData['commodity'] || '',
      shipperData['weight lbs'] || '',
      shipperData['equipment type'] || '',
      shipperData['pickup date'] || '',
      shipperData['delivery date'] || '',
      shipperData['rate to shipper'] || ''
    );
  } else if (callType === 'carrier_call') {
    const carrierData = getFieldsWithPrefix(fields, 'carrier_');
    headers.push('Carrier', 'MC#', 'Driver', 'Rate', 'ETA Pickup', 'ETA Delivery', 'Insurance');
    values.push(
      carrierData['carrier name'] || '',
      carrierData['mc number'] || '',
      carrierData['driver name'] || '',
      carrierData['rate to carrier'] || '',
      carrierData['eta pickup'] || '',
      carrierData['eta delivery'] || '',
      carrierData['insurance verified'] === 'true' ? 'Yes' : 'No'
    );
  } else if (callType === 'check_call') {
    const checkData = getFieldsWithPrefix(fields, 'check_');
    headers.push('Current Location', 'Miles Out', 'ETA', 'Issues');
    values.push(
      checkData['current location'] || '',
      checkData['miles out'] || '',
      checkData['eta update'] || '',
      checkData['issues reported'] || ''
    );
  }

  return headers.join(',') + '\n' + values.join(',');
};

// =====================================================
// MAIN EXPORT FUNCTION
// =====================================================
export const formatSimplifiedCRMOutput = (callData: CallData, format: string): string => {
  switch (format.toLowerCase()) {
    case 'plain':
    case 'hubspot':
    case 'salesforce':
    case 'pipedrive':
    case 'monday':
    case 'zoho':
      return formatSimplifiedPlainText(callData);

    case 'csv':
    case 'excel':
      return formatFreightCSV(callData);

    case 'email':
      return formatEmailOutput(callData);

    default:
      return formatSimplifiedPlainText(callData);
  }
};

// =====================================================
// EMAIL FORMAT
// =====================================================
const formatEmailOutput = (data: CallData): string => {
  const { call, fields } = data;
  const summary = getField(fields, 'summary');
  const actionItems = getField(fields, 'action_items');
  const nextSteps = getField(fields, 'next_steps');
  const callType = getField(fields, 'call_type');

  let subject = `Call Summary - `;

  if (callType === 'shipper_call') {
    const shipperCompany = getField(fields, 'shipper_shipper_company');
    subject += shipperCompany || 'Shipper Call';
  } else if (callType === 'carrier_call') {
    const carrierName = getField(fields, 'carrier_carrier_name');
    subject += carrierName || 'Carrier Call';
  } else {
    subject += formatDate(call.call_date);
  }

  const body = formatSimplifiedPlainText(data);

  return `Subject: ${subject}\n\n${body}`;
};