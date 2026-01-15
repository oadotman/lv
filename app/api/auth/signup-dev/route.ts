// =====================================================
// DEVELOPMENT SIGNUP ROUTE (Mock for testing)
// Uses local storage/cookies instead of Supabase Auth
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Mock user store (in production, this would be Supabase)
const mockUsers = new Map();

export async function POST(req: NextRequest) {
  console.log('🟡 DEV Signup: Using mock signup for development');

  try {
    const body = await req.json();
    const { email, password, fullName, organizationName } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    // Simple email validation
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Generate mock user ID
    const userId = 'dev-' + crypto.randomBytes(16).toString('hex');
    const orgId = 'org-' + crypto.randomBytes(8).toString('hex');

    // Create mock user object
    const mockUser = {
      id: userId,
      email: email,
      fullName: fullName,
      organizationName: organizationName || `${fullName}'s Organization`,
      organizationId: orgId,
      createdAt: new Date().toISOString(),
    };

    // Store in memory (would be database in production)
    mockUsers.set(email, mockUser);

    // Create a mock session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Set cookie for auth (mock session)
    const cookieStore = cookies();
    cookieStore.set('dev-auth-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    // Store session data
    cookieStore.set('dev-user-data', JSON.stringify({
      userId: userId,
      email: email,
      fullName: fullName,
      organizationId: orgId
    }), {
      httpOnly: false, // Allow client to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    console.log('✅ DEV Signup: Mock user created', { userId, email });

    return NextResponse.json({
      success: true,
      message: 'Development account created successfully!',
      user: {
        id: userId,
        email: email,
        fullName: fullName,
      },
      organization: {
        id: orgId,
        name: organizationName || `${fullName}'s Organization`,
        plan: 'free',
      },
      dev_mode: true
    });

  } catch (error: any) {
    console.error('🔴 DEV Signup Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'An unexpected error occurred',
        dev_mode: true
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if dev mode is active
export async function GET(req: NextRequest) {
  return NextResponse.json({
    dev_mode: true,
    message: 'Development signup endpoint is active. Supabase Auth is bypassed for testing.',
    warning: 'This should only be used in development!'
  });
}