// =====================================================
// CLEAR AUTH SESSION ROUTE
// Clears invalid auth sessions and cookies
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Clear the session
    await supabase.auth.signOut();

    // Clear all Supabase cookies
    const allCookies = cookieStore.getAll();
    const response = NextResponse.redirect(new URL('/login?message=Session%20cleared', request.url));

    // Clear any auth-related cookies
    allCookies.forEach(cookie => {
      if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
        response.cookies.set(cookie.name, '', {
          maxAge: 0,
          path: '/',
        });
      }
    });

    return response;
  } catch (error) {
    console.error('Error clearing session:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}