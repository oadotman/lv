'use client';

// =====================================================
// TEAM SETTINGS PAGE
// Manage organization members, invitations, and settings
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, Mail, Shield, Trash2, Copy, CheckCircle, Loader2, Users, Crown, ShieldCheck, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  max_members: number;
  max_minutes_monthly: number;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export default function TeamSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (user && mounted) {
      // Prevent multiple simultaneous fetches
      const fetchData = async () => {
        if (!cancelled) {
          await fetchTeamData();
        }
      };
      fetchData();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mounted]); // Only re-fetch when user ID changes

  async function fetchTeamData() {
    if (!user || fetchingData) return; // Prevent concurrent fetches

    setFetchingData(true);
    setLoading(true); // Ensure loading is set to true at start

    try {
      const supabase = createClient();

      // Get user's organization membership
      const { data: membership, error: membershipError } = await supabase
        .from('user_organizations')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if no rows

      if (membershipError) {
        console.error('Error fetching membership:', membershipError);
        // Don't show error toast - just silently handle
        setOrganization(null); // Explicitly set organization to null
        setLoading(false); // Ensure loading is set to false before return
        setFetchingData(false);
        return;
      }

      // Handle case where membership query returns null (no organization)
      if (!membership || !membership.organization_id) {
        console.log('No organization membership found for user');
        setOrganization(null); // Explicitly set organization to null
        setLoading(false); // Ensure loading is set to false before return
        setFetchingData(false);
        return;
      }

      // At this point we know membership exists with organization_id
      setUserRole(membership.role);

      // Fetch organization details separately
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', membership.organization_id)
        .maybeSingle();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setOrganization(null);
        setLoading(false);
        setFetchingData(false);
        return;
      }

      if (!org) {
        console.warn('Organization not found for membership');
        setOrganization(null);
        setLoading(false);
        setFetchingData(false);
        return;
      }

      setOrganization(org as Organization);

      // Get all team members
      const { data: teamMembers, error: membersError } = await supabase
        .from('user_organizations')
        .select('*')
        .eq('organization_id', membership.organization_id);

      if (membersError) {
        console.error('Error fetching team members:', membersError);
      } else if (teamMembers) {
        // Fetch user emails via API since we can't access auth.users directly from client
        const response = await fetch(`/api/teams/members?organizationId=${membership.organization_id}`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members || []);
        } else {
          // Fallback: show members without email details
          const membersWithPlaceholders = teamMembers.map(member => ({
            ...member,
            user: {
              email: 'Loading...',
              user_metadata: {}
            }
          }));
          setMembers(membersWithPlaceholders as TeamMember[]);
        }
      }

      // Get pending invitations (only if admin/owner)
      if (['owner', 'admin'].includes(membership.role)) {
        try {
          const response = await fetch(
            `/api/teams/invite?organizationId=${membership.organization_id}`
          );

          if (response.ok) {
            const data = await response.json();
            setInvitations(data.invitations || []);
          } else {
            console.error('Failed to fetch invitations:', response.status, response.statusText);
            setInvitations([]); // Set empty array on error to prevent issues
          }
        } catch (inviteError) {
          console.error('Error fetching invitations:', inviteError);
          setInvitations([]); // Set empty array on error
        }
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setFetchingData(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();

    if (!inviteEmail || !organization || inviting || fetchingData) return; // Prevent if already processing

    setInviting(true);

    try {
      const response = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId: organization.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      toast({
        title: 'Invitation sent! 📧',
        description: `An invitation email has been sent to ${inviteEmail}`,
      });

      setInviteEmail('');
      setInviteRole('member');

      // Wait a bit before refreshing to ensure the database is updated
      setTimeout(() => {
        if (!fetchingData) { // Only fetch if not already fetching
          fetchTeamData();
        }
      }, 500);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  }

  async function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);

    toast({
      title: 'Link copied! 📋',
      description: 'Invitation link copied to clipboard',
    });
  }

  async function revokeInvitation(invitationId: string, email: string) {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/invite?id=${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      toast({
        title: 'Invitation revoked',
        description: `Invitation for ${email} has been revoked`,
      });

      fetchTeamData(); // Refresh

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  async function removeMember(memberId: string, memberEmail: string) {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return;
    }

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('user_organizations')
        .delete()
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Member removed',
        description: `${memberEmail} has been removed from the team`,
      });

      fetchTeamData(); // Refresh

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
    }
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <ShieldCheck className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  }

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If no organization (shouldn't happen after signup, but handle gracefully)
  if (!organization) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Team Collaboration</h1>
          <p className="text-gray-600">Invite team members and work together on CRM automation</p>
        </div>

        {/* Upgrade Card */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 overflow-hidden relative">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl"></div>
          </div>

          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2 text-purple-900 text-2xl">
              <Crown className="w-6 h-6 text-purple-600" />
              Unlock Team Collaboration
            </CardTitle>
            <CardDescription className="text-purple-700 text-base">
              Add team members, assign roles, and collaborate on CRM automation with your sales team.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10">
            {/* Benefits Section */}
            <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-3">What you'll get with Team plans:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Add team members</strong> - Collaborate with sales reps, managers, and admins</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>More transcription minutes</strong> - Process 50-1,200x more calls per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Team invitations</strong> - Invite colleagues via email with role-based permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Shared templates</strong> - Create organization-wide CRM templates</span>
                </li>
              </ul>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-all hover:shadow-md">
                <p className="text-sm font-semibold text-gray-700 mb-1">Solo</p>
                <p className="text-3xl font-bold text-purple-600">$49<span className="text-sm text-gray-500">/mo</span></p>
                <p className="text-xs text-gray-600 mt-2 mb-3">1 user • 1,500 min/mo</p>
                <p className="text-xs text-gray-500">Perfect for individual sales reps</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-xl transform hover:scale-105 transition-all relative">
                <Badge className="mb-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-400">⭐ Most Popular</Badge>
                <p className="text-sm font-semibold text-white mb-1">Team 5</p>
                <p className="text-3xl font-bold text-white">$149<span className="text-sm text-purple-200">/mo</span></p>
                <p className="text-xs text-purple-100 mt-2 mb-3">5 users • 6,000 min/mo</p>
                <p className="text-xs text-purple-100">Great for small sales teams</p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-all hover:shadow-md">
                <p className="text-sm font-semibold text-gray-700 mb-1">Team 10</p>
                <p className="text-3xl font-bold text-purple-600">$299<span className="text-sm text-gray-500">/mo</span></p>
                <p className="text-xs text-gray-600 mt-2 mb-3">10 users • 15,000 min/mo</p>
                <p className="text-xs text-gray-500">Best for growing teams</p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-2">
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 text-lg shadow-lg"
                onClick={() => router.push('/settings?tab=billing')}
              >
                <Crown className="w-5 h-5 mr-2" />
                Upgrade to Team Plan
              </Button>
              <p className="text-xs text-center text-gray-500">
                🎉 Start your 14-day free trial • Cancel anytime
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              What Team Management Looks Like
            </CardTitle>
            <CardDescription>
              Here's what you'll be able to do once you upgrade to a Team plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Invite Team Members</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Send email invitations with custom roles (Admin or Member) and manage permissions.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Role-Based Access</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Owner, Admin, and Member roles with different permission levels for your organization.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Manage Invitations</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Track pending invitations, copy invite links, and revoke access when needed.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Shared Templates</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Create CRM templates that your entire organization can use for consistency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canManageTeam = ['owner', 'admin'].includes(userRole);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Team Settings</h1>
        <p className="text-gray-600">Manage your organization members and invitations</p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Organization Details
          </CardTitle>
          <CardDescription>Your team's current plan and limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm text-gray-500">Organization Name</Label>
              <p className="text-lg font-semibold mt-1">{organization.name}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Plan</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="capitalize">{organization.plan_type.replace('_', ' ')}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Team Size</Label>
              <p className="text-lg font-semibold mt-1">
                {members.length} / {organization.max_members} members
              </p>
            </div>
            <div className="md:col-span-3">
              <Label className="text-sm text-gray-500">Monthly Minutes</Label>
              <p className="text-lg font-semibold mt-1">{organization.max_minutes_monthly} minutes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Prompt for Free & Solo Plans */}
      {(organization.plan_type === 'free' || organization.plan_type === 'solo') && canManageTeam && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 overflow-hidden relative">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 rounded-full blur-3xl"></div>
          </div>

          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2 text-purple-900 text-2xl">
              <Crown className="w-6 h-6 text-purple-600" />
              Unlock Team Collaboration
            </CardTitle>
            <CardDescription className="text-purple-700 text-base">
              {organization.plan_type === 'free'
                ? "You're on the Free plan (1 user, 30 min/month). Upgrade to work with your team and scale your CRM automation."
                : "You're on the Solo plan (1 user, 1,500 min/month). Upgrade to a Team plan to collaborate with colleagues."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10">
            {/* Benefits Section */}
            <div className="bg-white/60 backdrop-blur rounded-lg p-4 border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-3">What you'll get with Team plans:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Add team members</strong> - Collaborate with sales reps, managers, and admins</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>More transcription minutes</strong> - Process 50-1,200x more calls per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Team invitations</strong> - Invite colleagues via email with role-based permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span><strong>Shared templates</strong> - Create organization-wide CRM templates</span>
                </li>
              </ul>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-all hover:shadow-md">
                <p className="text-sm font-semibold text-gray-700 mb-1">Solo</p>
                <p className="text-3xl font-bold text-purple-600">$49<span className="text-sm text-gray-500">/mo</span></p>
                <p className="text-xs text-gray-600 mt-2 mb-3">1 user • 1,500 min/mo</p>
                <p className="text-xs text-gray-500">Perfect for individual sales reps</p>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-xl transform hover:scale-105 transition-all relative">
                <Badge className="mb-2 bg-yellow-400 text-yellow-900 hover:bg-yellow-400">⭐ Most Popular</Badge>
                <p className="text-sm font-semibold text-white mb-1">Team 5</p>
                <p className="text-3xl font-bold text-white">$149<span className="text-sm text-purple-200">/mo</span></p>
                <p className="text-xs text-purple-100 mt-2 mb-3">5 users • 6,000 min/mo</p>
                <p className="text-xs text-purple-100">Great for small sales teams</p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-purple-200 hover:border-purple-400 transition-all hover:shadow-md">
                <p className="text-sm font-semibold text-gray-700 mb-1">Team 10</p>
                <p className="text-3xl font-bold text-purple-600">$299<span className="text-sm text-gray-500">/mo</span></p>
                <p className="text-xs text-gray-600 mt-2 mb-3">10 users • 15,000 min/mo</p>
                <p className="text-xs text-gray-500">Best for growing teams</p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-2">
              <Button
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 text-lg shadow-lg"
                onClick={() => router.push('/settings?tab=billing')}
              >
                <Crown className="w-5 h-5 mr-2" />
                Upgrade Your Plan
              </Button>
              <p className="text-xs text-center text-gray-500">
                🎉 Start your 14-day free trial • Cancel anytime
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Member */}
      {canManageTeam && members.length < organization.max_members && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Send an invitation to join your team ({organization.max_members - members.length} spots remaining)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    disabled={members.length >= organization.max_members}
                  />
                </div>

                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!inviteEmail || inviting || members.length >= organization.max_members}
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {canManageTeam && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription>Invitations that haven't been accepted yet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-sm text-gray-500">
                      Role: <span className="capitalize">{invite.role}</span> · Expires:{' '}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink(invite.token)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => revokeInvitation(invite.id, invite.email)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members ({members.length})
          </CardTitle>
          <CardDescription>People who have access to this organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const canRemove = canManageTeam && member.role !== 'owner' && !isCurrentUser;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {(member.user.user_metadata?.full_name || member.user.email)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.user.user_metadata?.full_name || member.user.email}
                        {isCurrentUser && <span className="text-sm text-gray-500 ml-2">(You)</span>}
                      </p>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={`flex items-center gap-1 capitalize ${getRoleBadgeColor(member.role)}`}>
                      {getRoleIcon(member.role)}
                      {member.role}
                    </Badge>

                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeMember(member.id, member.user.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
