// =====================================================
// ADMIN REVIEW APPLICATION API
// Process partner application reviews
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, notes } = body;
    const applicationId = params.id;

    // Get application
    const { data: application, error: appError } = await supabase
      .from('partner_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
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
      reviewed_by: profile.full_name || user.email,
      review_notes: notes,
    };

    const { error: updateError } = await supabase
      .from('partner_applications')
      .update(updateData)
      .eq('id', applicationId);

    if (updateError) {
      throw updateError;
    }

    // If approved, create partner account
    if (action === 'approve') {
      const tempPassword = generateTempPassword();
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(tempPassword, salt);
      const referralCode = generateReferralCode(application.full_name);

      // Create partner account
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .insert({
          email: application.email,
          name: application.full_name,
          company: application.company_name,
          phone: application.phone,
          website: application.website,
          partner_type: application.partner_type,
          password_hash: passwordHash,
          referral_code: referralCode,
          status: 'active',
          tier: 'bronze',
          commission_rate: 25,
          application_id: applicationId,
        })
        .select()
        .single();

      if (partnerError) {
        throw partnerError;
      }

      // Initialize statistics
      await supabase
        .from('partner_statistics')
        .insert({
          partner_id: partner.id,
          total_clicks: 0,
          total_referrals: 0,
          active_customers: 0,
          lifetime_earnings: 0,
          churn_rate: 0,
        });

      // Send welcome email
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@synqall.com',
        to: application.email,
        subject: 'Welcome to the SynQall Partner Program!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a73e8;">Welcome to the SynQall Partner Program!</h1>
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

            <p>Best regards,<br>The SynQall Team</p>
          </div>
        `,
      });

      // Log activity
      await supabase
        .from('partner_activity_logs')
        .insert({
          partner_id: partner.id,
          action: 'account_created',
          details: 'Partner account created from approved application',
        });

    } else if (action === 'reject') {
      // Send rejection email
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@synqall.com',
        to: application.email,
        subject: 'SynQall Partner Application Update',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a73e8;">Partner Application Update</h1>
            <p>Hi ${application.full_name},</p>
            <p>Thank you for your interest in the SynQall Partner Program.</p>
            <p>After careful review, we've decided not to move forward with your application at this time.</p>
            ${notes ? `<p>Feedback: ${notes}</p>` : ''}
            <p>We encourage you to reapply in the future as our program evolves and expands.</p>
            <p>Best regards,<br>The SynQall Team</p>
          </div>
        `,
      });
    } else if (action === 'more_info') {
      // Send request for more info
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@synqall.com',
        to: application.email,
        subject: 'SynQall Partner Application - Additional Information Needed',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a73e8;">Additional Information Needed</h1>
            <p>Hi ${application.full_name},</p>
            <p>Thank you for applying to the SynQall Partner Program.</p>
            <p>To complete our review, we need some additional information:</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p>${notes || 'Please provide more details about your experience and how you plan to promote SynQall.'}</p>
            </div>
            <p>Please reply to this email with the requested information.</p>
            <p>Best regards,<br>The SynQall Team</p>
          </div>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Application ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'}`,
    });
  } catch (error) {
    console.error('Review application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}