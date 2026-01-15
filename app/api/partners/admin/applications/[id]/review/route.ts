// =====================================================
// ADMIN REVIEW APPLICATION API
// Process partner application reviews
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

const resend = new Resend(process.env.RESEND_API_KEY!);

function generateReferralCode(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${random}`;
}

function generateTempPassword(): string {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Review application endpoint called for ID:', params.id);

  try {
    // Use regular client for auth check
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    console.log('User authentication check:', { userId: user?.id, email: user?.email });

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (using regular client is fine here)
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userOrg?.role !== 'owner' && userOrg?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, notes } = body;
    const applicationId = params.id;

    console.log('Review action:', { action, hasNotes: !!notes, applicationId });

    // Use admin client for partner operations (bypasses RLS)
    const adminClient = createAdminClient();

    // Get application
    const { data: application, error: appError } = await adminClient
      .from('partner_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    console.log('Application fetch result:', {
      found: !!application,
      error: appError?.message,
      applicationEmail: application?.email
    });

    if (appError || !application) {
      console.error('Application not found:', appError);
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update application status
    const updateData: any = {
      status: action === 'approve' ? 'approved' :
              action === 'reject' ? 'rejected' :
              'more_info_needed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,  // Changed from user.email to user.id (UUID)
      review_notes: notes,
    };

    console.log('Updating application status:', updateData);

    const { error: updateError } = await adminClient
      .from('partner_applications')
      .update(updateData)
      .eq('id', applicationId);

    if (updateError) {
      console.error('Failed to update application status:', updateError);
      throw updateError;
    }

    console.log('Application status updated successfully');

    // If approved, create partner account
    if (action === 'approve') {
      console.log('Starting partner account creation...');

      const tempPassword = generateTempPassword();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(tempPassword, salt);
      const referralCode = generateReferralCode(application.full_name);

      console.log('Partner account details prepared:', {
        email: application.email,
        name: application.full_name,
        referralCode,
        applicationId
      });

      // Check if partner already exists
      const { data: existingPartner } = await adminClient
        .from('partners')
        .select('id, email')
        .eq('email', application.email)
        .single();

      if (existingPartner) {
        console.error('Partner already exists with this email:', application.email);
        throw new Error(`Partner account already exists for ${application.email}`);
      }

      // Create partner account
      const { data: partner, error: partnerError } = await adminClient
        .from('partners')
        .insert({
          email: application.email,
          full_name: application.full_name,  // Changed from 'name' to 'full_name'
          company_name: application.company_name,  // Changed from 'company' to 'company_name'
          phone: application.phone,
          website: application.website,
          partner_type: application.partner_type,
          password_hash: passwordHash,
          referral_code: referralCode,
          status: 'active',
          tier: 'bronze',
          commission_rate: 0.25,  // 25% as decimal (was causing numeric overflow)
          // Note: application_id column doesn't exist in partners table
        })
        .select()
        .single();

      console.log('Partner creation result:', {
        success: !!partner,
        partnerId: partner?.id,
        error: partnerError?.message,
        errorDetails: partnerError
      });

      if (partnerError) {
        console.error('Failed to create partner account:', partnerError);
        throw partnerError;
      }

      // Initialize statistics
      console.log('Creating partner statistics for partner ID:', partner.id);

      const { error: statsError } = await adminClient
        .from('partner_statistics')
        .insert({
          partner_id: partner.id,
          total_clicks: 0,
          total_signups: 0,
          total_trials: 0,
          total_customers: 0,
          active_customers: 0,
          churned_customers: 0,
          total_revenue_generated: 0,
          total_commission_earned: 0,
          total_commission_paid: 0,
          total_commission_pending: 0,
          total_commission_approved: 0,
          average_customer_value: 0,
          conversion_rate: 0,
          churn_rate: 0,
          current_month_earnings: 0,
          last_month_earnings: 0,
          lifetime_earnings: 0,
        });

      if (statsError) {
        console.error('Failed to create partner statistics:', statsError);
        // Continue anyway - stats can be created later
      }

      // Send welcome email
      console.log('Sending welcome email to:', application.email);
      console.log('Email from address:', process.env.RESEND_FROM_EMAIL || 'noreply@loadvoice.com');

      try {
        const emailResult = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@loadvoice.com',
          to: application.email,
          subject: 'Welcome to the LoadVoice Partner Program!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a73e8;">Welcome to the LoadVoice Partner Program!</h1>
              <p>Hi ${application.full_name},</p>
              <p>Great news! Your partner application has been approved.</p>

              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #333;">Your Partner Account Details</h2>
                <p><strong>Email:</strong> ${application.email}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                <p><strong>Referral Code:</strong> ${referralCode}</p>
                <p><strong>Commission Rate:</strong> 25%</p>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Login to your partner dashboard: <a href="${process.env.NEXT_PUBLIC_APP_URL}/partners/login">Partner Portal</a></li>
                <li>Change your password in the settings</li>
                <li>Set up your payment information</li>
                <li>Start sharing your unique referral link</li>
              </ol>

              <p>Your unique referral link: <code>${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${referralCode}</code></p>

              <p>If you have any questions, please don't hesitate to reach out to our partner support team.</p>

              <p>Best regards,<br>The LoadVoice Team</p>
            </div>
          `,
        });

        console.log('Welcome email sent successfully:', emailResult);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue without failing the approval
      }

      // Log activity
      console.log('Creating activity log for partner ID:', partner.id);

      const { error: logError } = await adminClient
        .from('partner_activity_logs')
        .insert({
          partner_id: partner.id,
          activity_type: 'account_created',  // Changed from 'action' to 'activity_type'
          activity_details: {  // Changed from 'details' to 'activity_details' and made it JSON
            description: 'Partner account created from approved application',
            application_id: applicationId,
            approved_by: user.email
          },
        });

      if (logError) {
        console.error('Failed to create activity log:', logError);
        // Continue anyway - this is not critical
      }

      console.log('Partner approval completed successfully!');

    } else if (action === 'reject') {
      // Send rejection email
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@loadvoice.com',
          to: application.email,
          subject: 'LoadVoice Partner Application Update',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a73e8;">Partner Application Update</h1>
              <p>Hi ${application.full_name},</p>
              <p>Thank you for your interest in the LoadVoice Partner Program.</p>
              <p>After careful review, we've decided not to move forward with your application at this time.</p>
              ${notes ? `<p>Feedback: ${notes}</p>` : ''}
              <p>We encourage you to reapply in the future as our program evolves and expands.</p>
              <p>Best regards,<br>The LoadVoice Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
    } else if (action === 'more_info') {
      // Send request for more info
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@loadvoice.com',
          to: application.email,
          subject: 'LoadVoice Partner Application - Additional Information Needed',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a73e8;">Additional Information Needed</h1>
              <p>Hi ${application.full_name},</p>
              <p>Thank you for applying to the LoadVoice Partner Program.</p>
              <p>To complete our review, we need some additional information:</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p>${notes || 'Please provide more details about your experience and how you plan to promote LoadVoice.'}</p>
              </div>
              <p>Please reply to this email with the requested information.</p>
              <p>Best regards,<br>The LoadVoice Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send more info email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Application ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'}`,
    });
  } catch (error: any) {
    console.error('Review application error:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    });

    // Return more specific error message
    const errorMessage = error?.message || 'Internal server error';

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.details : undefined
      },
      { status: 500 }
    );
  }
}