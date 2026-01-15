/**
 * Clipboard utilities for LoadVoice
 * Copy extraction data to clipboard for easy export
 */

export interface ClipboardData {
  load?: any;
  carrier?: any;
  shipper?: any;
  rate?: any;
}

/**
 * Copy extraction data to clipboard in a formatted way
 */
export async function copyExtractionToClipboard(data: ClipboardData): Promise<boolean> {
  try {
    const formattedText = formatExtractionData(data);

    if (navigator.clipboard && window.isSecureContext) {
      // Modern way (requires HTTPS)
      await navigator.clipboard.writeText(formattedText);
      return true;
    } else {
      // Fallback method
      return fallbackCopyToClipboard(formattedText);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Format extraction data for clipboard
 */
function formatExtractionData(data: ClipboardData): string {
  const lines: string[] = [];

  // Load Information
  if (data.load) {
    lines.push('=== LOAD INFORMATION ===');
    lines.push(`Origin: ${data.load.origin_city || data.load.pickup_city || ''}, ${data.load.origin_state || data.load.pickup_state || ''}`);
    lines.push(`Destination: ${data.load.destination_city || data.load.delivery_city || ''}, ${data.load.destination_state || data.load.delivery_state || ''}`);
    lines.push(`Pickup Date: ${formatDate(data.load.pickup_date)}`);
    lines.push(`Delivery Date: ${formatDate(data.load.delivery_date)}`);
    lines.push(`Commodity: ${data.load.commodity || ''}`);
    lines.push(`Weight: ${data.load.weight_lbs || data.load.weight || ''} lbs`);
    lines.push(`Equipment: ${data.load.equipment_type || ''}`);

    if (data.load.special_requirements) {
      lines.push(`Special Requirements: ${data.load.special_requirements}`);
    }
    if (data.load.reference_number) {
      lines.push(`Reference: ${data.load.reference_number}`);
    }
    lines.push('');
  }

  // Shipper Information
  if (data.shipper) {
    lines.push('=== SHIPPER ===');
    lines.push(`Company: ${data.shipper.shipper_name || data.shipper.name || ''}`);
    lines.push(`Contact: ${data.shipper.contact_name || ''}`);
    lines.push(`Phone: ${data.shipper.phone || ''}`);
    lines.push(`Email: ${data.shipper.email || ''}`);
    lines.push('');
  }

  // Carrier Information
  if (data.carrier) {
    lines.push('=== CARRIER ===');
    lines.push(`Company: ${data.carrier.carrier_name || data.carrier.name || ''}`);
    lines.push(`MC#: ${data.carrier.mc_number || ''}`);
    lines.push(`DOT#: ${data.carrier.dot_number || ''}`);
    lines.push(`Dispatcher: ${data.carrier.primary_contact || data.carrier.contact_name || ''}`);
    lines.push(`Phone: ${data.carrier.dispatch_phone || data.carrier.phone || ''}`);
    lines.push(`Driver: ${data.carrier.driver_name || ''}`);
    lines.push(`Driver Phone: ${data.carrier.driver_phone || ''}`);
    lines.push('');
  }

  // Rate Information
  if (data.rate) {
    lines.push('=== RATE ===');
    if (data.rate.shipper_rate) {
      lines.push(`Customer Rate: $${data.rate.shipper_rate.toLocaleString()}`);
    }
    if (data.rate.carrier_rate) {
      lines.push(`Carrier Rate: $${data.rate.carrier_rate.toLocaleString()}`);
    }
    if (data.rate.shipper_rate && data.rate.carrier_rate) {
      const margin = data.rate.shipper_rate - data.rate.carrier_rate;
      lines.push(`Margin: $${margin.toLocaleString()}`);
    }
  }

  return lines.join('\n');
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyToClipboard(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Make it invisible
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
}

/**
 * Copy load details to clipboard
 */
export async function copyLoadToClipboard(load: any): Promise<boolean> {
  const text = formatLoadData(load);

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      return fallbackCopyToClipboard(text);
    }
  } catch (error) {
    console.error('Failed to copy load:', error);
    return false;
  }
}

/**
 * Format load data for clipboard
 */
function formatLoadData(load: any): string {
  const lines: string[] = [];

  lines.push(`Load #: ${load.load_number || ''}`);
  lines.push(`Status: ${load.status || ''}`);
  lines.push(`Route: ${load.pickup_city}, ${load.pickup_state} → ${load.delivery_city}, ${load.delivery_state}`);
  lines.push(`Pickup: ${formatDate(load.pickup_date)} ${load.pickup_time || ''}`);
  lines.push(`Delivery: ${formatDate(load.delivery_date)} ${load.delivery_time || ''}`);
  lines.push(`Commodity: ${load.commodity || ''}`);
  lines.push(`Weight: ${load.weight ? `${load.weight.toLocaleString()} lbs` : ''}`);
  lines.push(`Equipment: ${load.equipment_type || ''}`);

  if (load.shippers) {
    lines.push(`Shipper: ${load.shippers.name || ''}`);
  }

  if (load.carriers) {
    lines.push(`Carrier: ${load.carriers.company_name || ''} (MC# ${load.carriers.mc_number || ''})`);
  }

  if (load.rate) {
    lines.push(`Rate: $${load.rate.toLocaleString()}`);
  }

  return lines.join('\n');
}

/**
 * Copy carrier details to clipboard
 */
export async function copyCarrierToClipboard(carrier: any): Promise<boolean> {
  const text = formatCarrierData(carrier);

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      return fallbackCopyToClipboard(text);
    }
  } catch (error) {
    console.error('Failed to copy carrier:', error);
    return false;
  }
}

/**
 * Format carrier data for clipboard
 */
function formatCarrierData(carrier: any): string {
  const lines: string[] = [];

  lines.push(`Company: ${carrier.company_name || ''}`);
  lines.push(`MC#: ${carrier.mc_number || ''}`);
  lines.push(`DOT#: ${carrier.dot_number || ''}`);
  lines.push(`Contact: ${carrier.contact_name || ''}`);
  lines.push(`Phone: ${carrier.phone || ''}`);
  lines.push(`Email: ${carrier.email || ''}`);

  if (carrier.driver_name) {
    lines.push(`Driver: ${carrier.driver_name}`);
    lines.push(`Driver Phone: ${carrier.driver_phone || ''}`);
  }

  if (carrier.equipment_types && carrier.equipment_types.length > 0) {
    lines.push(`Equipment: ${carrier.equipment_types.join(', ')}`);
  }

  if (carrier.rating) {
    lines.push(`Rating: ${carrier.rating}/5`);
  }

  return lines.join('\n');
}

/**
 * Helper function to format dates
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Show copy success toast/notification
 */
export function showCopySuccess(message: string = 'Copied to clipboard!'): void {
  // This would integrate with your toast notification system
  // For now, we'll use a simple approach
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}

/**
 * Show copy failure toast/notification
 */
export function showCopyError(message: string = 'Failed to copy'): void {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}