import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, CheckCircle2, Users, Gift, Shield, Clock, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign Up - LoadVoice | Start Your Free Trial Today',
  description: 'Create your LoadVoice account and start saving 12+ hours per week with AI-powered freight call documentation. 60 minutes free every month, no credit card required.',
  keywords: [
    'LoadVoice signup',
    'freight CRM free trial',
    'create account',
    'freight broker software trial',
    'get started with LoadVoice',
    'freight documentation free'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/signup'
  },
  openGraph: {
    title: 'Sign Up for LoadVoice - Start Free Trial',
    description: 'Join 500+ freight brokers saving 12+ hours per week. 60 minutes free forever, no credit card required.',
    url: 'https://loadvoice.com/signup',
    siteName: 'LoadVoice',
    images: [
      {
        url: 'https://loadvoice.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sign up for LoadVoice',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign Up for LoadVoice - Free Trial',
    description: '60 minutes free forever. Join 500+ freight brokers automating their call documentation.',
    images: ['https://loadvoice.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  }
}

export default function SignUpPage() {
  const benefits = [
    {
      icon: Clock,
      title: "Save 12+ Hours Weekly",
      description: "Eliminate manual data entry"
    },
    {
      icon: Shield,
      title: "FMCSA Compliant",
      description: "Automatic carrier verification"
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description: "Start in under 5 minutes"
    }
  ]

  const testimonials = [
    {
      quote: "As an independent broker, LoadVoice is my virtual assistant. Saves me 15 hours per week!",
      author: "Mike R.",
      company: "Independent Freight Broker"
    },
    {
      quote: "Perfect for small operations. I run my brokerage solo and LoadVoice handles all my documentation.",
      author: "Sarah L.",
      company: "Solo Broker"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Phone className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              LoadVoice
            </span>
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Already have an account? Sign in
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Sign Up Form */}
          <div>
            <Card className="shadow-xl border-gray-200">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-3xl font-bold">Create Your Account</CardTitle>
                <CardDescription className="text-base">
                  Start your free trial - 60 minutes free every month, forever
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Server-rendered form structure */}
                <form className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium">
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="John Smith"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="john@example.com"
                    />
                    <p className="text-xs text-gray-500">Personal or business email accepted</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="organization" className="text-sm font-medium">
                      Company Name (Optional)
                    </label>
                    <input
                      id="organization"
                      name="organization"
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="ABC Freight Brokers or leave blank"
                    />
                    <p className="text-xs text-gray-500">Independent brokers can skip this</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password *
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Minimum 8 characters"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password *
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Re-enter password"
                    />
                  </div>

                  <div className="flex items-start space-x-2">
                    <input
                      id="acceptTerms"
                      name="acceptTerms"
                      type="checkbox"
                      required
                      className="mt-1"
                    />
                    <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                      I agree to the{' '}
                      <Link href="/terms" className="text-purple-600 hover:underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-purple-600 hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  >
                    Create Account
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Button variant="outline" className="w-full">
                      Google
                    </Button>
                    <Button variant="outline" className="w-full">
                      Microsoft
                    </Button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-4 text-center text-sm text-gray-600">
                By signing up, you agree to receive product updates and marketing communications
              </CardFooter>
            </Card>
          </div>

          {/* Right Column - Benefits */}
          <div className="space-y-8">
            {/* Trust Badges */}
            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white" />
                ))}
              </div>
              <div className="text-sm">
                <p className="font-semibold">Join 500+ freight brokers</p>
                <p className="text-gray-600">Saving 12+ hours per week</p>
              </div>
            </div>

            {/* Key Benefits */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Why LoadVoice?</h2>
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                      <benefit.icon className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* What's Included */}
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                Included in Free Trial
              </h3>
              <ul className="space-y-2">
                {[
                  '60 minutes free every month',
                  'AI-powered transcription',
                  'Automatic data extraction',
                  'Carrier verification',
                  'Team collaboration',
                  'No credit card required'
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Testimonials */}
            <div className="space-y-4">
              <h3 className="font-semibold">What Our Users Say</h3>
              {testimonials.map((testimonial, index) => (
                <div key={index} className="border-l-4 border-purple-600 pl-4 py-2">
                  <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                  <p className="text-sm text-gray-600 mt-2">
                    - {testimonial.author}, {testimonial.company}
                  </p>
                </div>
              ))}
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Shield className="h-5 w-5 text-green-600" />
              <span>Bank-level encryption • SOC 2 Compliant • GDPR Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}