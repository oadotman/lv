// =====================================================
// PARTNER LOGIN API
// Handles partner authentication
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { PartnerAuth } from '@/lib/partners/auth';
import type { PartnerLoginResponse } from '@/lib/partners/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, remember_me } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required',
        } as PartnerLoginResponse,
        { status: 400 }
      );
    }

    // Attempt login
    const result = await PartnerAuth.login(email, password, req);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || 'Login failed',
        } as PartnerLoginResponse,
        { status: 401 }
      );
    }

    // Log successful login
    const supabase = createServerClient();
    await supabase.rpc('log_partner_activity', {
      p_partner_id: result.partner!.id,
      p_activity_type: 'login',
      p_metadata: {
        ip: req.headers.get('x-forwarded-for') || req.ip,
        user_agent: req.headers.get('user-agent'),
        remember_me,
      },
    });

    return NextResponse.json({
      success: true,
      partner: {
        id: result.partner!.id,
        email: result.partner!.email,
        full_name: result.partner!.full_name,
        company_name: result.partner!.company_name,
        tier: result.partner!.tier,
        referral_code: result.partner!.referral_code,
      },
      message: 'Login successful',
    } as PartnerLoginResponse);
  } catch (error) {
    console.error('Partner login error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      } as PartnerLoginResponse,
      { status: 500 }
    );
  }
}