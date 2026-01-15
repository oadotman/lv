// =====================================================
// PARTNER REFERRAL TRACKING SYSTEM
// Handles cookie tracking, click tracking, and conversion attribution
// =====================================================

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PartnerCookie, PartnerClick, PartnerReferral } from './types';

const PARTNER_COOKIE_NAME = 'loadvoice_partner_ref';
const PARTNER_COOKIE_DURATION = 90 * 24 * 60 * 60 * 1000; // 90 days

export class PartnerTracking {
  /**
   * Set partner referral cookie
   */
  static setPartnerCookie(
    partnerRef: string,
    source?: string,
    campaign?: string,
    couponCode?: string
  ): void {
    const cookieStore = cookies();
    const expires = new Date(Date.now() + PARTNER_COOKIE_DURATION);

    const cookieData: PartnerCookie = {
      partner_ref: partnerRef,
      timestamp: new Date().toISOString(),
      expires: expires.toISOString(),
      source,
      campaign,
      coupon_code: couponCode,
    };

    cookieStore.set(PARTNER_COOKIE_NAME, JSON.stringify(cookieData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires,
    });
  }

  /**
   * Get partner referral cookie
   */
  static getPartnerCookie(): PartnerCookie | null {
    const cookieStore = cookies();
    const cookieValue = cookieStore.get(PARTNER_COOKIE_NAME)?.value;

    if (!cookieValue) {
      return null;
    }

    try {
      const cookie = JSON.parse(cookieValue) as PartnerCookie;

      // Check if cookie is expired
      if (new Date(cookie.expires) < new Date()) {
        return null;
      }

      return cookie;
    } catch {
      return null;
    }
  }

  /**
   * Track partner link click
   */
  static async trackClick(
    partnerRef: string,
    req: NextRequest
  ): Promise<{ success: boolean; message?: string }> {
    const supabase = await createClient();

    // Get partner by referral code
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, status')
      .eq('referral_code', partnerRef)
      .single();

    if (partnerError || !partner) {
      return { success: false, message: 'Invalid partner reference' };
    }

    // Only track clicks for active partners
    if (partner.status !== 'active') {
      return { success: false, message: 'Partner is not active' };
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get('source');
    const campaign = searchParams.get('campaign');
    const coupon = searchParams.get('coupon');

    // Track the click
    const click: Partial<PartnerClick> = {
      id: crypto.randomUUID(),
      partner_id: partner.id,
      referral_code: partnerRef,
      clicked_at: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || req.ip,
      user_agent: req.headers.get('user-agent') || undefined,
      referer: req.headers.get('referer') || undefined,
      landing_page: req.nextUrl.pathname,
      converted: false,
    };

    const { error: clickError } = await supabase
      .from('partner_clicks')
      .insert(click);

    if (clickError) {
      console.error('Error tracking partner click:', clickError);
      // Don't fail the request if tracking fails
    }

    // Set the partner cookie
    this.setPartnerCookie(partnerRef, source || undefined, campaign || undefined, coupon || undefined);

    // Update partner statistics (increment clicks)
    await supabase.rpc('increment_partner_clicks', {
      p_partner_id: partner.id,
    });

    return { success: true };
  }

  /**
   * Track signup conversion
   */
  static async trackSignup(
    userId: string,
    email: string
  ): Promise<{ success: boolean; referralId?: string }> {
    const cookie = this.getPartnerCookie();

    if (!cookie) {
      return { success: false };
    }

    const supabase = await createClient();

    // Get partner by referral code
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('referral_code', cookie.partner_ref)
      .single();

    if (partnerError || !partner) {
      return { success: false };
    }

    // Create partner referral record
    const referral: Partial<PartnerReferral> = {
      id: crypto.randomUUID(),
      partner_id: partner.id,
      customer_id: userId,
      customer_email: email,
      referral_code: cookie.partner_ref,
      status: 'signed_up',
      clicked_at: cookie.timestamp,
      signed_up_at: new Date().toISOString(),
      metadata: {
        source: cookie.source,
        campaign: cookie.campaign,
        coupon_code: cookie.coupon_code,
      },
    };

    const { data: createdReferral, error: referralError } = await supabase
      .from('partner_referrals')
      .insert(referral)
      .select()
      .single();

    if (referralError) {
      console.error('Error creating partner referral:', referralError);
      return { success: false };
    }

    // Update click record to mark as converted
    await supabase
      .from('partner_clicks')
      .update({
        converted: true,
        converted_at: new Date().toISOString(),
        customer_id: userId,
      })
      .eq('partner_id', partner.id)
      .eq('referral_code', cookie.partner_ref)
      .gte('clicked_at', new Date(Date.now() - PARTNER_COOKIE_DURATION).toISOString());

    // Update partner statistics
    await supabase.rpc('increment_partner_signups', {
      p_partner_id: partner.id,
    });

    // Clear the cookie after successful conversion
    cookies().delete(PARTNER_COOKIE_NAME);

    return { success: true, referralId: createdReferral.id };
  }

  /**
   * Track trial start
   */
  static async trackTrialStart(
    userId: string,
    subscriptionId?: string
  ): Promise<{ success: boolean }> {
    const supabase = await createClient();

    // Find the referral for this user
    const { data: referral, error: referralError } = await supabase
      .from('partner_referrals')
      .select('id, partner_id')
      .eq('customer_id', userId)
      .single();

    if (referralError || !referral) {
      return { success: false };
    }

    // Update referral status
    await supabase
      .from('partner_referrals')
      .update({
        status: 'trial',
        subscription_id: subscriptionId,
      })
      .eq('id', referral.id);

    // Update partner statistics
    await supabase.rpc('increment_partner_trials', {
      p_partner_id: referral.partner_id,
    });

    return { success: true };
  }

  /**
   * Track paid conversion
   */
  static async trackConversion(
    userId: string,
    subscriptionId: string,
    planName: string,
    monthlyValue: number
  ): Promise<{ success: boolean }> {
    const supabase = await createClient();

    // Find the referral for this user
    const { data: referral, error: referralError } = await supabase
      .from('partner_referrals')
      .select('id, partner_id')
      .eq('customer_id', userId)
      .single();

    if (referralError || !referral) {
      return { success: false };
    }

    // Update referral status
    await supabase
      .from('partner_referrals')
      .update({
        status: 'active',
        converted_at: new Date().toISOString(),
        subscription_id: subscriptionId,
        plan_name: planName,
        monthly_value: monthlyValue,
      })
      .eq('id', referral.id);

    // Update partner statistics
    await supabase.rpc('increment_partner_conversions', {
      p_partner_id: referral.partner_id,
      p_monthly_value: monthlyValue,
    });

    return { success: true };
  }

  /**
   * Track churn
   */
  static async trackChurn(
    userId: string
  ): Promise<{ success: boolean }> {
    const supabase = await createClient();

    // Find the referral for this user
    const { data: referral, error: referralError } = await supabase
      .from('partner_referrals')
      .select('id, partner_id')
      .eq('customer_id', userId)
      .single();

    if (referralError || !referral) {
      return { success: false };
    }

    // Update referral status
    await supabase
      .from('partner_referrals')
      .update({
        status: 'churned',
        churned_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    // Update partner statistics
    await supabase.rpc('increment_partner_churns', {
      p_partner_id: referral.partner_id,
    });

    return { success: true };
  }

  /**
   * Check if a user was referred by a partner
   */
  static async isPartnerReferred(userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data: referral } = await supabase
      .from('partner_referrals')
      .select('id')
      .eq('customer_id', userId)
      .single();

    return !!referral;
  }

  /**
   * Get partner for a referred user
   */
  static async getPartnerForUser(userId: string): Promise<string | null> {
    const supabase = await createClient();

    const { data: referral } = await supabase
      .from('partner_referrals')
      .select('partner_id')
      .eq('customer_id', userId)
      .single();

    return referral?.partner_id || null;
  }

  /**
   * Apply partner coupon code
   */
  static async applyCouponCode(code: string): Promise<{
    success: boolean;
    discount?: number;
    partnerId?: string;
    message?: string;
  }> {
    const supabase = await createClient();

    // Check if code is a partner coupon
    const { data: partner, error } = await supabase
      .from('partners')
      .select('id, status, referral_code')
      .or(`referral_code.eq.${code},coupon_code.eq.${code}`)
      .single();

    if (error || !partner) {
      return { success: false, message: 'Invalid coupon code' };
    }

    if (partner.status !== 'active') {
      return { success: false, message: 'This partner code is no longer active' };
    }

    // Set partner cookie with coupon code
    this.setPartnerCookie(partner.referral_code, 'coupon', undefined, code);

    // Return discount amount (20% for partner coupons)
    return {
      success: true,
      discount: 20,
      partnerId: partner.id,
      message: '20% discount applied for your first month!'
    };
  }
}