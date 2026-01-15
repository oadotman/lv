'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, MapPin, Phone, MessageSquare } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black text-white">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Contact Us
        </h1>

        <p className="text-xl text-gray-300 mb-12">
          Have questions? We're here to help you get the most out of LoadVoice.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="space-y-6">
            <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <Mail className="h-8 w-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Email Support</h3>
              <a href="mailto:support@loadvoice.com" className="text-purple-400 hover:text-purple-300">
                support@loadvoice.com
              </a>
              <p className="text-sm text-gray-400 mt-2">
                We respond within 24 hours
              </p>
            </div>

            <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <Phone className="h-8 w-8 text-pink-400 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Sales Inquiries</h3>
              <a href="mailto:sales@loadvoice.com" className="text-pink-400 hover:text-pink-300">
                sales@loadvoice.com
              </a>
              <p className="text-sm text-gray-400 mt-2">
                For enterprise and custom plans
              </p>
            </div>

            <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <MapPin className="h-8 w-8 text-green-400 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Location</h3>
              <p className="text-gray-300">
                United States
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Serving freight brokers nationwide
              </p>
            </div>
          </div>

          <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
            <MessageSquare className="h-8 w-8 text-yellow-400 mb-4" />
            <h3 className="text-xl font-semibold mb-4">Send us a message</h3>
            <form className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium mb-2">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  id="company"
                  className="w-full px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="ABC Logistics"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-2 bg-purple-900/50 border border-purple-700/50 rounded-lg focus:outline-none focus:border-purple-500"
                  placeholder="How can we help you?"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Send Message
              </Button>
            </form>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/30 p-8 rounded-xl border border-purple-700/30 text-center">
          <h3 className="text-2xl font-semibold mb-4">
            Ready to get started?
          </h3>
          <p className="text-gray-300 mb-6">
            Skip the wait and start documenting your calls automatically today.
          </p>
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