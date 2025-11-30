// =====================================================
// SUPABASE SERVER CLIENT
// For use in API routes and server components
// =====================================================

import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Creates a Supabase client for API routes
 * Handles cookie-based authentication
 */
export function createServerClient() {
  const cookieStore = cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors
            // This can happen in middleware or API routes
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie removal errors
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client for middleware
 * Different cookie handling for middleware context
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  return { supabase, response };
}

/**
 * Creates a Supabase admin client (bypasses RLS)
 * Use with caution - only for admin operations
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return undefined; },
        set() {},
        remove() {},
      },
    }
  );
}

/**
 * Gets the current authenticated user from session
 * Returns null if not authenticated
 */
export async function getAuthUser() {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Requires authentication for API routes
 * Returns user or throws 401 error
 */
export async function requireAuth() {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Gets session from cookies
 */
export async function getSession() {
  const supabase = createServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Alias for createServerClient (for consistency with team invitation API)
 */
export function createClient() {
  return createServerClient();
}

/**
 * Get user's organization
 */
export async function getUserOrganization(userId?: string) {
  const supabase = createServerClient();

  const targetUserId = userId || (await requireAuth()).id;

  const { data, error } = await supabase
    .from('user_organizations')
    .select('*, organization:organizations(*)')
    .eq('user_id', targetUserId)
    .single();

  if (error) {
    console.error('Error fetching user organization:', error);
    return null;
  }

  return {
    ...data,
    organization: data.organization as any,
  };
}

/**
 * Check if user has specific role in organization
 */
export async function hasRole(
  organizationId: string,
  requiredRoles: string[],
  userId?: string
): Promise<boolean> {
  const supabase = createServerClient();

  const targetUserId = userId || (await requireAuth()).id;

  const { data, error } = await supabase
    .from('user_organizations')
    .select('role')
    .eq('user_id', targetUserId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    return false;
  }

  return requiredRoles.includes(data.role);
}

/**
 * Require specific role in organization
 * Throws 403 if user doesn't have required role
 */
export async function requireRole(
  organizationId: string,
  requiredRoles: string[],
  userId?: string
) {
  const hasRequiredRole = await hasRole(organizationId, requiredRoles, userId);

  if (!hasRequiredRole) {
    throw new Error('Forbidden - Insufficient permissions');
  }

  return true;
}
