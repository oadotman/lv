// =====================================================
// REFERRAL CODE GENERATION API
// Handles generating and retrieving user's referral code
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id, organization:organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (orgError || !userOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user already has a referral code
    const { data: existingCode, error: codeError } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .limit(1)
      .maybeSingle();

    let referralCode: string;

    if (existingCode?.referral_code) {
      referralCode = existingCode.referral_code;
    } else {
      // Generate new referral code using the database function
      const { data: newCodeData, error: generateError } = await supabase
        .rpc('generate_referral_code', { user_id: user.id });

      if (generateError || !newCodeData) {
        console.error('Error generating referral code:', generateError);
        return NextResponse.json(
          { error: 'Failed to generate referral code' },
          { status: 500 }
        );
      }

      referralCode = newCodeData;

      // Create initial referral record to reserve the code
      const { error: createError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: user.id,
          organization_id: userOrg.organization_id,
          referral_code: referralCode,
          referred_email: `placeholder_${Date.now()}@temp.com`, // Temporary placeholder
          status: 'pending',
        });

      if (createError) {
        console.error('Error creating referral record:', createError);
        return NextResponse.json(
          { error: 'Failed to create referral record' },
          { status: 500 }
        );
      }

      // Delete the placeholder record immediately (we just needed to reserve the code)
      await supabase
        .from('referrals')
        .delete()
        .eq('referral_code', referralCode)
        .eq('referred_email', `placeholder_${Date.now()}@temp.com`);
    }

    // Get user's referral statistics
    const { data: stats } = await supabase
      .from('referral_statistics')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get referral tiers
    const { data: tiers } = await supabase
      .from('referral_tiers')
      .select('*')
      .order('tier_level', { ascending: true });

    // Build referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;
    const referralLink = `${baseUrl}/signup?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralLink,
      statistics: stats || {
        total_referrals_sent: 0,
        total_signups: 0,
        total_active: 0,
        current_tier: 0,
        total_minutes_earned: 0,
        total_credits_earned_cents: 0,
        available_minutes: 0,
        available_credits_cents: 0,
      },
      tiers: tiers || [],
      shareLinks: {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `Join me on LoadVoice and get 30 free minutes when you sign up!`
        )}&url=${encodeURIComponent(referralLink)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          referralLink
        )}`,
        email: `mailto:?subject=${encodeURIComponent(
          'Join me on LoadVoice'
        )}&body=${encodeURIComponent(
          `I've been using LoadVoice for call recording and transcription. Join using my referral link and get 30 free minutes when you sign up!\n\n${referralLink}`
        )}`,
      },
    });
  } catch (error) {
    console.error('Referral generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new referral invitation
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { email, productType = 'loadvoice' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Check for self-referral
    if (normalizedEmail === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'You cannot refer yourself' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    // Check if email is already registered
    const { data: existingUser } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      );
    }

    // Check if email has already been referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id, status')
      .eq('referred_email', normalizedEmail)
      .eq('product_type', productType)
      .maybeSingle();

    if (existingReferral) {
      return NextResponse.json(
        { error: 'This email has already been referred' },
        { status: 400 }
      );
    }

    // Generate referral code
    const { data: referralCode } = await supabase
      .rpc('generate_referral_code', { user_id: user.id });

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Failed to generate referral code' },
        { status: 500 }
      );
    }

    // Create referral record
    const { data: referral, error: createError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: user.id,
        organization_id: userOrg?.organization_id,
        referral_code: referralCode,
        referred_email: normalizedEmail,
        product_type: productType,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating referral:', createError);
      return NextResponse.json(
        { error: 'Failed to create referral' },
        { status: 500 }
      );
    }

    // Update statistics
    await supabase.rpc('increment_counter', {
      table_name: 'referral_statistics',
      user_id: user.id,
      column_name: 'total_referrals_sent',
    });

    // Log audit
    await supabase.rpc('log_audit', {
      p_user_id: user.id,
      p_action: 'referral_created',
      p_resource_type: 'referral',
      p_resource_id: referral.id,
      p_metadata: {
        referred_email: normalizedEmail,
        product_type: productType,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;
    const referralLink = `${baseUrl}/signup?ref=${referralCode}`;

    return NextResponse.json({
      success: true,
      referral: {
        id: referral.id,
        referralCode,
        referralLink,
        referredEmail: normalizedEmail,
        status: referral.status,
      },
    });
  } catch (error) {
    console.error('Referral creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}