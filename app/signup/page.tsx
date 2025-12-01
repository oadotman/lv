'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { authHelpers } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Phone, Loader2, CheckCircle2, Users } from 'lucide-react'

function SignUpForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Check for invitation parameters
  const inviteEmail = searchParams?.get('email')
  const returnTo = searchParams?.get('returnTo')
  const isInvited = !!inviteEmail && !!returnTo

  // Pre-fill email if coming from invitation
  useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail)
    }
  }, [inviteEmail])

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // If coming from invitation, redirect to the invitation page
      if (returnTo) {
        router.push(returnTo)
      } else {
        router.push('/')
      }
    }
  }, [user, router, returnTo])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    // Validate privacy policy acceptance
    if (!acceptedPrivacy) {
      setError('You must accept the Privacy Policy and Terms of Service to create an account')
      setLoading(false)
      return
    }

    try {
      // Extract invitation token from returnTo URL if present
      let inviteToken: string | undefined
      if (returnTo && returnTo.startsWith('/invite/')) {
        inviteToken = returnTo.replace('/invite/', '')
      }

      // Call custom signup API that creates user + organization
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          organizationName: organizationName || `${fullName}'s Organization`,
          inviteToken, // Pass invitation token if present
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Enhanced error message with debug info in development
        let errorMessage = data.error || 'Signup failed'
        if (data.debugInfo) {
          console.error('🔴 Signup error details:', data.debugInfo)
          errorMessage += ` (${data.debugInfo.code || data.debugInfo.message})`
        }
        throw new Error(errorMessage)
      }

      setSuccess(true)
      setLoading(false)
      // Redirect after 2 seconds
      setTimeout(() => {
        if (returnTo && inviteToken) {
          // If invitation was accepted during signup, redirect directly to login
          // without the invite URL since it's already processed
          router.push('/login?message=Account created successfully! You have been added to the team. Please sign in.&inviteAccepted=true')
        } else {
          // Normal signup flow
          router.push('/login?message=Account created successfully! Please sign in.')
        }
      }, 2000)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
        <Card className="w-full max-w-md dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Account created!</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Your account has been created successfully. You can now sign in and start using SynQall.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Redirecting to login...
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <Card className="w-full max-w-md dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Phone className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create your account</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Start automating your CRM data entry today
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-300">Full name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-slate-700 dark:text-slate-300">
                Organization name
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">(optional)</span>
              </Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Acme Corp (defaults to your name)"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={loading}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You'll start with a Free plan (1 user, 30 min/month)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Privacy Policy Checkbox */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                id="acceptPrivacy"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                disabled={loading}
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer dark:bg-slate-800"
                required
              />
              <label htmlFor="acceptPrivacy" className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium"
                >
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium"
                >
                  Terms of Service
                </Link>
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !acceptedPrivacy}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
            <p className="text-sm text-center text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
