import { Metadata } from 'next'
import Link from 'next/link'
import {
  Brain,
  Phone,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Calendar,
  Check,
  Clock,
  Shield,
  MapPin,
  Package,
  Users,
  TrendingUp,
  PhoneForwarded,
  HelpCircle,
  Timer,
  AlertTriangle,
  Zap,
  PhoneCall,
  FileText,
  CheckCircle,
  Upload,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'LoadVoice - Automatic Call Forwarding & AI Documentation for Freight Brokers',
  description: 'Forward your freight calls to LoadVoice and get instant AI-powered documentation. No manual uploads, no data entry. Every call automatically captured, transcribed, and processed into actionable CRM data.',
  keywords: [
    'freight broker call forwarding',
    'automatic call recording',
    'twilio freight integration',
    'voice AI for logistics',
    'automated freight documentation',
    'broker phone system',
    'freight CRM automation',
    'carrier call tracking',
    'load documentation software',
    'transportation call center'
  ],
  alternates: {
    canonical: 'https://loadvoice.com'
  },
  openGraph: {
    title: 'LoadVoice - Automatic Call Documentation for Freight Brokers',
    description: 'Forward your calls to LoadVoice. Every conversation automatically documented with AI. No manual work required.',
    url: 'https://loadvoice.com',
    siteName: 'LoadVoice',
    images: [
      {
        url: 'https://loadvoice.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LoadVoice - Automatic Call Forwarding for Freight',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LoadVoice - Automatic Call Documentation',
    description: 'Forward your calls. Get instant documentation. No manual work.',
    images: ['https://loadvoice.com/og-image.png'],
    creator: '@loadvoice',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// Server Component - Renders on the server for SEO
export default function HomePage() {
  // How it works steps
  const howItWorks = [
    {
      step: "1",
      title: "Get Your LoadVoice Number",
      description: "Sign up and instantly receive a dedicated phone number in your area code",
      icon: Phone,
      time: "30 seconds"
    },
    {
      step: "2",
      title: "Forward Your Calls",
      description: "Set up call forwarding from your business line or use LoadVoice number directly",
      icon: PhoneForwarded,
      time: "2 minutes"
    },
    {
      step: "3",
      title: "Talk Naturally",
      description: "Continue your freight conversations as normal - LoadVoice listens in the background",
      icon: PhoneCall,
      time: "Automatic"
    },
    {
      step: "4",
      title: "Get Instant Documentation",
      description: "AI extracts load details, carrier info, and rates - ready in your CRM instantly",
      icon: FileText,
      time: "Real-time"
    }
  ]

  // Features specifically for Twilio forwarding
  const forwardingFeatures = [
    {
      icon: Zap,
      title: "Instant Setup",
      description: "Get your LoadVoice number in 30 seconds. Works with any phone system."
    },
    {
      icon: Shield,
      title: "Two-Party Consent",
      description: "Automatic recording disclosure for compliance in all 50 states"
    },
    {
      icon: Brain,
      title: "Real-Time AI Processing",
      description: "Load details extracted while you're still on the call"
    },
    {
      icon: CheckCircle,
      title: "Carrier Verification",
      description: "Automatic FMCSA checks and carrier vetting during calls"
    },
    {
      icon: Clock,
      title: "Zero Manual Work",
      description: "No uploads, no data entry. Everything happens automatically"
    },
    {
      icon: Settings,
      title: "Smart Call Routing",
      description: "Business hours, team routing, and overflow handling built-in"
    }
  ]

  const testimonials = [
    {
      name: "Mike Johnson",
      role: "Owner",
      company: "Express Logistics LLC",
      content: "We just forward our calls to LoadVoice and everything gets documented. It's like having a full-time data entry team that never makes mistakes.",
      savings: "15 hours/week saved"
    },
    {
      name: "Sarah Chen",
      role: "Operations Manager",
      company: "Global Freight Solutions",
      content: "Setup took 2 minutes. Now every carrier call is automatically vetted, documented, and added to our CRM. This is what automation should be.",
      savings: "40% more loads handled"
    },
    {
      name: "Tom Williams",
      role: "Senior Broker",
      company: "Midwest Transport Brokers",
      content: "I was skeptical about AI, but LoadVoice just works. I forward my calls, talk normally, and check my CRM later - everything's there.",
      savings: "$8,000/month saved"
    }
  ]

  const pricingPlans = [
    {
      name: "Free Trial",
      price: "$0",
      description: "Test with your real calls",
      minutes: 60,
      features: [
        "Your own LoadVoice number",
        "60 minutes free every month",
        "Instant call forwarding setup",
        "AI transcription & extraction",
        "Carrier verification (FMCSA)",
        "Email support"
      ]
    },
    {
      name: "Team",
      price: "$199",
      description: "For growing brokerages",
      minutes: 1500,
      features: [
        "1,500 minutes/month",
        "3 LoadVoice numbers",
        "3 team members",
        "Smart call routing",
        "Real-time notifications",
        "Priority support",
        "Overage: $0.20/min"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$999",
      description: "For established operations",
      minutes: 15000,
      features: [
        "15,000 minutes/month",
        "Unlimited numbers",
        "20+ team members",
        "Custom call flows",
        "API access",
        "White-label options",
        "Dedicated success manager",
        "Overage: $0.15/min"
      ]
    }
  ]

  return (
    <>
      {/* SEO-Optimized Content (Server-Rendered) */}
      <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black text-white">

        {/* Navigation - Static for SEO */}
        <nav className="fixed top-0 w-full z-50 bg-purple-950/95 backdrop-blur-lg border-b border-purple-800/30">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
                  <PhoneForwarded className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  LoadVoice
                </span>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <Link href="/features" className="text-gray-300 hover:text-white">Features</Link>
                <Link href="/pricing" className="text-gray-300 hover:text-white">Pricing</Link>
                <Link href="/how-it-works" className="text-gray-300 hover:text-white">How It Works</Link>
                <Link href="/blog" className="text-gray-300 hover:text-white">Blog</Link>
                <Link href="/login">
                  <Button variant="ghost" className="text-white">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                    Get Your Number
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section - COMPLETELY REDESIGNED FOR TWILIO FOCUS */}
        <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center space-y-6">
              <Badge className="bg-green-800/30 text-green-300 border-green-700 animate-pulse">
                <PhoneForwarded className="h-3 w-3 mr-1" />
                Setup in 2 minutes • No tech skills needed
              </Badge>

              <h1 className="text-5xl md:text-7xl font-bold">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Forward Your Calls.
                </span>
                <br />
                <span className="text-white">
                  Get Instant Documentation.
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
                LoadVoice gives you a phone number that automatically captures every freight conversation.
                <span className="text-purple-400 font-semibold"> No uploads. No manual work.</span> Just forward your calls
                and let AI handle the documentation.
              </p>

              {/* PRIMARY CTA - GET YOUR NUMBER */}
              <div className="pt-8 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup">
                    <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-lg px-10 py-7 shadow-lg shadow-green-500/30">
                      <PhoneForwarded className="mr-2 h-6 w-6" />
                      Get Your LoadVoice Number Now
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="lg" variant="outline" className="text-lg px-8 py-7 border-purple-500/50 hover:bg-purple-900/30">
                      <HelpCircle className="mr-2 h-5 w-5" />
                      See How It Works
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Setup in 2 minutes
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    60 minutes free
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    No credit card
                  </span>
                </div>
              </div>

              {/* SECONDARY - Manual Upload (de-emphasized) */}
              <div className="pt-12 border-t border-purple-800/30 mt-12">
                <p className="text-gray-500 text-sm mb-3">Already have recordings?</p>
                <Link href="/calls/new">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-300">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload existing calls
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section - CRITICAL FOR TWILIO UNDERSTANDING */}
        <section id="how-it-works" className="py-20 px-6 bg-purple-900/20">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                From Setup to Documentation in Minutes
              </h2>
              <p className="text-xl text-gray-300">
                No IT team needed. No complex integrations. Just forward and forget.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {howItWorks.map((item, index) => (
                <div key={index} className="relative">
                  <div className="text-center space-y-4">
                    <div className="relative mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                      <item.icon className="h-10 w-10 text-white" />
                      <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        {item.time}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="text-gray-300 text-sm">{item.description}</p>
                  </div>
                  {index < howItWorks.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-10 -right-3 h-6 w-6 text-purple-500" />
                  )}
                </div>
              ))}
            </div>

            {/* Live Demo Number */}
            <div className="mt-16 p-8 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl border border-purple-700/50">
              <div className="text-center space-y-4">
                <Badge className="bg-green-500/20 text-green-300 border-green-500">
                  <Phone className="h-3 w-3 mr-1 animate-pulse" />
                  Try It Now - Live Demo
                </Badge>
                <h3 className="text-2xl font-bold">Call Our Demo Line</h3>
                <p className="text-3xl font-mono text-purple-400">1-800-LOADVOICE</p>
                <p className="text-gray-300">
                  Experience LoadVoice instantly. Call our demo line, have a freight conversation,
                  and see your call documented in real-time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Forwarding Features Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Built for Real Freight Brokers
              </h2>
              <p className="text-xl text-gray-300">
                Not another app to learn. LoadVoice works with how you already work.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forwardingFeatures.map((feature, index) => (
                <div key={index} className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl hover:border-purple-600/50 transition-colors">
                  <feature.icon className="h-10 w-10 text-purple-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 px-6 bg-black/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-4xl font-bold text-center mb-12">
              Brokers Save 15+ Hours Every Week
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl">
                  <div className="mb-4">
                    <Badge className="bg-green-800/30 text-green-300 border-green-700">
                      {testimonial.savings}
                    </Badge>
                  </div>
                  <p className="text-gray-300 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-400">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Start Free, Scale As You Grow
              </h2>
              <p className="text-xl text-gray-300">
                Get your LoadVoice number today. No credit card required.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => (
                <div key={index} className={`relative p-6 bg-purple-900/20 border rounded-xl ${plan.popular ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-purple-700/30'}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold mb-1">{plan.price}<span className="text-lg text-gray-400">/month</span></p>
                  <p className="text-gray-400 mb-2">{plan.minutes.toLocaleString()} minutes included</p>
                  <p className="text-sm text-gray-500 mb-6">{plan.description}</p>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                      Get Your Number
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
          <div className="container mx-auto max-w-4xl text-center">
            <Badge className="bg-yellow-800/30 text-yellow-300 border-yellow-700 mb-6">
              <Timer className="h-3 w-3 mr-1" />
              Average setup time: 2 minutes 14 seconds
            </Badge>
            <h2 className="text-4xl font-bold mb-6">
              Your Competitors Are Already Saving 15+ Hours a Week
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Every call you make without LoadVoice is 12 minutes of documentation you'll do manually.
              Get your number now and never do data entry again.
            </p>
            <div className="space-y-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-lg px-10 py-7 shadow-lg shadow-green-500/30">
                  <PhoneForwarded className="mr-2 h-6 w-6" />
                  Get Your LoadVoice Number Now
                </Button>
              </Link>
              <p className="text-gray-400 text-sm">
                Free trial • No credit card • Cancel anytime
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-purple-800/30">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2">
                  <li><Link href="/features" className="text-gray-400 hover:text-white">Features</Link></li>
                  <li><Link href="/pricing" className="text-gray-400 hover:text-white">Pricing</Link></li>
                  <li><Link href="/how-it-works" className="text-gray-400 hover:text-white">How It Works</Link></li>
                  <li><Link href="/integrations" className="text-gray-400 hover:text-white">Integrations</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2">
                  <li><Link href="/blog" className="text-gray-400 hover:text-white">Blog</Link></li>
                  <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
                  <li><Link href="/partners" className="text-gray-400 hover:text-white">Partners</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><Link href="/help" className="text-gray-400 hover:text-white">Help Center</Link></li>
                  <li><Link href="/api" className="text-gray-400 hover:text-white">API Docs</Link></li>
                  <li><Link href="/setup-guide" className="text-gray-400 hover:text-white">Setup Guide</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy</Link></li>
                  <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms</Link></li>
                  <li><Link href="/security" className="text-gray-400 hover:text-white">Security</Link></li>
                  <li><Link href="/compliance" className="text-gray-400 hover:text-white">Compliance</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-purple-800/30 text-center text-gray-400">
              <p>&copy; 2025 LoadVoice. All rights reserved. LoadVoice is owned and operated by Nikola Innovations Limited.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}