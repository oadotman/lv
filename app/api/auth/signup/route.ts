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
    console.log('🔵 Signup API: Request body parsed', { email: body.email, fullName: body.fullName, hasOrgName: !!body.organizationName });
    const { email, password, fullName, organizationName } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const cleanEmail = sanitizeEmail(email);
    const cleanFullName = sanitizeInput(fullName);
    const cleanOrgName = organizationName
      ? sanitizeInput(organizationName)
      : `${cleanFullName}'s Organization`;

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Step 1: Create user with Supabase Auth
    console.log('🔵 Signup API: Creating user in Supabase Auth');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true, // true = email is confirmed, false = needs confirmation
      user_metadata: {
        full_name: cleanFullName,
      },
    });

    if (authError) {
      console.error('🔴 Signup API: Auth error:', authError);
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

    // Step 2: Create organization
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

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: cleanOrgName,
        slug: orgSlug,
        plan_type: 'free',
        max_members: 1,
        max_minutes_monthly: 30,
        billing_email: cleanEmail,
        subscription_status: 'active'
      })
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

    console.log('✅ Signup API: Organization created', { orgId: orgData.id });

    // Step 3: Link user to organization as owner
    console.log('🔵 Signup API: Creating membership');
    const { error: membershipError } = await supabaseAdmin
      .from('user_organizations')
      .insert({
        user_id: userId,
        organization_id: orgData.id,
        role: 'owner',
      });

    if (membershipError) {
      console.error('🔴 Signup API: Membership creation error:', {
        message: membershipError.message,
        details: membershipError.details,
        hint: membershipError.hint,
        code: membershipError.code,
        fullError: JSON.stringify(membershipError, null, 2)
      });

      // Rollback: Delete org and user
      console.log('🔵 Signup API: Rolling back - deleting org and user');
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
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
