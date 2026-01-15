// =====================================================
// SIGNUP API ROUTE
// Creates user account + organization in one transaction
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeInput, sanitizeEmail } from '@/lib/sanitize-simple';
import { authRateLimiter } from '@/lib/rateLimit';

// Create admin client (bypasses RLS for organization creation)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: NextRequest) {
  console.log('🔵 Signup API: Request received');

  // Apply rate limiting based on IP address
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('x-real-ip') ||
                   'unknown';

  try {
    // Check rate limit (10 attempts per 15 minutes)
    await authRateLimiter.check(clientIp);
  } catch (rateLimitError: any) {
    console.warn(`🔴 Signup rate limit exceeded for IP: ${clientIp}`);
    return NextResponse.json(
      { error: rateLimitError.message },
      {
        status: 429,
        headers: {
          'Retry-After': '900', // 15 minutes in seconds
        }
      }
    );
  }

  try {
    const body = await req.json();
    console.log('🔵 Signup API: Request body received:', JSON.stringify(body, null, 2));
    console.log('🔵 Signup API: Request body parsed', {
      email: body.email,
      fullName: body.fullName,
      hasOrgName: !!body.organizationName,
      hasInviteToken: !!body.inviteToken,
      hasReferralCode: !!body.referralCode
    });
    const { email, password, fullName, organizationName, inviteToken, referralCode } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs with error handling
    let cleanEmail: string;
    try {
      cleanEmail = sanitizeEmail(email);
    } catch (emailError: any) {
      console.log('🔴 Signup API: Email validation failed:', emailError.message);
      return NextResponse.json(
        { error: emailError.message || 'Invalid email format' },
        { status: 400 }
      );
    }

    const cleanFullName = sanitizeInput(fullName);

    // Validate that fullName is not empty after sanitization
    if (!cleanFullName || cleanFullName.length < 2) {
      return NextResponse.json(
        { error: 'Please enter a valid full name (at least 2 characters)' },
        { status: 400 }
      );
    }

    const cleanOrgName = organizationName
      ? sanitizeInput(organizationName)
      : `${cleanFullName}'s Organization`;

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Step 1: Create user with Supabase Auth
    console.log('🔵 Signup API: Creating user in Supabase Auth');
    console.log('🔵 Signup API: User data:', {
      email: cleanEmail,
      fullName: cleanFullName,
      hasPassword: !!password,
      passwordLength: password?.length
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true, // true = email is confirmed, false = needs confirmation
      user_metadata: {
        full_name: cleanFullName,
      },
    });

    if (authError) {
      console.error('🔴 Signup API: Auth error details:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        name: authError.name,
        fullError: JSON.stringify(authError, null, 2)
      });

      // Check for specific error types
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in or use a different email.' },
          { status: 400 }
        );
      }

      if (authError.message?.includes('password')) {
        return NextResponse.json(
          { error: 'Password issue: ' + authError.message },
          { status: 400 }
        );
      }

      // Generic database error
      if (authError.message?.includes('Database')) {
        return NextResponse.json(
          { error: 'Database error creating new user' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: authError.message || 'Failed to create user account' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'User creation failed' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;
    console.log('✅ Signup API: User created', { userId });

    // Track referral if referral code is provided
    let referralId: string | null = null;
    if (referralCode) {
      console.log('🔵 Signup API: Processing referral code', { referralCode });

      // Find referral by code
      const { data: referral, error: referralError } = await supabaseAdmin
        .from('referrals')
        .select('id, referrer_id')
        .eq('referral_code', referralCode)
        .single();

      if (!referralError && referral) {
        // Create or update referral record for this specific email
        const { data: updatedReferral, error: updateError } = await supabaseAdmin
          .from('referrals')
          .upsert({
            referrer_id: referral.referrer_id,
            referral_code: referralCode,
            referred_email: cleanEmail,
            referred_user_id: userId,
            status: 'signed_up',
            signup_at: new Date().toISOString(),
            product_type: 'loadvoice',
          }, {
            onConflict: 'referred_email,product_type'
          })
          .select()
          .single();

        if (!updateError && updatedReferral) {
          referralId = updatedReferral.id;
          console.log('✅ Signup API: Referral tracked', { referralId });

          // Track signup in statistics
          try {
            await supabaseAdmin.rpc('increment_counter', {
              table_name: 'referral_statistics',
              user_id: referral.referrer_id,
              column_name: 'total_signups',
            });
          } catch (err: any) {
            console.warn('Failed to update referral statistics:', err);
          }
        } else {
          console.warn('⚠️ Signup API: Failed to track referral', { updateError });
        }
      } else {
        console.warn('⚠️ Signup API: Invalid referral code', { referralCode });
      }
    }

    // Check if this is an invited signup
    let orgData = null;
    let membershipRole = 'owner';
    let isInvitedSignup = false;

    if (inviteToken) {
      console.log('🔵 Signup API: Checking invitation token', { inviteToken });

      // Verify the invitation exists and is valid
      console.log('🔍 Checking team_invitations table for token:', inviteToken);
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from('team_invitations')
        .select('*, organizations(*)')
        .eq('token', inviteToken)
        .eq('email', cleanEmail)
        .is('accepted_at', null)  // Check if not accepted (pending)
        .single();

      if (!inviteError && invite && invite.organizations) {
        console.log('✅ Signup API: Valid invitation found', {
          inviteId: invite.id,
          orgId: invite.organization_id,
          orgName: invite.organizations?.name,
          role: invite.role
        });

        isInvitedSignup = true;
        orgData = invite.organizations;
        membershipRole = invite.role || 'member';

        // Mark invitation as accepted
        console.log('📝 Marking invitation as accepted');
        const { error: updateError } = await supabaseAdmin
          .from('team_invitations')
          .update({
            accepted_at: new Date().toISOString(),
            accepted_by: userId
          })
          .eq('id', invite.id);

        if (updateError) {
          console.error('❌ Error updating invitation:', updateError);
        }
      } else {
        console.warn('⚠️ Signup API: Invalid invitation token', {
          inviteError,
          token: inviteToken,
          email: cleanEmail
        });

        // If a token was provided but it's invalid, return an error
        if (inviteToken) {
          return NextResponse.json(
            {
              error: 'Invalid or expired invitation. Please request a new invitation from your team administrator.',
              debugInfo: process.env.NODE_ENV === 'development' ? {
                message: inviteError?.message,
                code: inviteError?.code
              } : undefined
            },
            { status: 400 }
          );
        }
        // Otherwise continue with normal signup (no invitation)
      }
    }

    // Step 2: Create organization (only if not invited)
    if (!isInvitedSignup) {
      const orgSlug = `org-${userId.substring(0, 8)}`;
      console.log('🔵 Signup API: Creating organization', {
        orgName: cleanOrgName,
        orgSlug,
        userId,
        billingEmail: cleanEmail
      });

      // Verify admin client is configured correctly
      console.log('🔵 Signup API: Admin client config check', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)
      });

      // Build organization data with referral info if applicable
      const orgInsertData: any = {
        name: cleanOrgName,
        slug: orgSlug,
        plan_type: 'free',
        max_members: 1,
        max_minutes_monthly: 60, // Free tier gets 60 minutes
        billing_email: cleanEmail,
        subscription_status: 'active'
      };

      // Add referral tracking to organization if referred
      if (referralId && referralCode) {
        // Get referrer info
        const { data: referralInfo } = await supabaseAdmin
          .from('referrals')
          .select('referrer_id')
          .eq('id', referralId)
          .single();

        if (referralInfo) {
          orgInsertData.referred_by = referralInfo.referrer_id;
          orgInsertData.referral_code_used = referralCode;
          // Referred users get standard free tier (30 minutes), only referrers get rewards
          // No bonus minutes for referred users
        }
      }

      const { data: newOrgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert(orgInsertData)
        .select()
        .single();

      if (orgError) {
        console.error('🔴 Signup API: Organization creation error:', {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code,
          fullError: JSON.stringify(orgError, null, 2)
        });

        // Rollback: Delete the user if org creation fails
        console.log('🔵 Signup API: Rolling back - deleting user');
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
          console.error('🔴 Signup API: Failed to delete user during rollback:', deleteError);
        }

        return NextResponse.json(
          {
            error: 'Failed to create organization. Please try again.',
            debugInfo: process.env.NODE_ENV === 'development' ? {
              message: orgError.message,
              code: orgError.code,
              details: orgError.details,
              hint: orgError.hint
            } : undefined
          },
          { status: 500 }
        );
      }

      orgData = newOrgData;
    }

    console.log('✅ Signup API: Organization ready', {
      orgId: orgData.id,
      isInvited: isInvitedSignup,
      role: membershipRole
    });

    // Step 3: Link user to organization with appropriate role
    console.log('🔵 Signup API: Creating membership', {
      userId,
      orgId: orgData.id,
      role: membershipRole,
      isInvited: isInvitedSignup
    });

    // Build membership object
    const membershipData: any = {
      user_id: userId,
      organization_id: orgData.id,
      role: membershipRole,
    };

    // If this is an invited signup, add the invited_by field
    if (isInvitedSignup && inviteToken) {
      // Get the invitation details to find who invited them
      const { data: inviteData } = await supabaseAdmin
        .from('team_invitations')
        .select('invited_by')
        .eq('token', inviteToken)
        .single();

      if (inviteData?.invited_by) {
        membershipData.invited_by = inviteData.invited_by;
      }
    }

    const { error: membershipError } = await supabaseAdmin
      .from('user_organizations')
      .insert(membershipData);

    if (membershipError) {
      console.error('🔴 Signup API: Membership creation error:', {
        message: membershipError.message,
        details: membershipError.details,
        hint: membershipError.hint,
        code: membershipError.code,
        fullError: JSON.stringify(membershipError, null, 2)
      });

      // Rollback: Delete user and org (only if we created it)
      console.log('🔵 Signup API: Rolling back - deleting user');
      if (!isInvitedSignup) {
        // Only delete the org if we created it
        console.log('🔵 Signup API: Deleting created organization');
        await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      }
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          error: 'Failed to set up organization membership. Please try again.',
          debugInfo: process.env.NODE_ENV === 'development' ? {
            message: membershipError.message,
            code: membershipError.code,
            details: membershipError.details,
            hint: membershipError.hint
          } : undefined
        },
        { status: 500 }
      );
    }

    // Step 4: Log the signup (optional - only if audit_logs table exists)
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_user_id: userId,
        p_action: 'user_signed_up',
        p_resource_type: 'user',
        p_resource_id: userId,
        p_metadata: {
          organization_id: orgData.id,
          organization_name: cleanOrgName,
          plan: 'free',
        },
      });
    } catch (auditError) {
      // Don't fail signup if audit logging fails
      console.warn('Audit logging failed:', auditError);
    }

    console.log('✅ Signup API: Membership created');
    console.log('✅ Signup API: Signup complete!');

    // Success!
    return NextResponse.json({
      success: true,
      message: 'Account created successfully! You can now sign in.',
      user: {
        id: userId,
        email: cleanEmail,
        fullName: cleanFullName,
      },
      organization: {
        id: orgData.id,
        name: cleanOrgName,
        plan: 'free',
      },
    });
  } catch (error: any) {
    console.error('🔴 Signup API: Unexpected error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });
    return NextResponse.json(
      {
        error: error.message || 'An unexpected error occurred',
        debugInfo: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : undefined
      },
      { status: 500 }
    );
  }
}
