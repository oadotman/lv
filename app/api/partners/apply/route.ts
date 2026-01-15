// =====================================================
// PARTNER APPLICATION API
// Handles partner program application submissions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { PARTNER_VALIDATION, type PartnerApplication } from '@/lib/partners/types';
import { sendPartnerApplicationEmail } from '@/lib/emails/partners/application';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!body.full_name?.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!body.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!PARTNER_VALIDATION.email.test(body.email)) {
      errors.email = 'Invalid email format';
    }

    if (!body.partner_type) {
      errors.partner_type = 'Partner type is required';
    }

    if (!body.why_partner?.trim() || body.why_partner.length < PARTNER_VALIDATION.why_partner.min) {
      errors.why_partner = `Reason must be at least ${PARTNER_VALIDATION.why_partner.min} characters`;
    }

    if (!body.terms_accepted) {
      errors.terms_accepted = 'You must accept the terms and conditions';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, errors, message: 'Validation failed' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if email already has a pending or approved application
    const { data: existingApplication } = await supabase
      .from('partner_applications')
      .select('id, status')
      .eq('email', body.email.toLowerCase())
      .in('status', ['pending', 'approved'])
      .single();

    if (existingApplication) {
      const message = existingApplication.status === 'approved'
        ? 'This email is already registered as a partner. Please use the login page.'
        : 'An application with this email is already pending review.';

      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }

    // Check if email is already a partner
    const { data: existingPartner } = await supabase
      .from('partners')
      .select('id')
      .eq('email', body.email.toLowerCase())
      .single();

    if (existingPartner) {
      return NextResponse.json(
        { success: false, message: 'This email is already registered as a partner. Please use the login page.' },
        { status: 400 }
      );
    }

    // Create the application
    const application: Partial<PartnerApplication> = {
      id: crypto.randomUUID(),
      email: body.email.toLowerCase(),
      full_name: body.full_name.trim(),
      company_name: body.company_name?.trim() || null,
      website: body.website?.trim() || null,
      phone: body.phone?.trim() || null,
      partner_type: body.partner_type,
      clients_per_year: body.clients_per_year || null,
      crms_used: body.crms_used || [],
      how_heard: body.how_heard?.trim() || null,
      why_partner: body.why_partner.trim(),
      has_used_loadvoice: body.has_used_loadvoice === 'yes',
      terms_accepted: true,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || req.ip,
      user_agent: req.headers.get('user-agent') || undefined,
    };

    const { data: createdApplication, error } = await supabase
      .from('partner_applications')
      .insert(application)
      .select()
      .single();

    if (error) {
      console.error('Error creating partner application:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        application
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to submit application';

      if (error.code === '23505') {
        errorMessage = 'An application with this email already exists';
      } else if (error.code === '42P01') {
        errorMessage = 'Database table not found. Please contact support.';
      } else if (error.code === '23502') {
        errorMessage = 'Missing required information. Please fill all required fields.';
      } else if (error.message?.includes('permission')) {
        errorMessage = 'Permission denied. Please try again or contact support.';
      } else if (error.message?.includes('connection')) {
        errorMessage = 'Database connection error. Please try again.';
      }

      // In development, include more details
      const isDev = process.env.NODE_ENV === 'development';

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          ...(isDev && {
            debug: {
              code: error.code,
              details: error.message,
              hint: error.hint
            }
          })
        },
        { status: 500 }
      );
    }

    // Send confirmation email to applicant
    try {
      await sendPartnerApplicationEmail(
        application.email!,
        application.full_name!,
        'received'
      );
    } catch (emailError) {
      console.error('Failed to send application email:', emailError);
      // Don't fail the request if email fails
    }

    // Create notification for owner in the database
    try {
      // Get the owner user ID (you)
      const { data: owner } = await supabase
        .from('user_organizations')
        .select('user_id')
        .eq('role', 'owner')
        .single();

      if (owner) {
        await supabase
          .from('notifications')
          .insert({
            id: crypto.randomUUID(),
            user_id: owner.user_id,
            notification_type: 'partner_application',
            title: 'New Partner Application',
            message: `${application.full_name} from ${application.company_name || 'Individual'} has applied to become a partner.`,
            link: '/admin/partners/applications',
            is_read: false,
            created_at: new Date().toISOString()
          });
      }
    } catch (notifError) {
      console.error('Failed to create owner notification:', notifError);
      // Don't fail the request if notification fails
    }

    // Send notification email to admin (you)
    try {
      const adminEmail = process.env.PARTNER_ADMIN_EMAIL || 'adeliyitomiwa@yahoo.com';
      await sendPartnerApplicationEmail(
        adminEmail,
        'Admin',
        'new_application',
        {
          applicant_name: application.full_name,
          applicant_email: application.email,
          partner_type: application.partner_type,
          company: application.company_name,
        }
      );
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      application: {
        id: createdApplication.id,
        status: createdApplication.status,
      },
      message: 'Application submitted successfully',
    });
  } catch (error) {
    console.error('Partner application error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorMessage = error instanceof Error
      ? `Application error: ${error.message}`
      : 'An unexpected error occurred while processing your application';

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          debug: error instanceof Error ? error.message : String(error)
        })
      },
      { status: 500 }
    );
  }
}

// GET: Check application status
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: application, error } = await supabase
      .from('partner_applications')
      .select('id, status, submitted_at, reviewed_at')
      .eq('email', email.toLowerCase())
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !application) {
      return NextResponse.json(
        { success: false, message: 'No application found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        status: application.status,
        submitted_at: application.submitted_at,
        reviewed_at: application.reviewed_at,
      },
    });
  } catch (error) {
    console.error('Application status check error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}