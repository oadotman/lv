'use client'

import React, { useState } from 'react'
import { Check, X, Zap, TrendingUp, Users, Shield } from 'lucide-react'
import { PLANS, formatMinutes, calculateAnnualSavings } from '@/lib/pricing'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const router = useRouter()

  const plans = ['free', 'solo', 'starter', 'professional', 'enterprise'] as const

  const handleSelectPlan = (planId: string) => {
    // Navigate to signup with selected plan
    router.push(`/signup?plan=${planId}&billing=${isAnnual ? 'annual' : 'monthly'}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="px-6 py-16 mx-auto max-w-7xl">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
          >
            Simple, transparent pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 text-xl text-gray-600"
          >
            Choose the perfect plan for your freight brokerage
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <span className={!isAnnual ? 'font-semibold' : 'text-gray-500'}>
              Monthly
            </span>
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-cyan-600"
            />
            <span className={isAnnual ? 'font-semibold' : 'text-gray-500'}>
              Annual
            </span>
            {isAnnual && (
              <Badge className="bg-green-100 text-green-800">
                Save 17% (2 months free!)
              </Badge>
            )}
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-5">
          {plans.map((planId, index) => {
            const plan = PLANS[planId]
            const price = isAnnual
              ? Math.round(plan.priceAnnual / 12)
              : plan.price
            const savings = isAnnual ? calculateAnnualSavings(planId) : 0

            return (
              <motion.div
                key={planId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                className={`relative rounded-2xl bg-white p-8 shadow-lg ring-1 ${
                  plan.isPopular
                    ? 'ring-2 ring-cyan-600 scale-105'
                    : 'ring-gray-200'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                      MOST POPULAR
                    </Badge>
                  </div>
                )}

                <div className="flex flex-col h-full">
                  {/* Plan Name */}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="mt-4 flex items-baseline">
                    {plan.price === 0 ? (
                      <span className="text-4xl font-bold tracking-tight text-gray-900">
                        Free
                      </span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold tracking-tight text-gray-900">
                          ${price}
                        </span>
                        <span className="ml-1 text-xl text-gray-500">/mo</span>
                      </>
                    )}
                  </div>

                  {/* Annual Savings */}
                  {isAnnual && savings > 0 && (
                    <p className="mt-1 text-sm text-green-600">
                      Save ${savings}/year
                    </p>
                  )}

                  {/* Minutes & Users */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm">
                      <Zap className="h-4 w-4 text-cyan-600 mr-2" />
                      <span className="font-semibold">
                        {formatMinutes(plan.maxMinutes)}
                      </span>
                      <span className="text-gray-500 ml-1">/ month</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 text-cyan-600 mr-2" />
                      <span className="font-semibold">
                        {plan.maxMembers === 999
                          ? 'Unlimited'
                          : plan.maxMembers}{' '}
                        {plan.maxMembers === 1 ? 'user' : 'users'}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mt-6 space-y-3 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex text-sm">
                        <Check className="h-5 w-5 text-cyan-600 shrink-0" />
                        <span className="ml-3 text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSelectPlan(planId)}
                    className={`mt-8 w-full ${
                      plan.isPopular
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
                        : planId === 'enterprise'
                        ? 'bg-gray-900 hover:bg-gray-800'
                        : 'bg-white text-cyan-600 border-2 border-cyan-600 hover:bg-cyan-50'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Feature Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-24"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Compare Plans
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-900">
                    Features
                  </th>
                  {plans.map(planId => (
                    <th key={planId} className="text-center py-4 px-6">
                      <div className="text-sm font-medium text-gray-900">
                        {PLANS[planId].name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: '60-second extraction', plans: ['free', 'solo', 'starter', 'professional', 'enterprise'] },
                  { name: 'Auto-populate CRM', plans: ['free', 'solo', 'starter', 'professional', 'enterprise'] },
                  { name: 'Rate confirmations', plans: ['free', 'solo', 'starter', 'professional', 'enterprise'] },
                  { name: 'Load tracking', plans: ['solo', 'starter', 'professional', 'enterprise'] },
                  { name: 'Carrier performance', plans: ['starter', 'professional', 'enterprise'] },
                  { name: 'Lane intelligence', plans: ['starter', 'professional', 'enterprise'] },
                  { name: 'Team collaboration', plans: ['professional', 'enterprise'] },
                  { name: 'API access', plans: ['professional', 'enterprise'] },
                  { name: 'White-label', plans: ['professional', 'enterprise'] },
                  { name: 'Custom AI training', plans: ['enterprise'] },
                  { name: 'Priority support', plans: ['starter', 'professional', 'enterprise'] },
                  { name: 'Dedicated manager', plans: ['professional', 'enterprise'] },
                ].map((feature, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {feature.name}
                    </td>
                    {plans.map(planId => (
                      <td key={planId} className="text-center py-4 px-6">
                        {feature.plans.includes(planId) ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-24 text-center"
        >
          <div className="flex justify-center gap-8 items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">Bank-level security</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">99.9% uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">60-second extraction</span>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-24 max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            {[
              {
                q: 'What happens when I exceed my minutes?',
                a: 'You can continue using LoadVoice with our simple overage pricing at $0.20 per additional minute. We\'ll notify you when you\'re approaching your limit.',
              },
              {
                q: 'Can I change plans anytime?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately with prorated billing.',
              },
              {
                q: 'Do you offer custom plans?',
                a: 'Yes, for brokerages with unique needs or high volume, we offer custom enterprise plans. Contact our sales team to discuss.',
              },
              {
                q: 'Is there a setup fee?',
                a: 'No setup fees! Start with our free trial and upgrade when you\'re ready. No hidden costs.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, ACH transfers for annual plans, and can arrange invoicing for enterprise customers.',
              },
            ].map((faq, i) => (
              <div key={i}>
                <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-24 text-center bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl p-12"
        >
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your freight brokerage?
          </h2>
          <p className="text-xl text-cyan-100 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <Button
            onClick={() => handleSelectPlan('free')}
            size="lg"
            className="bg-white text-cyan-600 hover:bg-gray-100"
          >
            Start Free Trial
          </Button>
        </motion.div>
      </div>
    </div>
  )
}