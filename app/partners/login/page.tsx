// =====================================================
// PARTNER LOGIN PAGE
// Login page for LoadVoice partners
// =====================================================

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  Users,
  DollarSign,
  Award
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function PartnerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/partners/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/partners/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          remember_me: rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      toast({
        title: 'Login Successful',
        description: 'Welcome back to the LoadVoice Partner Program',
      });

      // Redirect to dashboard or requested page
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/partners/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      setResetSent(true);
      toast({
        title: 'Reset Email Sent',
        description: 'Check your email for password reset instructions',
      });
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">LoadVoice Partners</h1>
            <p className="text-gray-600 mt-2">Reset your password</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you instructions to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!resetSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email">Email Address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="partner@example.com"
                      required
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Email'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setError('');
                        setResetEmail('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <p className="text-green-600 mb-4">
                    Password reset instructions have been sent to {resetEmail}
                  </p>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetSent(false);
                      setResetEmail('');
                    }}
                  >
                    Back to Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="flex">
        {/* Left Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <Link href="/partners">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Partner Program
                </Button>
              </Link>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Partner Login</h1>
              <p className="text-gray-600 mt-2">Access your partner dashboard</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your partner account credentials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="partner@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Remember me
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <Separator className="my-6" />

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Not a partner yet?
                  </p>
                  <Link href="/partners/apply">
                    <Button variant="outline" className="w-full">
                      Apply to Become a Partner
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact{' '}
                <a
                  href="mailto:partners@loadvoice.com"
                  className="text-blue-600 hover:underline"
                >
                  partners@loadvoice.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Info */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white items-center justify-center px-12">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold mb-6">Welcome Back, Partner!</h2>
            <p className="text-lg mb-8 text-blue-100">
              Access your dashboard to track referrals, monitor earnings, and get marketing resources.
            </p>

            <div className="space-y-6">
              <div className="flex items-start">
                <Users className="w-6 h-6 mr-3 mt-1 text-blue-200" />
                <div>
                  <h3 className="font-semibold mb-1">Track Your Referrals</h3>
                  <p className="text-sm text-blue-100">
                    Monitor signups, trials, and conversions in real-time
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <DollarSign className="w-6 h-6 mr-3 mt-1 text-blue-200" />
                <div>
                  <h3 className="font-semibold mb-1">Monitor Earnings</h3>
                  <p className="text-sm text-blue-100">
                    View commissions, payouts, and earning projections
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Award className="w-6 h-6 mr-3 mt-1 text-blue-200" />
                <div>
                  <h3 className="font-semibold mb-1">Access Resources</h3>
                  <p className="text-sm text-blue-100">
                    Download marketing materials and sales tools
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-white/10 rounded-lg backdrop-blur-sm">
              <p className="text-sm font-medium mb-2">Current Commission Rates</p>
              <div className="flex justify-between text-2xl font-bold">
                <span>Standard: 25%</span>
                <span>Premium: 30%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}