/**
 * User Profile API
 * Returns current user information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile data
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        role,
        organizations!inner(
          id,
          name,
          subscription_plan
        )
      `)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: profile?.full_name || profile?.name || user.email?.split('@')[0],
        avatar: profile?.avatar_url,
        phone: profile?.phone,
        created_at: user.created_at
      },
      organization: userOrg ? {
        id: userOrg.organization_id,
        name: (userOrg as any).organizations?.[0]?.name || (userOrg as any).organizations?.name,
        role: userOrg.role,
        plan: (userOrg as any).organizations?.[0]?.subscription_plan || (userOrg as any).organizations?.subscription_plan
      } : null
    });

  } catch (error) {
    console.error('[User API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}