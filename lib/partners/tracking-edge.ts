// =====================================================
// PARTNER TRACKING - EDGE RUNTIME COMPATIBLE
// Lightweight version for middleware use
// =====================================================

import { NextRequest, NextResponse } from 'next/server';

export class PartnerTrackingEdge {
  /**
   * Track partner referral clicks (Edge Runtime compatible)
   * Sets a cookie to track the referral
   */
  static async trackClick(referralCode: string, req: NextRequest): Promise<NextResponse> {
    const response = NextResponse.next();

    // Set partner referral cookie
    response.cookies.set('partner_ref', referralCode, {
      maxAge: 60 * 60 * 24 * 90, // 90 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Note: Actual database tracking happens in API routes
    // This just sets the cookie for attribution

    return response;
  }
}