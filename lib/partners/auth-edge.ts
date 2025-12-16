// =====================================================
// PARTNER AUTHENTICATION - EDGE RUNTIME COMPATIBLE
// Lightweight version for middleware use
// =====================================================

import { cookies } from 'next/headers';

export class PartnerAuthEdge {
  /**
   * Check if a partner is authenticated (Edge Runtime compatible)
   * Simply checks for the presence of a partner session cookie
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const cookieStore = cookies();
      const partnerToken = cookieStore.get('partner_token');

      // Basic check - just verify cookie exists
      // Detailed validation happens in the API routes
      return !!partnerToken?.value;
    } catch (error) {
      console.error('Partner auth check error:', error);
      return false;
    }
  }
}