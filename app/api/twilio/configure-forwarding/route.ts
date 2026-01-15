/**
 * Configure Call Forwarding Settings
 * Saves user's forwarding preferences to the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/**
 * POST /api/twilio/configure-forwarding
 *
 * Save forwarding configuration when user wants to forward
 * their existing business number to LoadVoice
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const { phoneNumber, businessPhone, forwardingMethod } = await req.json();

    // Validate inputs
    if (!phoneNumber) {
      return NextResponse.json({ error: 'LoadVoice number is required' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Update the Twilio phone number record with forwarding info
    const { data: updatedNumber, error: updateError } = await adminSupabase
      .from('twilio_phone_numbers')
      .update({
        forwarding_number: businessPhone || null,
        forwarding_type: forwardingMethod || null,
        updated_at: new Date().toISOString(),
        metadata: {
          forwarding_configured_at: new Date().toISOString(),
          forwarding_configured_by: user.id,
          business_phone: businessPhone
        }
      })
      .eq('phone_number', phoneNumber)
      .eq('organization_id', userOrg.organization_id)
      .select()
      .single();

    if (updateError) {
      console.error('[Configure Forwarding] Error updating number:', updateError);
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }

    // Also update organization settings if this is their first setup
    await adminSupabase
      .from('system_settings')
      .upsert({
        organization_id: userOrg.organization_id,
        metadata: {
          setup_completed: true,
          setup_type: businessPhone ? 'forwarding' : 'direct',
          setup_completed_at: new Date().toISOString()
        }
      });

    // Log the configuration in activity logs
    await adminSupabase
      .from('audit_logs')
      .insert({
        organization_id: userOrg.organization_id,
        user_id: user.id,
        action: 'configure_forwarding',
        details: {
          loadvoice_number: phoneNumber,
          business_phone: businessPhone,
          forwarding_method: forwardingMethod,
          setup_type: businessPhone ? 'forwarding' : 'direct'
        },
        created_at: new Date().toISOString()
      });

    // Return success with instructions
    const instructions = businessPhone
      ? {
          title: 'Complete Your Setup',
          steps: [
            `Call your phone provider (${getProviderName(businessPhone)})`,
            `Request call forwarding to ${phoneNumber}`,
            `Choose forwarding type: ${getForwardingDescription(forwardingMethod)}`,
            'Test by calling your business number',
            'Verify the call appears in your LoadVoice dashboard'
          ]
        }
      : {
          title: 'You\'re All Set!',
          steps: [
            `Save ${phoneNumber} as "LoadVoice" in your contacts`,
            'Share this number with carriers and shippers',
            'All calls to this number will be automatically processed',
            'Check your dashboard for transcriptions and extracted data'
          ]
        };

    return NextResponse.json({
      success: true,
      phoneNumber: updatedNumber.phone_number,
      configuration: {
        businessPhone,
        forwardingMethod,
        setupType: businessPhone ? 'forwarding' : 'direct'
      },
      instructions
    });

  } catch (error) {
    console.error('[Configure Forwarding] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to save configuration'
    }, { status: 500 });
  }
}

/**
 * GET /api/twilio/configure-forwarding
 *
 * Get current forwarding configuration
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get organization's phone number and forwarding config
    const adminSupabase = createAdminClient();
    const { data: phoneNumber } = await adminSupabase
      .from('twilio_phone_numbers')
      .select('*')
      .eq('organization_id', userOrg.organization_id)
      .eq('is_active', true)
      .single();

    if (!phoneNumber) {
      return NextResponse.json({
        hasNumber: false,
        message: 'No LoadVoice number configured yet'
      });
    }

    return NextResponse.json({
      hasNumber: true,
      phoneNumber: phoneNumber.phone_number,
      configuration: {
        businessPhone: phoneNumber.forwarding_number,
        forwardingMethod: phoneNumber.forwarding_type,
        setupType: phoneNumber.forwarding_number ? 'forwarding' : 'direct'
      }
    });

  } catch (error) {
    console.error('[Configure Forwarding] GET Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch configuration'
    }, { status: 500 });
  }
}

/**
 * Helper: Guess provider from phone number
 */
function getProviderName(phoneNumber: string): string {
  // This is a simple heuristic, in production you might want to use a number lookup service
  if (phoneNumber.includes('800') || phoneNumber.includes('888') || phoneNumber.includes('877')) {
    return 'your toll-free provider';
  }
  return 'your phone service provider';
}

/**
 * Helper: Get forwarding method description
 */
function getForwardingDescription(method: string): string {
  switch (method) {
    case 'unconditional':
      return 'Always forward (all calls go to LoadVoice)';
    case 'busy':
      return 'Forward when busy (only when you\'re on another call)';
    case 'no-answer':
      return 'Forward when no answer (after 4 rings)';
    default:
      return 'Call forwarding';
  }
}