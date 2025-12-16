// =====================================================
// PARTNER AUTHENTICATION SYSTEM
// Handles partner login, session management, and verification
// =====================================================

import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import type { Partner, PartnerSession } from './types';

const PARTNER_SESSION_COOKIE = 'partner_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export class PartnerAuth {
  /**
   * Generate a secure session token
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash password for storage (placeholder - will use Supabase auth in production)
   */
  static async hashPassword(password: string): Promise<string> {
    // In production, this will be handled by Supabase Auth
    // For now, using a simple hash for demonstration
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify password (placeholder - will use Supabase auth in production)
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const inputHash = await this.hashPassword(password);
    return inputHash === hash;
  }

  /**
   * Create a partner session
   */
  static async createSession(partnerId: string, req?: NextRequest): Promise<PartnerSession> {
    const supabase = createServerClient();
    const token = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    // Store session in database
    const session: PartnerSession = {
      id: crypto.randomUUID(),
      partner_id: partnerId,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      ip_address: req?.headers.get('x-forwarded-for') || req?.ip,
      user_agent: req?.headers.get('user-agent') || undefined,
    };

    // Note: In production, this will be stored in the partners_sessions table
    // For now, we'll store it in a temporary way
    const { error } = await supabase
      .from('partners_sessions')
      .insert(session);

    if (error) {
      console.error('Error creating partner session:', error);
      throw new Error('Failed to create session');
    }

    // Set session cookie
    const cookieStore = cookies();
    cookieStore.set(PARTNER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return session;
  }

  /**
   * Get current partner session
   */
  static async getCurrentSession(): Promise<PartnerSession | null> {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(PARTNER_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return null;
    }

    const supabase = createServerClient();

    // Get session from database
    const { data: session, error } = await supabase
      .from('partners_sessions')
      .select('*')
      .eq('token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      return null;
    }

    return session as PartnerSession;
  }

  /**
   * Get current partner
   */
  static async getCurrentPartner(): Promise<Partner | null> {
    const session = await this.getCurrentSession();

    if (!session) {
      return null;
    }

    const supabase = createServerClient();

    // Get partner from database
    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', session.partner_id)
      .eq('status', 'active')
      .single();

    if (error || !partner) {
      return null;
    }

    // Update last login
    await supabase
      .from('partners')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', partner.id);

    return partner as Partner;
  }

  /**
   * Login partner
   */
  static async login(email: string, password: string, req?: NextRequest): Promise<{ success: boolean; partner?: Partner; error?: string }> {
    const supabase = createServerClient();

    // Get partner by email
    const { data: partner, error: fetchError } = await supabase
      .from('partners')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !partner) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if partner is active
    if (partner.status !== 'active') {
      return { success: false, error: 'Your partner account is not active. Please contact support.' };
    }

    // Verify password (placeholder - will use Supabase auth)
    const passwordValid = await this.verifyPassword(password, partner.password_hash || '');

    if (!passwordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Create session
    await this.createSession(partner.id, req);

    return { success: true, partner: partner as Partner };
  }

  /**
   * Logout partner
   */
  static async logout(): Promise<void> {
    const session = await this.getCurrentSession();

    if (session) {
      const supabase = createServerClient();

      // Delete session from database
      await supabase
        .from('partners_sessions')
        .delete()
        .eq('token', session.token);
    }

    // Clear session cookie
    const cookieStore = cookies();
    cookieStore.delete(PARTNER_SESSION_COOKIE);
  }

  /**
   * Check if partner is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const partner = await this.getCurrentPartner();
    return !!partner;
  }

  /**
   * Require partner authentication (for use in API routes)
   */
  static async requireAuth(): Promise<Partner> {
    const partner = await this.getCurrentPartner();

    if (!partner) {
      throw new Error('Authentication required');
    }

    return partner;
  }

  /**
   * Generate temporary password for new partners
   */
  static generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Validate partner has required tier
   */
  static async requireTier(requiredTier: 'standard' | 'premium'): Promise<Partner> {
    const partner = await this.requireAuth();

    if (requiredTier === 'premium' && partner.tier !== 'premium') {
      throw new Error('Premium tier required');
    }

    return partner;
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const supabase = createServerClient();

    await supabase
      .from('partners_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }
}