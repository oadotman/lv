// =====================================================
// PARTNER AUTHENTICATION MIDDLEWARE
// Protects partner routes and manages partner sessions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { PartnerAuthEdge } from '@/lib/partners/auth-edge';

export async function partnerAuthMiddleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Define public partner routes (no auth required)
  const publicPartnerRoutes = [
    '/partners',
    '/partners/apply',
    '/partners/login',
    '/api/partners/apply',
    '/api/partners/auth/login',
    '/api/partners/tracking',
  ];

  // Define protected partner routes (auth required)
  const protectedPartnerRoutes = [
    '/partners/dashboard',
    '/api/partners/dashboard',
    '/api/partners/referrals',
    '/api/partners/earnings',
    '/api/partners/payouts',
    '/api/partners/auth/logout',
  ];

  // Check if it's a partner route
  const isPartnerRoute = pathname.startsWith('/partners') || pathname.startsWith('/api/partners');

  if (!isPartnerRoute) {
    return NextResponse.next();
  }

  // Check if it's a public route
  const isPublicRoute = publicPartnerRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    // Track partner referral if ref parameter exists
    const ref = req.nextUrl.searchParams.get('ref');
    if (ref && pathname === '/partners') {
      const { PartnerTrackingEdge } = await import('@/lib/partners/tracking-edge');
      return await PartnerTrackingEdge.trackClick(ref, req);
    }

    return NextResponse.next();
  }

  // Check if it's a protected route
  const isProtectedRoute = protectedPartnerRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    try {
      // Check if partner is authenticated
      const isAuthenticated = await PartnerAuthEdge.isAuthenticated();

      if (!isAuthenticated) {
        // Redirect to login for web pages
        if (!pathname.startsWith('/api')) {
          const loginUrl = new URL('/partners/login', req.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }

        // Return 401 for API routes
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Partner is authenticated, continue
      return NextResponse.next();
    } catch (error) {
      console.error('Partner auth middleware error:', error);

      // Return error response
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Authentication error' },
          { status: 500 }
        );
      }

      // Redirect to login for web pages
      const loginUrl = new URL('/partners/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Default: allow the request
  return NextResponse.next();
}

// Export middleware config
export const partnerMiddlewareConfig = {
  matcher: [
    '/partners/:path*',
    '/api/partners/:path*',
  ],
};