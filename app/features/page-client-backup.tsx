'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Phone, Brain, Clock, Shield, FileText, Users, TrendingUp, Zap } from 'lucide-react'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Features
        </h1>

        <p className="text-xl text-gray-300 mb-12">
          Everything you need to automate your freight brokerage call documentation
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
            <Phone className="h-10 w-10 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Automatic Call Recording</h3>
            <p className="text-gray-300">Every call automatically recorded and transcribed with 98% accuracy</p>
          </div>

          <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
            <Brain className="h-10 w-10 text-pink-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI Data Extraction</h3>
            <p className="text-gray-300">Automatically extracts rates, locations, dates, and carrier details</p>
          </div>

          <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
            <FileText className="h-10 w-10 text-green-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Rate Confirmations</h3>
            <p className="text-gray-300">Auto-generates rate confirmations from call data</p>
          </div>

          <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
            <Users className="h-10 w-10 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-300">Share calls and data across your team instantly</p>
          </div>

          <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
            <Shield className="h-10 w-10 text-blue-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Compliance Ready</h3>
            <p className="text-gray-300">Automatic compliance disclosures for all states</p>
          </div>

          <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
            <Zap className="h-10 w-10 text-orange-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">CRM Integration</h3>
            <p className="text-gray-300">Seamlessly integrates with your existing TMS and CRM</p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Start Your Free Hour
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}