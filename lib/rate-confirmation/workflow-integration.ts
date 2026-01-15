import { createClient } from '@/lib/supabase/server';

/**
 * Load Status Workflow Integration for Rate Confirmations
 *
 * This module handles the integration between rate confirmations and load statuses,
 * automatically updating load status based on rate confirmation events.
 */

export type RateConfirmationEvent =
  | 'generated'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type LoadStatusUpdate = {
  status?: string;
  rate_confirmation_status?: string;
  carrier_confirmed?: boolean;
  carrier_confirmed_at?: string;
  notes?: string;
};

/**
 * Updates load status based on rate confirmation events
 */
export async function handleRateConfirmationEvent(
  loadId: string,
  event: RateConfirmationEvent,
  details?: any
): Promise<LoadStatusUpdate | null> {
  const supabase = createClient();

  try {
    // Get current load status
    const { data: load, error } = await supabase
      .from('loads')
      .select('status, carrier_id')
      .eq('id', loadId)
      .single();

    if (error || !load) {
      console.error('Error fetching load:', error);
      return null;
    }

    let update: LoadStatusUpdate | null = null;

    switch (event) {
      case 'generated':
        // Rate confirmation generated - no status change needed
        update = {
          rate_confirmation_status: 'generated',
          notes: 'Rate confirmation generated'
        };
        break;

      case 'sent':
        // Rate confirmation sent to carrier
        if (load.status === 'quoted' || load.status === 'needs_carrier') {
          update = {
            status: 'dispatched',
            rate_confirmation_status: 'sent',
            notes: `Rate confirmation sent to carrier at ${new Date().toISOString()}`
          };
        } else {
          update = {
            rate_confirmation_status: 'sent'
          };
        }
        break;

      case 'viewed':
        // Carrier viewed the rate confirmation
        update = {
          rate_confirmation_status: 'viewed',
          notes: `Rate confirmation viewed by carrier at ${new Date().toISOString()}`
        };
        break;

      case 'signed':
      case 'accepted':
        // Carrier accepted/signed the rate confirmation
        if (load.status === 'dispatched') {
          update = {
            status: 'confirmed',
            rate_confirmation_status: 'accepted',
            carrier_confirmed: true,
            carrier_confirmed_at: new Date().toISOString(),
            notes: `Carrier confirmed acceptance at ${new Date().toISOString()}`
          };
        } else {
          update = {
            rate_confirmation_status: 'accepted',
            carrier_confirmed: true,
            carrier_confirmed_at: new Date().toISOString()
          };
        }
        break;

      case 'rejected':
        // Carrier rejected the rate confirmation
        update = {
          status: 'needs_carrier',
          rate_confirmation_status: 'rejected',
          carrier_confirmed: false,
          notes: `Carrier rejected rate confirmation at ${new Date().toISOString()}. Reason: ${details?.reason || 'Not specified'}`
        };
        break;

      case 'expired':
        // Rate confirmation expired without acceptance
        if (load.status === 'dispatched') {
          update = {
            status: 'needs_carrier',
            rate_confirmation_status: 'expired',
            notes: 'Rate confirmation expired without carrier acceptance'
          };
        } else {
          update = {
            rate_confirmation_status: 'expired'
          };
        }
        break;

      default:
        console.warn('Unknown rate confirmation event:', event);
        return null;
    }

    // Apply the update if we have one
    if (update) {
      const { error: updateError } = await supabase
        .from('loads')
        .update({
          ...update,
          updated_at: new Date().toISOString()
        })
        .eq('id', loadId);

      if (updateError) {
        console.error('Error updating load:', updateError);
        return null;
      }

      // Log the status change
      await logStatusChange(loadId, event, update, details);
    }

    return update;
  } catch (error) {
    console.error('Error handling rate confirmation event:', error);
    return null;
  }
}

/**
 * Logs status changes for audit trail
 */
async function logStatusChange(
  loadId: string,
  event: RateConfirmationEvent,
  update: LoadStatusUpdate,
  details?: any
) {
  const supabase = createClient();

  try {
    await supabase
      .from('load_status_history')
      .insert({
        load_id: loadId,
        status: update.status,
        change_type: 'rate_confirmation_event',
        change_reason: event,
        details: {
          ...update,
          ...details
        },
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging status change:', error);
  }
}

/**
 * Checks if a load requires rate confirmation based on status
 */
export function requiresRateConfirmation(loadStatus: string): boolean {
  const statusesRequiringRateCon = [
    'quoted',
    'dispatched',
    'confirmed',
    'in_transit',
    'delivered'
  ];

  return statusesRequiringRateCon.includes(loadStatus);
}

/**
 * Gets the next recommended action for a load based on rate confirmation status
 */
export function getNextAction(
  loadStatus: string,
  rateConfirmationStatus?: string
): string | null {
  if (!requiresRateConfirmation(loadStatus)) {
    return null;
  }

  if (!rateConfirmationStatus || rateConfirmationStatus === 'none') {
    return 'generate_rate_confirmation';
  }

  switch (rateConfirmationStatus) {
    case 'generated':
      return 'send_to_carrier';
    case 'sent':
      return 'wait_for_acceptance';
    case 'viewed':
      return 'follow_up_with_carrier';
    case 'accepted':
      return 'proceed_with_dispatch';
    case 'rejected':
      return 'renegotiate_or_find_new_carrier';
    case 'expired':
      return 'resend_or_find_new_carrier';
    default:
      return null;
  }
}

/**
 * Validates if a rate confirmation can be generated for a load
 */
export async function canGenerateRateConfirmation(loadId: string): Promise<{
  canGenerate: boolean;
  missingFields: string[];
  errors: string[];
}> {
  const supabase = createClient();

  try {
    const { data: load, error } = await supabase
      .from('loads')
      .select(`
        *,
        carriers (
          id,
          carrier_name,
          mc_number,
          dot_number
        )
      `)
      .eq('id', loadId)
      .single();

    if (error || !load) {
      return {
        canGenerate: false,
        missingFields: [],
        errors: ['Load not found']
      };
    }

    const missingFields: string[] = [];
    const errors: string[] = [];

    // Check required fields
    if (!load.carrier_id) missingFields.push('carrier');
    if (!load.carriers) errors.push('Carrier information not found');
    if (!load.carrier_rate && !load.rate_to_carrier) missingFields.push('carrier_rate');
    if (!load.origin_city) missingFields.push('origin_city');
    if (!load.origin_state) missingFields.push('origin_state');
    if (!load.destination_city) missingFields.push('destination_city');
    if (!load.destination_state) missingFields.push('destination_state');
    if (!load.pickup_date) missingFields.push('pickup_date');
    if (!load.delivery_date) missingFields.push('delivery_date');

    // Check carrier requirements
    if (load.carriers && !load.carriers.mc_number && !load.carriers.dot_number) {
      errors.push('Carrier must have MC or DOT number');
    }

    return {
      canGenerate: missingFields.length === 0 && errors.length === 0,
      missingFields,
      errors
    };
  } catch (error) {
    console.error('Error validating rate confirmation:', error);
    return {
      canGenerate: false,
      missingFields: [],
      errors: ['Validation failed']
    };
  }
}

/**
 * Automatically generates and sends rate confirmations for eligible loads
 */
export async function autoGenerateRateConfirmations(
  organizationId: string,
  options?: {
    statuses?: string[];
    autoSend?: boolean;
    limit?: number;
  }
): Promise<{
  processed: number;
  generated: number;
  sent: number;
  errors: string[];
}> {
  const supabase = createClient();
  const results = {
    processed: 0,
    generated: 0,
    sent: 0,
    errors: [] as string[]
  };

  try {
    // Find eligible loads
    let query = supabase
      .from('loads')
      .select('id, reference_number, status')
      .eq('organization_id', organizationId)
      .is('rate_confirmation_id', null);

    if (options?.statuses) {
      query = query.in('status', options.statuses);
    } else {
      query = query.in('status', ['dispatched', 'confirmed']);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: loads, error } = await query;

    if (error || !loads) {
      results.errors.push('Failed to fetch eligible loads');
      return results;
    }

    for (const load of loads) {
      results.processed++;

      // Validate if can generate
      const validation = await canGenerateRateConfirmation(load.id);
      if (!validation.canGenerate) {
        results.errors.push(
          `Load ${load.reference_number}: ${validation.errors.join(', ') || 'Missing: ' + validation.missingFields.join(', ')}`
        );
        continue;
      }

      try {
        // Generate rate confirmation
        const response = await fetch('/api/rate-confirmations/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ load_id: load.id })
        });

        if (response.ok) {
          results.generated++;

          // Auto-send if configured
          if (options?.autoSend) {
            // Get carrier email
            const { data: loadDetails } = await supabase
              .from('loads')
              .select('carriers (dispatch_email, email)')
              .eq('id', load.id)
              .single();

            const carrier = Array.isArray(loadDetails?.carriers) ? loadDetails?.carriers?.[0] : loadDetails?.carriers;
            const carrierEmail = carrier?.dispatch_email || carrier?.email;

            if (carrierEmail) {
              const sendResponse = await fetch('/api/rate-confirmations/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  rate_confirmation_id: (await response.json()).rate_confirmation.id,
                  to_emails: [carrierEmail],
                  include_acceptance_link: true
                })
              });

              if (sendResponse.ok) {
                results.sent++;
              }
            }
          }
        } else {
          results.errors.push(`Failed to generate for load ${load.reference_number}`);
        }
      } catch (err) {
        results.errors.push(`Error processing load ${load.reference_number}: ${err}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Error in auto-generation:', error);
    results.errors.push('Auto-generation failed');
    return results;
  }
}

export default {
  handleRateConfirmationEvent,
  requiresRateConfirmation,
  getNextAction,
  canGenerateRateConfirmation,
  autoGenerateRateConfirmations
};