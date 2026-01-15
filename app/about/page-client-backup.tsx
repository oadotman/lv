'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Target, Users, Rocket } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black text-white">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          About LoadVoice
        </h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-xl text-gray-300 mb-8">
            LoadVoice was built by freight brokers, for freight brokers. We understand the chaos of managing hundreds of carrier calls while trying to move freight efficiently.
          </p>

          <div className="space-y-8 mb-12">
            <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <Target className="h-10 w-10 text-purple-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>
              <p className="text-gray-300">
                Eliminate manual data entry from freight brokerage. Every call should document itself, every rate should auto-confirm, and every broker should leave work on time.
              </p>
            </div>

            <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <Users className="h-10 w-10 text-pink-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-3">Who We Serve</h2>
              <p className="text-gray-300">
                We serve freight brokers and 3PLs who are tired of typing the same information multiple times. From solo brokers to enterprise teams, LoadVoice scales with your business.
              </p>
            </div>

            <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <Rocket className="h-10 w-10 text-green-400 mb-4" />
              <h2 className="text-2xl font-semibold mb-3">Why LoadVoice</h2>
              <p className="text-gray-300">
                We're not just another recording tool. LoadVoice understands freight brokerage terminology, extracts the data that matters, and integrates with your existing workflow. No training, no setup, just results.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/30 p-8 rounded-xl border border-purple-700/30 mb-8">
            <h3 className="text-2xl font-semibold mb-4">The Numbers</h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-purple-400">500+</div>
                <p className="text-gray-300">Brokers using LoadVoice</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-pink-400">50,000+</div>
                <p className="text-gray-300">Calls processed</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400">10hrs</div>
                <p className="text-gray-300">Saved per week per broker</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl mb-6 text-gray-300">
              Ready to reclaim your time?
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Try LoadVoice Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}