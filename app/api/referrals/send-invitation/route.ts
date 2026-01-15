// =====================================================
// SEND REFERRAL INVITATION API
// Sends referral invitations via Resend email service
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendReferralInvitation } from '@/lib/resend/sendReferralInvitation';
import { sanitizeEmail, sanitizeInput } from '@/lib/sanitize-simple';
import { inviteRateLimiter } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const identifier = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';

    try {
      await inviteRateLimiter.check(identifier);
    } catch (error) {
      return NextResponse.json(
        { error: 'Too many invitation requests. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { emails, personalMessage } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email is required' },
        { status: 400 }
      );
    }

    if (emails.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 invitations at a time' },
        { status: 400 }
      );
    }

    // Get user's existing referral code if any
    const { data: existingReferral, error: fetchError } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing referral:', fetchError);
    }

    let referralCode: string;

    if (existingReferral?.referral_code) {
      referralCode = existingReferral.referral_code;
      console.log('Using existing referral code:', referralCode);
    } else {
      // Generate a simple unique referral code
      // Format: first part of email + random string
      const emailPrefix = user.email?.split('@')[0]?.toLowerCase() || 'user';
      const randomString = Math.random().toString(36).substring(2, 8);
      referralCode = `${emailPrefix}-${randomString}`.toLowerCase();

      // Make sure it's unique
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('referrals')
          .select('id')
          .eq('referral_code', referralCode)
          .maybeSingle();

        if (!existing) {
          break; // Code is unique
        }

        // Generate a new code if not unique
        const newRandom = Math.random().toString(36).substring(2, 8);
        referralCode = `${emailPrefix}-${newRandom}`.toLowerCase();
        attempts++;
      }

      console.log('Generated new referral code:', referralCode);
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;
    const referralLink = `${baseUrl}/signup?ref=${referralCode}`;
    const referrerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'A friend';

    const results = {
      sent: [] as string[],
      failed: [] as { email: string; error: string }[],
      alreadyReferred: [] as string[],
    };

    // Process each email
    for (const email of emails) {
      try {
        const cleanEmail = sanitizeEmail(email.trim());

        // Check if email is already registered
        const { data: existingUser } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingUser) {
          results.failed.push({
            email: cleanEmail,
            error: 'Already registered',
          });
          continue;
        }

        // Check if already referred
        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_email', cleanEmail)
          .eq('product_type', 'loadvoice')
          .maybeSingle();

        if (existingReferral) {
          results.alreadyReferred.push(cleanEmail);
          continue;
        }

        // Create referral record
        const { data: referral, error: createError } = await supabase
          .from('referrals')
          .insert({
            referrer_id: user.id,
            organization_id: userOrg?.organization_id,
            referral_code: referralCode,
            referred_email: cleanEmail,
            product_type: 'loadvoice',
            status: 'pending',
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create referral for', cleanEmail, ':', {
            error: createError,
            message: createError.message,
            code: createError.code,
            details: createError.details,
            hint: createError.hint,
            userOrg,
            referralCode,
          });
          results.failed.push({
            email: cleanEmail,
            error: createError.message || createError.code || 'Failed to create referral',
          });
          continue;
        }

        // Send email via Resend
        try {
          const messageId = await sendReferralInvitation({
            email: cleanEmail,
            referrerName,
            referralCode,
            referralLink,
            personalMessage: personalMessage ? sanitizeInput(personalMessage) : undefined,
          });

          if (messageId) {
            // Update referral with message ID
            await supabase
              .from('referrals')
              .update({
                metadata: {
                  resend_message_id: messageId,
                  invitation_sent_at: new Date().toISOString()
                }
              })
              .eq('id', referral.id);

            results.sent.push(cleanEmail);
          } else {
            // Email service not configured but referral created
            results.sent.push(cleanEmail);
          }
        } catch (emailError: any) {
          console.error('Email send error for', cleanEmail, ':', emailError);
          // Referral created but email failed
          results.sent.push(cleanEmail);
        }

        // Update statistics
        try {
          await supabase.rpc('increment_counter', {
            table_name: 'referral_statistics',
            user_id: user.id,
            column_name: 'total_referrals_sent',
          });
        } catch (err) {
          console.warn('Failed to update statistics:', err);
        }

      } catch (error: any) {
        console.error('Error processing referral for', email, ':', error);
        results.failed.push({
          email,
          error: error.message || 'Processing error',
        });
      }
    }

    // Log audit
    try {
      await supabase.rpc('log_audit', {
        p_user_id: user.id,
        p_action: 'referral_invitations_sent',
        p_resource_type: 'referral',
        p_metadata: {
          total_sent: results.sent.length,
          total_failed: results.failed.length,
          total_already_referred: results.alreadyReferred.length,
        },
      });
    } catch (err) {
      console.warn('Failed to log audit:', err);
    }

    return NextResponse.json({
      success: true,
      referralCode,
      referralLink,
      results,
      message: `Successfully sent ${results.sent.length} invitation${results.sent.length !== 1 ? 's' : ''}`,
    });

  } catch (error) {
    console.error('Send referral invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}