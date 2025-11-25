import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllowedOrigins, getBaseUrlOrFallback } from './lib/utils/urls'

export async function middleware(req: NextRequest) {
  console.log('Middleware: Processing request for', req.nextUrl.pathname)

  // =====================================================
  // CSRF PROTECTION
  // Verify origin for state-changing requests
  // =====================================================
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    const referer = req.headers.get('referer');

    // Webhook endpoints are exempt from CSRF checks (they use signature verification)
    const webhookPaths = ['/api/webhooks/', '/api/paddle/webhook', '/api/inngest'];
    const isWebhook = webhookPaths.some(path => req.nextUrl.pathname.startsWith(path));

    if (!isWebhook) {
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
  const { data: { session } } = await supabase.auth.getSession()

  console.log('Middleware: Session check', {
    pathname: req.nextUrl.pathname,
    hasSession: !!session,
    hasUser: !!session?.user
  })

  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/landing', '/api/auth/signup', '/api/health']
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path))

  // If user is not signed in and trying to access protected route, redirect to landing or login
  if (!session && !isPublicPath) {
    // Redirect to landing page for root path, login for others
    if (req.nextUrl.pathname === '/') {
      console.log('Middleware: No session on root path, redirecting to /landing')
      return NextResponse.redirect(new URL('/landing', req.url))
    }
    console.log('Middleware: No session, redirecting to /login')
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in and trying to access auth pages (except API routes), redirect to home
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].some(path => req.nextUrl.pathname.startsWith(path))
  if (session && isAuthPage) {
    console.log('Middleware: Session found on auth page, redirecting to /')
    return NextResponse.redirect(new URL('/', req.url))
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
