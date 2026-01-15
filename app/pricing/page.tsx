import { Metadata } from 'next'
import Link from 'next/link'
import { Check, X, Zap, TrendingUp, Users, Shield } from 'lucide-react'
import { PLANS, formatMinutes, calculateAnnualSavings, OVERAGE_RATE } from '@/lib/pricing'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PricingClient from './pricing-client'

export const metadata: Metadata = {
  title: 'Pricing - LoadVoice | Simple, Transparent Freight CRM Pricing',
  description: 'Start free with 60 minutes/month forever. Professional plans from $149/month. Save 20% with annual billing. No hidden fees, no setup costs.',
  keywords: [
    'freight CRM pricing',
    'call recording pricing',
    'broker software cost',
    'logistics CRM pricing',
    'transportation software pricing',
    'freight broker tools pricing'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/pricing'
  },
  openGraph: {
    title: 'LoadVoice Pricing - Start Free, Scale as You Grow',
    description: 'Simple, transparent pricing for freight brokers. 60 minutes free forever, professional plans from $149/month.',
    url: 'https://loadvoice.com/pricing',
    siteName: 'LoadVoice',
    images: [
      {
        url: 'https://loadvoice.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LoadVoice Pricing Plans',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LoadVoice Pricing - Simple, Transparent Plans',
    description: '60 minutes free forever. Professional plans from $149/month. No hidden fees.',
    images: ['https://loadvoice.com/og-image.png'],
  },
}

export default function PricingPage() {
  const plans = ['free', 'solo', 'starter', 'professional', 'enterprise'] as const

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="px-6 py-16 mx-auto max-w-7xl">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Start free, upgrade as you grow. No hidden fees.
          </p>

          {/* Annual/Monthly Toggle - Will be enhanced with client-side JS */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className="text-gray-600">Monthly</span>
            <div id="billing-toggle" className="relative inline-flex items-center">
              {/* This will be made interactive in PricingClient */}
              <div className="w-14 h-8 bg-gray-200 rounded-full"></div>
              <div className="absolute left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform"></div>
            </div>
            <span className="text-gray-600">Annual</span>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Save 20%
            </Badge>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-5 md:grid-cols-3">
          {plans.map((planId) => {
            const plan = PLANS[planId]
            const isPopular = planId === 'professional'

            return (
              <div
                key={planId}
                className={`relative p-6 bg-white rounded-2xl shadow-lg border-2 transition-all hover:scale-105 ${
                  isPopular ? 'border-purple-600' : 'border-gray-200'
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                    Most Popular
                  </Badge>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold capitalize">{plan.name}</h3>
                    <p className="mt-2 text-gray-600">{plan.name}</p>
                  </div>

                  <div className="py-4 border-t border-b border-gray-200">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="ml-2 text-gray-600">/month</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {formatMinutes(plan.maxMinutes)} included
                    </p>
                    {OVERAGE_RATE && (
                      <p className="mt-1 text-sm text-gray-500">
                        ${OVERAGE_RATE}/min after limit
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="mt-0.5 h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="ml-2 text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={`/signup?plan=${planId}`}>
                    <Button
                      className={`w-full ${
                        isPopular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {plan.price === 0 ? 'Start Free' : 'Get Started'}
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Comparison Table */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">Compare Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4">Feature</th>
                  {plans.map((planId) => (
                    <th key={planId} className="text-center py-4 px-4 capitalize">
                      {PLANS[planId].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium">Monthly Minutes</td>
                  {plans.map((planId) => (
                    <td key={planId} className="text-center py-4 px-4">
                      {formatMinutes(PLANS[planId].maxMinutes)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium">AI Transcription</td>
                  {plans.map((planId) => (
                    <td key={planId} className="text-center py-4 px-4">
                      <Check className="h-5 w-5 text-green-500 mx-auto" />
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium">Team Members</td>
                  {plans.map((planId) => (
                    <td key={planId} className="text-center py-4 px-4">
                      {planId === 'free' ? '1' : planId === 'solo' ? '1' : planId === 'starter' ? '3' : 'Unlimited'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium">API Access</td>
                  {plans.map((planId) => (
                    <td key={planId} className="text-center py-4 px-4">
                      {['professional', 'enterprise'].includes(planId) ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 font-medium">Priority Support</td>
                  {plans.map((planId) => (
                    <td key={planId} className="text-center py-4 px-4">
                      {['starter', 'professional', 'enterprise'].includes(planId) ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately and are prorated.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">What happens if I exceed my minutes?</h3>
              <p className="text-gray-600">
                We'll notify you when you're approaching your limit. You can either upgrade your plan or pay for overage at the rates shown above.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Is there a setup fee?</h3>
              <p className="text-gray-600">
                No! There are no setup fees, hidden costs, or long-term contracts. Just simple, transparent pricing.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Do you offer custom enterprise plans?</h3>
              <p className="text-gray-600">
                Yes! For brokerages needing more than 2,500 minutes per month or custom features, contact our sales team for a tailored solution.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center py-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Freight Operations?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Start with 60 minutes free every month, forever.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>

      {/* Client-side enhancements */}
      <PricingClient />
    </div>
  )
}