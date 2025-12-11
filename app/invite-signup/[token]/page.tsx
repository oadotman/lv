'use client';

// =====================================================
// TEAM INVITATION SIGNUP PAGE
// Dedicated signup flow for invited team members
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Users, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

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
  accepted_at: string | null;
}

export default function InviteSignupPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    async function checkInvitation() {
      if (!token) {
        setError('Invalid invitation link');
        setCheckingInvite(false);
        return;
      }

      const supabase = createClient();

      try {
        // Fetch invitation details
        // Note: This query may fail with 406 if RLS policies are too restrictive
        const { data: invite, error: fetchError } = await supabase
          .from('team_invitations')
          .select(`
            *,
            organization:organizations(*)
          `)
          .eq('token', token)
          .single();

        if (fetchError) {
          console.error('Error fetching invitation:', fetchError);
          // If it's a 406 error, it's likely an RLS issue
          if (fetchError.code === '406' || fetchError.message?.includes('406')) {
            setError('Unable to access invitation. Please contact your administrator to update database permissions.');
          } else {
            setError('Invitation not found or invalid');
          }
          setCheckingInvite(false);
          return;
        }

        if (!invite) {
          setError('Invitation not found');
          setCheckingInvite(false);
          return;
        }

        // Check if already accepted
        if (invite.accepted_at) {
          setError('This invitation has already been used. Please sign in instead.');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
          setCheckingInvite(false);
          return;
        }

        // Check if expired
        if (new Date(invite.expires_at) < new Date()) {
          setError('This invitation has expired. Please request a new one from your team administrator.');
          setCheckingInvite(false);
          return;
        }

        // Check if user already exists with this email
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // User is logged in, redirect to accept invitation
          router.push(`/invite/${token}`);
          return;
        }

        setInvitation(invite);
        setCheckingInvite(false);

      } catch (err) {
        console.error('Error checking invitation:', err);
        setError('Failed to validate invitation');
        setCheckingInvite(false);
      }
    }

    checkInvitation();
  }, [token, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) {
      setError('No valid invitation found');
      return;
    }

    // Validate form
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create account with invitation token
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invitation.email,
          password,
          fullName,
          inviteToken: token,
          // Don't send organization name as we'll use the invited org
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setSuccess(true);

      // Auto-login after successful signup
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (authError) {
        // If auto-login fails, redirect to manual login
        setTimeout(() => {
          router.push('/login?message=Account created successfully! Please sign in.');
        }, 2000);
      } else {
        // Successfully logged in, redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Loading state while checking invitation
  if (checkingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-lg">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Account Created!</CardTitle>
            <CardDescription>
              Welcome to {invitation?.organization?.name}!
              <br />
              Redirecting to dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Join Your Team</CardTitle>
          <CardDescription>
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl">
              <div className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">You're joining</div>
              <div className="font-bold text-xl text-blue-900">{invitation?.organization?.name}</div>
              <div className="text-sm mt-2 text-blue-700">
                Your role: <span className="font-semibold capitalize bg-white px-2 py-0.5 rounded">{invitation?.role}</span>
              </div>
            </div>
            <div className="mt-4 text-gray-600">
              Complete the form below to create your account
            </div>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">This email was used for the invitation</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account & Join Team'
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-blue-600 hover:underline">
                Sign in
              </a>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}