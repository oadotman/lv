// =====================================================
// TEAM MEMBERS API ROUTE
// Fetches team members with user details
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify user has access to this organization
    const { data: userMembership } = await supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all members of the organization
    const { data: members, error: membersError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('organization_id', organizationId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Fetch user details for each member
    const membersWithDetails = await Promise.all(
      (members || []).map(async (member) => {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          member.user_id
        );

        if (userError) {
          console.error(`Error fetching user ${member.user_id}:`, userError);
          return {
            ...member,
            user: {
              email: 'Unknown',
              user_metadata: {}
            }
          };
        }

        return {
          ...member,
          user: {
            email: userData.user?.email || 'Unknown',
            user_metadata: userData.user?.user_metadata || {}
          }
        };
      })
    );

    return NextResponse.json({ members: membersWithDetails });

  } catch (error: any) {
    console.error('Error in members API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
