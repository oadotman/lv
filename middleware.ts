import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllowedOrigins, getBaseUrlOrFallback } from './lib/utils/urls'
import { partnerAuthMiddleware } from './middleware/partner-auth'

export async function middleware(req: NextRequest) {
  console.log('Middleware: Processing request for', req.nextUrl.pathname)

  // =====================================================
  // SEARCH BOT DETECTION
  // Skip all cookie operations for search engine bots
  // =====================================================
  const userAgent = req.headers.get('user-agent') || '';
  const isSearchBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|applebot/i.test(userAgent);

  // For search bots, return a clean response without any cookie operations
  if (isSearchBot) {
    console.log('Middleware: Search bot detected, skipping cookie operations', userAgent);
    return NextResponse.next();
  }

  // =====================================================
  // ADMIN ROUTES PROTECTION
  // Protect all admin routes - check before partner routes
  // =====================================================
  const pathname = req.nextUrl.pathname;

  // =====================================================
  // PARTNER ROUTES HANDLING
  // Handle partner-specific authentication and tracking
  // =====================================================
  if (pathname.startsWith('/partners') || pathname.startsWith('/api/partners')) {
    // Check for partner referral tracking
    const ref = req.nextUrl.searchParams.get('ref');
    if (ref && pathname === '/partners') {
      // Track the partner click (search bots already filtered out above)
      try {
        const { PartnerTracking } = await import('./lib/partners/tracking');
        await PartnerTracking.trackClick(ref, req);
      } catch (error) {
        console.error('Failed to track partner click:', error);
      }
    }

    // Apply partner authentication middleware
    const partnerResponse = await partnerAuthMiddleware(req);
    if (partnerResponse.status !== 200 || partnerResponse.headers.get('Location')) {
      return partnerResponse;
    }
  }

  // =====================================================
  // CSRF PROTECTION
  // Verify origin for state-changing requests
  // =====================================================
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    const referer = req.headers.get('referer');
    const internalProcessingHeader = req.headers.get('x-internal-processing');

    // Webhook endpoints, cron jobs, internal processing, and public endpoints are exempt from CSRF checks
    const webhookPaths = ['/api/webhooks/', '/api/paddle/webhook'];
    const cronPaths = ['/api/cron/'];
    const internalProcessingPaths = ['/process'];
    const publicApiPaths = ['/api/partners/apply']; // Public partner application endpoint

    const isWebhook = webhookPaths.some(path => req.nextUrl.pathname.startsWith(path));
    const isCron = cronPaths.some(path => req.nextUrl.pathname.startsWith(path));
    const isInternalProcessing = internalProcessingPaths.some(path => req.nextUrl.pathname.includes(path)) || internalProcessingHeader === 'true';
    const isPublicApi = publicApiPaths.some(path => req.nextUrl.pathname === path);

    if (!isWebhook && !isCron && !isInternalProcessing && !isPublicApi) {
      // Get allowed origins - must be exact matches
      const allowedOrigins = getAllowedOrigins();
      const appUrl = new URL(getBaseUrlOrFallback());

      // Check if request comes from allowed origin
      let isValidOrigin = false;

      if (origin) {
        // Strict exact match - no startsWith
        isValidOrigin = allowedOrigins.includes(origin);
      } else if (referer) {
        // Parse referer and check origin
        try {
          const refererUrl = new URL(referer);
          isValidOrigin = allowedOrigins.includes(refererUrl.origin);
        } catch {
          isValidOrigin = false;
        }
      } else {
        // No origin or referer header - reject for API routes
        if (req.nextUrl.pathname.startsWith('/api/')) {
          isValidOrigin = false;
        } else {
          // For page requests (form submissions), allow if host matches
          const expectedHost = appUrl.host;
          isValidOrigin = host === expectedHost;
        }
      }

      if (!isValidOrigin) {
        console.error(`🚨 CSRF: Blocked request from origin: ${origin}, referer: ${referer}, host: ${host}`);
        console.error(`🚨 CSRF: Allowed origins: ${allowedOrigins.join(', ')}`);

        return NextResponse.json(
          { error: 'Forbidden - Invalid origin' },
          { status: 403 }
        );
      }
    }
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Add security headers
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-XSS-Protection', '1; mode=block');

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  let session = null;
  let user = null;

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      // If refresh token error, try to clear the invalid session
      if (error.message?.includes('Refresh Token') || error.code === 'refresh_token_not_found') {
        console.log('Middleware: Invalid refresh token detected, clearing session');
        // Don't log the full error to avoid cluttering logs
        await supabase.auth.signOut();
      } else {
        console.error('Middleware: Error getting session:', error);
      }
    } else {
      session = data?.session;
      user = session?.user || null;
    }
  } catch (err) {
    console.error('Middleware: Unexpected error getting session:', err);
  }

  console.log('Middleware: Session check', {
    pathname: req.nextUrl.pathname,
    hasSession: !!session,
    hasUser: !!user
  })

  // =====================================================
  // ADMIN ROUTES ACCESS CHECK
  // Check admin access for ALL /admin routes
  // =====================================================
  if (pathname.startsWith('/admin')) {
    // Admin routes need authentication first
    if (!user) {
      console.log('Middleware: No user for admin route, redirecting to login');
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user has admin/owner role
    try {
      const { data: userOrg, error: userOrgError } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', user.id)
        .single();

      console.log('Middleware: Admin check for path', pathname, {
        userId: user.id,
        userOrg,
        userOrgError,
        role: userOrg?.role
      });

      if (userOrgError || !userOrg) {
        console.error('Middleware: Failed to fetch user org:', userOrgError);
        const errorUrl = new URL('/dashboard', req.url);
        errorUrl.searchParams.set('error', 'admin_check_failed');
        return NextResponse.redirect(errorUrl);
      }

      const isAdmin = userOrg.role === 'owner' || userOrg.role === 'admin';

      if (!isAdmin) {
        console.log('Middleware: User is not admin, role:', userOrg.role);
        // Redirect to a custom error page or dashboard with error message
        const errorUrl = new URL('/dashboard', req.url);
        errorUrl.searchParams.set('error', 'admin_access_denied');
        return NextResponse.redirect(errorUrl);
      }
    } catch (error) {
      console.error('Middleware: Error checking admin role:', error);
      // On error, redirect to dashboard with error
      const errorUrl = new URL('/dashboard', req.url);
      errorUrl.searchParams.set('error', 'admin_check_failed');
      return NextResponse.redirect(errorUrl);
    }
  }

  // Include invite paths as public since they handle their own auth flow
  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/', '/api/auth/signup', '/api/health', '/invite/', '/invite-signup/']
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path))

  // Check if user is authenticated (either via session or user)
  const isAuthenticated = !!(session || user)

  // If user is signed in and on root path, redirect to dashboard
  if (isAuthenticated && req.nextUrl.pathname === '/') {
    console.log('Middleware: User authenticated on root path, redirecting to /dashboard')
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // If user is not signed in and trying to access protected route, redirect to login
  if (!isAuthenticated && !isPublicPath) {
    console.log('Middleware: No authentication on protected route, redirecting to /login')
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in and trying to access auth pages, redirect to dashboard
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].some(path => req.nextUrl.pathname.startsWith(path))
  if (isAuthenticated && isAuthPage) {
    console.log('Middleware: User authenticated on auth page, redirecting to /dashboard')
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  console.log('Middleware: Allowing request through')
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
