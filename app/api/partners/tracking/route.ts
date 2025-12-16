// =====================================================
// PARTNER TRACKING API
// Handles partner link clicks and referral tracking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { PartnerTracking } from '@/lib/partners/tracking';
import type { PartnerTrackingResponse } from '@/lib/partners/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Track partner link click
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const ref = searchParams.get('ref');
    const redirect = searchParams.get('redirect') || '/';

    if (!ref) {
      // No partner reference, just redirect
      return NextResponse.redirect(new URL(redirect, req.url));
    }

    // Track the click
    const result = await PartnerTracking.trackClick(ref, req);

    if (!result.success) {
      // Invalid partner reference, redirect without tracking
      console.warn(`Invalid partner reference: ${ref}`);
      return NextResponse.redirect(new URL(redirect, req.url));
    }

    // Redirect to the target page with partner cookie set
    const response = NextResponse.redirect(new URL(redirect, req.url));

    // The cookie is set by trackClick, but we can add additional headers if needed
    response.headers.set('X-Partner-Tracked', 'true');

    return response;
  } catch (error) {
    console.error('Partner tracking error:', error);
    // On error, still redirect but without tracking
    const redirect = req.nextUrl.searchParams.get('redirect') || '/';
    return NextResponse.redirect(new URL(redirect, req.url));
  }
}

// Track partner events (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, partner_ref, user_id, metadata } = body;

    if (!event_type) {
      return NextResponse.json(
        {
          success: false,
          tracked: false,
          cookie_set: false,
          message: 'Event type is required',
        } as PartnerTrackingResponse,
        { status: 400 }
      );
    }

    let result: PartnerTrackingResponse = {
      success: false,
      tracked: false,
      cookie_set: false,
    };

    switch (event_type) {
      case 'click':
        if (!partner_ref) {
          return NextResponse.json(
            {
              success: false,
              tracked: false,
              cookie_set: false,
              message: 'Partner reference is required for click events',
            } as PartnerTrackingResponse,
            { status: 400 }
          );
        }

        const trackResult = await PartnerTracking.trackClick(partner_ref, req);
        result = {
          success: trackResult.success,
          tracked: trackResult.success,
          cookie_set: trackResult.success,
          message: trackResult.message,
        };
        break;

      case 'signup':
        if (!user_id || !metadata?.email) {
          return NextResponse.json(
            {
              success: false,
              tracked: false,
              cookie_set: false,
              message: 'User ID and email are required for signup events',
            } as PartnerTrackingResponse,
            { status: 400 }
          );
        }

        const signupResult = await PartnerTracking.trackSignup(user_id, metadata.email);
        result = {
          success: signupResult.success,
          tracked: signupResult.success,
          cookie_set: false,
          message: signupResult.success ? 'Signup tracked' : 'No partner referral found',
        };
        break;

      case 'trial_start':
        if (!user_id) {
          return NextResponse.json(
            {
              success: false,
              tracked: false,
              cookie_set: false,
              message: 'User ID is required for trial events',
            } as PartnerTrackingResponse,
            { status: 400 }
          );
        }

        const trialResult = await PartnerTracking.trackTrialStart(
          user_id,
          metadata?.subscription_id
        );
        result = {
          success: trialResult.success,
          tracked: trialResult.success,
          cookie_set: false,
          message: trialResult.success ? 'Trial tracked' : 'No partner referral found',
        };
        break;

      case 'conversion':
        if (!user_id || !metadata?.subscription_id) {
          return NextResponse.json(
            {
              success: false,
              tracked: false,
              cookie_set: false,
              message: 'User ID and subscription details are required for conversion events',
            } as PartnerTrackingResponse,
            { status: 400 }
          );
        }

        const conversionResult = await PartnerTracking.trackConversion(
          user_id,
          metadata.subscription_id,
          metadata.plan_name || 'Unknown',
          metadata.monthly_value || 0
        );
        result = {
          success: conversionResult.success,
          tracked: conversionResult.success,
          cookie_set: false,
          message: conversionResult.success ? 'Conversion tracked' : 'No partner referral found',
        };
        break;

      case 'churn':
        if (!user_id) {
          return NextResponse.json(
            {
              success: false,
              tracked: false,
              cookie_set: false,
              message: 'User ID is required for churn events',
            } as PartnerTrackingResponse,
            { status: 400 }
          );
        }

        const churnResult = await PartnerTracking.trackChurn(user_id);
        result = {
          success: churnResult.success,
          tracked: churnResult.success,
          cookie_set: false,
          message: churnResult.success ? 'Churn tracked' : 'No partner referral found',
        };
        break;

      case 'apply_coupon':
        if (!metadata?.code) {
          return NextResponse.json(
            {
              success: false,
              tracked: false,
              cookie_set: false,
              message: 'Coupon code is required',
            } as PartnerTrackingResponse,
            { status: 400 }
          );
        }

        const couponResult = await PartnerTracking.applyCouponCode(metadata.code);
        result = {
          success: couponResult.success,
          tracked: couponResult.success,
          cookie_set: couponResult.success,
          message: couponResult.message || 'Coupon applied',
        };
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            tracked: false,
            cookie_set: false,
            message: `Unknown event type: ${event_type}`,
          } as PartnerTrackingResponse,
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Partner tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        tracked: false,
        cookie_set: false,
        message: 'Internal server error',
      } as PartnerTrackingResponse,
      { status: 500 }
    );
  }
}