// =====================================================
// PARTNER PROGRAM LANDING PAGE
// Main landing page for the SynQall Partner Program
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Award,
  ArrowRight,
  Check,
  Briefcase,
  HeartHandshake,
  Rocket
} from 'lucide-react';

export default function PartnerLandingPage() {
  const [averageEarnings, setAverageEarnings] = useState(0);

  useEffect(() => {
    // Calculate average earnings animation
    const target = 370;
    const increment = target / 30;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setAverageEarnings(Math.round(current));
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="px-6 py-20 mx-auto max-w-7xl">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 mb-6 text-sm font-medium text-blue-700 bg-blue-100 rounded-full">
            <Award className="w-4 h-4 mr-2" />
            Partner Program
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Earn 25-30% Recurring Commission
            <br />
            <span className="text-blue-600">Helping Sales Teams Save Time</span>
          </h1>

          <p className="max-w-2xl mx-auto mb-8 text-xl text-gray-600">
            Join the SynQall Partner Program and earn generous recurring commissions
            by referring sales teams to our AI-powered CRM automation platform.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/partners/apply">
              <Button size="lg" className="min-w-[200px]">
                Apply to Become a Partner
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/partners/login">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                Partner Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-16 bg-blue-600">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-4">
            <div>
              <div className="text-4xl font-bold text-white">25-30%</div>
              <div className="mt-2 text-blue-100">Commission Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">12 Months</div>
              <div className="mt-2 text-blue-100">Earning Duration</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">90 Days</div>
              <div className="mt-2 text-blue-100">Cookie Duration</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">${averageEarnings}+</div>
              <div className="mt-2 text-blue-100">Avg Monthly Earnings*</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-center text-blue-100">
            *Based on partners referring 10 customers
          </p>
        </div>
      </section>

      {/* What is SynQall Section */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">What is SynQall?</h2>
            <p className="mb-8 text-lg text-gray-600">
              SynQall is an AI-powered platform that automatically extracts CRM data from sales calls.
              Sales reps upload a call recording, and our AI instantly pulls out all key details -
              pain points, budget, timeline, next steps - ready to paste into any CRM in 60 seconds
              instead of 20 minutes.
            </p>

            <div className="grid grid-cols-1 gap-6 mt-12 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <Clock className="w-10 h-10 mb-2 text-blue-600" />
                  <CardTitle className="text-xl">Save 15-20 Hours/Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Across a typical sales team, eliminating manual CRM updates
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <TrendingUp className="w-10 h-10 mb-2 text-blue-600" />
                  <CardTitle className="text-xl">95%+ CRM Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    From an average of 65% when done manually
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Rocket className="w-10 h-10 mb-2 text-blue-600" />
                  <CardTitle className="text-xl">5-Minute Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    No IT involvement needed, works with all major CRMs
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For Section */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-3xl font-bold text-center text-gray-900">
            Perfect for Sales Professionals
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <Briefcase className="w-8 h-8 mb-2 text-blue-600" />
                <CardTitle>CRM Consultants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Add value to your CRM implementations with AI-powered data capture
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 mb-2 text-blue-600" />
                <CardTitle>Fractional Sales Leaders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Solve CRM adoption challenges for all your clients at once
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <HeartHandshake className="w-8 h-8 mb-2 text-blue-600" />
                <CardTitle>Sales Coaches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Help your clients focus on selling, not data entry
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="w-8 h-8 mb-2 text-blue-600" />
                <CardTitle>RevOps Consultants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Improve data quality and sales efficiency for your clients
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-3xl font-bold text-center text-gray-900">
            How the Partner Program Works
          </h2>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 text-2xl font-bold text-white bg-blue-600 rounded-full">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold">Apply & Get Approved</h3>
              <p className="text-gray-600">
                Submit your application and get approved within 2 business days
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 text-2xl font-bold text-white bg-blue-600 rounded-full">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold">Share Your Link</h3>
              <p className="text-gray-600">
                Get your unique referral link and share it with your network
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 text-2xl font-bold text-white bg-blue-600 rounded-full">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold">Earn Commissions</h3>
              <p className="text-gray-600">
                Earn 25-30% recurring commission for up to 12 months per customer
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Commission Structure Section */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-3xl font-bold text-center text-gray-900">
            Commission Structure
          </h2>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-2xl">Standard Tier</CardTitle>
                  <CardDescription>Default for all new partners</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Check className="w-5 h-5 mr-2 text-green-600" />
                      <span>25% commission rate</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-5 h-5 mr-2 text-green-600" />
                      <span>Up to 12 months per customer</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-5 h-5 mr-2 text-green-600" />
                      <span>Monthly payouts</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-5 h-5 mr-2 text-green-600" />
                      <span>Marketing resources</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-600">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Premium Tier</CardTitle>
                    <span className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded">
                      10+ Referrals
                    </span>
                  </div>
                  <CardDescription>For high-performing partners</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Check className="w-5 h-5 mr-2 text-green-600" />
                      <span className="font-semibold">30% commission rate</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-5 h-5 mr-2 text-green-600" />
                      <span>Up to 12 months per customer</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-5 h-5 mr-2 text-green-600" />
                      <span>Priority support</span>
                    </div>
                    <div className="flex items-center">
                      <Check className="w-5 h-5 mr-2 text-green-600" />
                      <span>Custom marketing materials</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Earnings Example</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-gray-600">
                  Here's what you could earn with just 10 active customers on our Pro plan ($149/month):
                </p>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Standard Tier (25%)</p>
                      <p className="text-2xl font-bold text-gray-900">$372.50/month</p>
                      <p className="text-sm text-gray-600">$4,470/year</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Premium Tier (30%)</p>
                      <p className="text-2xl font-bold text-blue-600">$447.00/month</p>
                      <p className="text-sm text-gray-600">$5,364/year</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What We Provide Section */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-3xl font-bold text-center text-gray-900">
            What We Provide
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Marketing Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• Email templates</li>
                  <li>• Social media posts</li>
                  <li>• Product one-pagers</li>
                  <li>• Demo videos</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Partner Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• Real-time statistics</li>
                  <li>• Referral tracking</li>
                  <li>• Earnings reports</li>
                  <li>• Payout history</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dedicated Support</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-600">
                  <li>• Partner manager</li>
                  <li>• Priority support</li>
                  <li>• Training resources</li>
                  <li>• Regular updates</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-blue-600">
        <div className="mx-auto text-center max-w-3xl">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to Start Earning?
          </h2>
          <p className="mb-8 text-xl text-blue-100">
            Join the SynQall Partner Program today and start earning recurring commissions
          </p>
          <Link href="/partners/apply">
            <Button size="lg" variant="secondary" className="min-w-[200px]">
              Apply to Become a Partner
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-blue-100">
            Applications reviewed within 2 business days
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t">
        <div className="mx-auto text-center max-w-7xl">
          <p className="text-gray-600">
            Questions? Contact us at{' '}
            <a href="mailto:partners@synqall.com" className="text-blue-600 hover:underline">
              partners@synqall.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}