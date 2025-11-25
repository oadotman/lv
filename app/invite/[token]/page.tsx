'use client';

// =====================================================
// INVITATION ACCEPTANCE PAGE
// Handles team invitation acceptance flow
// =====================================================

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type InvitationStatus = 'loading' | 'success' | 'error' | 'expired' | 'email_mismatch';

interface Invitation {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  expires_at: string;
  invited_by: string;
}

export default function AcceptInvitationPage() {
  const params = useParams();
  const token = params?.token as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;

    async function acceptInvitation() {
      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid invitation link');
        return;
      }

      const supabase = createClient();

      // Fetch invitation
      const { data: invite, error: fetchError } = await supabase
        .from('team_invitations')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('token', token)
        .is('accepted_at', null)
        .single();

      if (fetchError || !invite) {
        setStatus('error');
        setErrorMessage('Invitation not found or already accepted');
        return;
      }

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        setStatus('expired');
        setInvitation(invite);
        return;
      }

      setInvitation(invite);

      // If not logged in, redirect to signup with return URL
      if (!user) {
        const signupUrl = new URL('/signup', window.location.origin);
        signupUrl.searchParams.set('email', invite.email);
        signupUrl.searchParams.set('returnTo', `/invite/${token}`);
        router.push(signupUrl.toString());
        return;
      }

      // Check if user email matches invitation
      if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
        setStatus('email_mismatch');
        setErrorMessage(`This invitation is for ${invite.email}, but you're logged in as ${user.email}.`);
        return;
      }

      // Accept invitation
      try {
        // Add user to organization
        const { error: memberError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: user.id,
            organization_id: invite.organization_id,
            role: invite.role,
            invited_by: invite.invited_by,
          });

        if (memberError) {
          // Check if already a member
          if (memberError.code === '23505') {
            setStatus('error');
            setErrorMessage('You are already a member of this organization');
            return;
          }
          throw memberError;
        }

        // Mark invitation as accepted
        await supabase
          .from('team_invitations')
          .update({
            accepted_at: new Date().toISOString(),
            accepted_by: user.id,
          })
          .eq('id', invite.id);

        // Log audit
        await supabase.rpc('log_audit', {
          p_user_id: user.id,
          p_action: 'invitation_accepted',
          p_resource_type: 'invitation',
          p_resource_id: invite.id,
          p_metadata: {
            organization_id: invite.organization_id,
            organization_name: invite.organization.name,
            role: invite.role,
          },
        });

        setStatus('success');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);

      } catch (error: any) {
        console.error('Acceptance error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Failed to accept invitation. Please try again.');
      }
    }

    acceptInvitation();
  }, [token, user, authLoading, router]);

  // Loading state
  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-lg">Processing invitation...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Welcome to {invitation?.organization?.name}!</h1>
          <p className="text-gray-600 mb-4">
            You've successfully joined the team as a <span className="font-semibold capitalize">{invitation?.role}</span>.
          </p>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Expired state
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-lg">
          <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Invitation Expired</h1>
          <p className="text-gray-600 mb-6">
            This invitation has expired. Please ask your team administrator to send a new invitation.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Email mismatch state
  if (status === 'email_mismatch') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-lg">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Email Mismatch</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <Button
              onClick={async () => {
                await useAuth().signOut();
                const signupUrl = new URL('/signup', window.location.origin);
                signupUrl.searchParams.set('email', invitation?.email || '');
                signupUrl.searchParams.set('returnTo', `/invite/${token}`);
                router.push(signupUrl.toString());
              }}
              className="w-full"
            >
              Log Out and Continue
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center max-w-md bg-white p-8 rounded-lg shadow-lg">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
