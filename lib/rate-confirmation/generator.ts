import { createClient } from '@/lib/supabase/server';

/**
 * Generates a unique rate confirmation number
 * Format: RC-{YYYYMMDD}-{SEQ}
 * Example: RC-20250115-001
 */
export async function generateRateConNumber(organizationId: string): Promise<string> {
  const supabase = createClient();

  // Get current date in YYYYMMDD format
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Get the highest sequence number for today
  const { data: latestRateCon, error } = await supabase
    .from('rate_confirmations')
    .select('rate_con_number')
    .eq('organization_id', organizationId)
    .like('rate_con_number', `RC-${dateStr}-%`)
    .order('rate_con_number', { ascending: false })
    .limit(1)
    .single();

  let sequence = 1;

  if (latestRateCon && !error) {
    // Extract the sequence number from the latest rate con
    const parts = latestRateCon.rate_con_number.split('-');
    if (parts.length === 3) {
      sequence = parseInt(parts[2]) + 1;
    }
  }

  // Format sequence with leading zeros
  const sequenceStr = String(sequence).padStart(3, '0');

  return `RC-${dateStr}-${sequenceStr}`;
}

/**
 * Formats a date string for display
 */
export function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return 'TBD';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formats a time string for display
 */
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return 'TBD';

  try {
    // Handle various time formats
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const min = minutes.substring(0, 2);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${min} ${period}`;
    }
  } catch (e) {
    return timeStr;
  }

  return timeStr;
}

/**
 * Formats currency for display
 */
export function formatCurrency(amount: number | null): string {
  if (!amount) return '$0.00';
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Interface for Load data with all required fields
 */
export interface LoadDataComplete {
  id: string;
  load_number?: string;
  reference_number?: string;
  po_number?: string;

  // Origin
  origin_address?: string;
  origin_city: string;
  origin_state: string;
  origin_zip?: string;

  // Destination
  destination_address?: string;
  destination_city: string;
  destination_state: string;
  destination_zip?: string;

  // Dates
  pickup_date: Date | string;
  pickup_time?: string;
  pickup_window_start?: string;
  pickup_window_end?: string;
  delivery_date: Date | string;
  delivery_time?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;

  // Shipment details
  commodity: string;
  weight_lbs?: number;
  pallet_count?: number;
  equipment_type?: string;
  special_requirements?: string[];
  notes?: string;

  // Rates
  carrier_rate?: number;
  shipper_rate?: number;
  margin?: number;
  margin_percent?: number;
  payment_terms?: string;

  // Carrier info (from joined table)
  carrier?: {
    id: string;
    carrier_name: string;
    mc_number?: string;
    dot_number?: string;
    primary_contact?: string;
    dispatch_phone?: string;
    dispatch_email?: string;
    driver_name?: string;
    driver_phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  // Shipper info (from joined table)
  shipper?: {
    id: string;
    shipper_name: string;
    company_name?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

/**
 * Interface for Organization/Broker data
 */
export interface OrganizationData {
  id: string;
  name: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_zip?: string;
  mc_number?: string;
  dot_number?: string;
  logo_url?: string;
  billing_email?: string;
  rate_con_terms?: string;
  default_payment_terms?: string;
  settings?: any;
}

/**
 * Fetches complete load data with carrier and shipper info
 */
export async function fetchLoadData(loadId: string): Promise<LoadDataComplete | null> {
  const supabase = createClient();

  const { data: load, error } = await supabase
    .from('loads')
    .select(`
      *,
      carrier:carrier_id (
        id,
        carrier_name,
        mc_number,
        dot_number,
        primary_contact,
        dispatch_phone,
        dispatch_email,
        driver_name,
        driver_phone,
        address,
        city,
        state,
        zip
      ),
      shipper:shipper_id (
        id,
        shipper_name,
        company_name,
        contact_name,
        phone,
        email,
        address,
        city,
        state,
        zip
      )
    `)
    .eq('id', loadId)
    .single();

  if (error || !load) {
    console.error('Error fetching load:', error);
    return null;
  }

  return load as LoadDataComplete;
}

/**
 * Fetches organization data
 */
export async function fetchOrganizationData(organizationId: string): Promise<OrganizationData | null> {
  const supabase = createClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error || !org) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return org as OrganizationData;
}

/**
 * Creates a rate confirmation record in the database
 */
export async function createRateConfirmation(
  loadId: string,
  organizationId: string,
  pdfUrl: string,
  rateConNumber: string
) {
  const supabase = createClient();

  // Mark any existing rate cons for this load as not latest
  await supabase
    .from('rate_confirmations')
    .update({ is_latest: false })
    .eq('load_id', loadId);

  // Get the current version number
  const { data: existingRateCons } = await supabase
    .from('rate_confirmations')
    .select('version')
    .eq('load_id', loadId)
    .order('version', { ascending: false })
    .limit(1);

  const version = existingRateCons && existingRateCons.length > 0
    ? (existingRateCons[0].version || 0) + 1
    : 1;

  // Create new rate confirmation
  const { data, error } = await supabase
    .from('rate_confirmations')
    .insert({
      organization_id: organizationId,
      load_id: loadId,
      rate_con_number: rateConNumber,
      pdf_url: pdfUrl,
      status: 'generated',
      version: version,
      is_latest: true,
      created_at: new Date().toISOString(),
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating rate confirmation:', error);
    throw error;
  }

  return data;
}