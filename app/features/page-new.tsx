import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Phone, Brain, Clock, Shield, FileText, Users, TrendingUp, Zap, ChevronRight, Database, Lock, Globe, Headphones } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Features - LoadVoice | Complete Freight Call Documentation Platform',
  description: 'Automatic call recording, AI transcription, load data extraction, carrier verification, team collaboration, and analytics. Everything freight brokers need in one platform.',
  keywords: [
    'freight call recording features',
    'broker CRM features',
    'load documentation automation',
    'carrier verification system',
    'freight analytics dashboard',
    'team collaboration tools',
    'TMS integration',
    'FMCSA compliance tools'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/features'
  },
  openGraph: {
    title: 'LoadVoice Features - Complete Freight Documentation Platform',
    description: 'Discover how LoadVoice automates your freight documentation with AI-powered call recording, data extraction, and team collaboration.',
    url: 'https://loadvoice.com/features',
    siteName: 'LoadVoice',
    images: [
      {
        url: 'https://loadvoice.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LoadVoice Features Overview',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LoadVoice Features - AI-Powered Freight Documentation',
    description: 'Automatic call recording, AI extraction, carrier verification, and more for freight brokers.',
    images: ['https://loadvoice.com/og-image.png'],
  },
}

export default function FeaturesPage() {
  const coreFeatures = [
    {
      icon: Phone,
      title: "Automatic Call Recording",
      description: "Every call automatically recorded and transcribed with 98% accuracy",
      details: [
        "Automatic recording on all calls",
        "98% transcription accuracy",
        "Speaker identification",
        "Searchable transcripts"
      ]
    },
    {
      icon: Brain,
      title: "AI-Powered Data Extraction",
      description: "Load details, carrier info, and rates extracted automatically",
      details: [
        "Pickup/delivery locations",
        "Load specifications",
        "Rate negotiations",
        "Special requirements"
      ]
    },
    {
      icon: Clock,
      title: "Real-Time Processing",
      description: "Data available immediately after each call ends",
      details: [
        "Instant transcription",
        "Immediate data extraction",
        "Real-time notifications",
        "Quick search access"
      ]
    },
    {
      icon: Shield,
      title: "Carrier Verification",
      description: "Automatic FMCSA checks and compliance verification",
      details: [
        "MC/DOT verification",
        "Insurance validation",
        "Safety scores",
        "Authority status"
      ]
    },
    {
      icon: FileText,
      title: "Document Generation",
      description: "Automatic rate confirmations and load summaries",
      details: [
        "Rate confirmations",
        "Load summaries",
        "Carrier packets",
        "Email templates"
      ]
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share insights and coordinate across your team",
      details: [
        "Shared call library",
        "Team notes",
        "Assignment workflows",
        "Activity tracking"
      ]
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Track performance metrics and optimize operations",
      details: [
        "Call volume trends",
        "Lane analytics",
        "Carrier performance",
        "Revenue insights"
      ]
    },
    {
      icon: Zap,
      title: "Integrations",
      description: "Connect with your existing TMS and tools",
      details: [
        "TMS integration",
        "Load board sync",
        "Email automation",
        "API access"
      ]
    },
    {
      icon: Database,
      title: "Smart CRM",
      description: "Intelligent customer relationship management",
      details: [
        "Contact management",
        "Interaction history",
        "Automated follow-ups",
        "Lead scoring"
      ]
    }
  ]

  const useCases = [
    {
      title: "For Solo Brokers",
      description: "Handle more loads without hiring",
      benefits: [
        "Save 12+ minutes per call",
        "Never miss load details",
        "Automatic documentation",
        "Professional image"
      ]
    },
    {
      title: "For Small Teams",
      description: "Coordinate efficiently across your team",
      benefits: [
        "Shared call library",
        "Team collaboration",
        "Consistent processes",
        "Performance tracking"
      ]
    },
    {
      title: "For Growing Brokerages",
      description: "Scale operations without scaling headcount",
      benefits: [
        "Standardized workflows",
        "Quality control",
        "Training resources",
        "Advanced analytics"
      ]
    },
    {
      title: "For Enterprise",
      description: "Enterprise-grade features and support",
      benefits: [
        "Custom AI training",
        "Dedicated support",
        "SLA guarantees",
        "Advanced security"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Features That Transform Your Freight Operations
          </h1>

          <p className="text-xl text-gray-300">
            Everything you need to automate documentation, improve efficiency, and scale your brokerage
          </p>
        </div>

        {/* Core Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {coreFeatures.map((feature, index) => (
            <div key={index} className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl hover:bg-purple-900/40 transition-all">
              <feature.icon className="h-10 w-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-300 mb-4">{feature.description}</p>
              <ul className="space-y-2">
                {feature.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                    <ChevronRight className="h-4 w-4 text-purple-500 mt-0.5" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Use Cases Section */}
        <div className="py-20 border-t border-purple-800/30">
          <h2 className="text-3xl font-bold text-center mb-12">
            Built for Every Type of Freight Brokerage
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <div key={index} className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl">
                <h3 className="text-xl font-semibold mb-2">{useCase.title}</h3>
                <p className="text-gray-400 mb-4">{useCase.description}</p>
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Security Section */}
        <div className="py-20 border-t border-purple-800/30">
          <div className="max-w-4xl mx-auto text-center">
            <Lock className="h-12 w-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Security</h2>
            <p className="text-xl text-gray-300 mb-8">
              Your data is protected with industry-leading security measures
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 bg-purple-900/20 rounded-lg">
                <h3 className="font-semibold mb-2">SOC 2 Compliant</h3>
                <p className="text-sm text-gray-400">Audited security controls</p>
              </div>
              <div className="p-4 bg-purple-900/20 rounded-lg">
                <h3 className="font-semibold mb-2">256-bit Encryption</h3>
                <p className="text-sm text-gray-400">End-to-end data protection</p>
              </div>
              <div className="p-4 bg-purple-900/20 rounded-lg">
                <h3 className="font-semibold mb-2">GDPR Compliant</h3>
                <p className="text-sm text-gray-400">Privacy by design</p>
              </div>
            </div>
          </div>
        </div>

        {/* Integration Section */}
        <div className="py-20 border-t border-purple-800/30">
          <div className="max-w-4xl mx-auto text-center">
            <Globe className="h-12 w-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Integrates With Your Existing Tools</h2>
            <p className="text-xl text-gray-300 mb-8">
              LoadVoice works seamlessly with the tools you already use
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['DAT', 'Truckstop', 'McLeod', 'TMW', 'Salesforce', 'QuickBooks', 'Outlook', 'Gmail'].map((tool, index) => (
                <div key={index} className="p-4 bg-purple-900/20 rounded-lg">
                  <p className="font-semibold">{tool}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="py-20 border-t border-purple-800/30">
          <div className="max-w-4xl mx-auto text-center">
            <Headphones className="h-12 w-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">World-Class Support</h2>
            <p className="text-xl text-gray-300 mb-8">
              Our team is here to help you succeed
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4">
                <h3 className="font-semibold mb-2">24/7 Support</h3>
                <p className="text-sm text-gray-400">Always available when you need us</p>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">Onboarding</h3>
                <p className="text-sm text-gray-400">Personal setup assistance</p>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">Training</h3>
                <p className="text-sm text-gray-400">Regular webinars and resources</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Ready to See LoadVoice in Action?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Start with 60 minutes free every month, no credit card required
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}