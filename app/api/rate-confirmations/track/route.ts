import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Public endpoint for tracking views and downloads
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get request body
    const body = await request.json();
    const { tracking_token, action, rate_confirmation_id } = body;

    // Get client info
    const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const user_agent = request.headers.get('user-agent');

    if (tracking_token) {
      // Track using public tracking token
      let result;

      if (action === 'view') {
        const { data, error } = await supabase.rpc('increment_rate_confirmation_views', {
          p_tracking_token: tracking_token,
          p_ip_address: ip_address,
          p_user_agent: user_agent
        });

        if (error) {
          console.error('Error tracking view:', error);
          return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
        }

        result = data;
      } else if (action === 'download') {
        const { data, error } = await supabase.rpc('increment_rate_confirmation_downloads', {
          p_tracking_token: tracking_token,
          p_ip_address: ip_address,
          p_user_agent: user_agent
        });

        if (error) {
          console.error('Error tracking download:', error);
          return NextResponse.json({ error: 'Failed to track download' }, { status: 500 });
        }

        result = data;
      } else {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }

      return NextResponse.json(result);
    } else if (rate_confirmation_id) {
      // Authenticated tracking (for internal users)
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized for direct tracking' }, { status: 401 });
      }

      // Verify user has access to this rate confirmation
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!userOrg) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const { data: rateConfirmation } = await supabase
        .from('rate_confirmations')
        .select('organization_id, view_count, download_count')
        .eq('id', rate_confirmation_id)
        .single();

      if (!rateConfirmation || rateConfirmation.organization_id !== userOrg.organization_id) {
        return NextResponse.json({ error: 'Rate confirmation not found' }, { status: 404 });
      }

      // Update counts directly
      if (action === 'view') {
        await supabase
          .from('rate_confirmations')
          .update({
            view_count: (rateConfirmation.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString()
          })
          .eq('id', rate_confirmation_id);
      } else if (action === 'download') {
        await supabase
          .from('rate_confirmations')
          .update({
            download_count: (rateConfirmation.download_count || 0) + 1
          })
          .eq('id', rate_confirmation_id);
      }

      // Log activity
      await supabase
        .from('rate_confirmation_activities')
        .insert({
          rate_confirmation_id,
          activity_type: action === 'view' ? 'viewed' : 'downloaded',
          details: { internal: true },
          created_by: user.id,
          created_at: new Date().toISOString()
        });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Tracking token or rate confirmation ID required' }, { status: 400 });

  } catch (error) {
    console.error('Error tracking rate confirmation:', error);
    return NextResponse.json({
      error: 'Failed to track activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to generate a tracking link
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const rateConfirmationId = searchParams.get('rate_confirmation_id');

    if (!rateConfirmationId) {
      return NextResponse.json({ error: 'Rate confirmation ID is required' }, { status: 400 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify rate confirmation belongs to organization
    const { data: rateConfirmation } = await supabase
      .from('rate_confirmations')
      .select('*')
      .eq('id', rateConfirmationId)
      .eq('organization_id', userOrg.organization_id)
      .single();

    if (!rateConfirmation) {
      return NextResponse.json({ error: 'Rate confirmation not found' }, { status: 404 });
    }

    // Check if tracking already exists
    const { data: existingTracking } = await supabase
      .from('rate_confirmation_tracking')
      .select('*')
      .eq('rate_confirmation_id', rateConfirmationId)
      .single();

    if (existingTracking) {
      // Return existing tracking info
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://loadvoice.com';
      return NextResponse.json({
        tracking_token: existingTracking.tracking_token,
        tracking_url: `${baseUrl}/track/${existingTracking.tracking_token}`,
        view_count: existingTracking.view_count,
        download_count: existingTracking.download_count,
        last_viewed_at: existingTracking.last_viewed_at,
        last_downloaded_at: existingTracking.last_downloaded_at
      });
    }

    // Create new tracking record
    const { data: newTracking, error: trackingError } = await supabase
      .from('rate_confirmation_tracking')
      .insert({
        rate_confirmation_id: rateConfirmationId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (trackingError || !newTracking) {
      console.error('Error creating tracking:', trackingError);
      return NextResponse.json({ error: 'Failed to create tracking' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://loadvoice.com';
    return NextResponse.json({
      tracking_token: newTracking.tracking_token,
      tracking_url: `${baseUrl}/track/${newTracking.tracking_token}`,
      view_count: 0,
      download_count: 0
    });

  } catch (error) {
    console.error('Error creating tracking link:', error);
    return NextResponse.json({
      error: 'Failed to create tracking link',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}