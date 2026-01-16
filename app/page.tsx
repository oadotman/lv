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
  title: 'LoadVoice - Automatic Call Documentation for Freight Brokers & 3PLs',
  description: 'LoadVoice automatically captures load details, rates, and carrier information from every broker-carrier call. Forward your calls. Talk normally. Your CRM updates itself. Setup in 2 minutes.',
  keywords: [
    'freight broker call documentation',
    'freight broker automation',
    '3PL call recording',
    'carrier vetting automation',
    'load documentation software',
    'freight broker CRM automation',
    'FMCSA carrier verification',
    'automated rate confirmation',
    'broker TMS integration',
    'freight call tracking'
  ],
  alternates: {
    canonical: 'https://loadvoice.com'
  },
  openGraph: {
    title: 'LoadVoice - Automatic Call Documentation for Freight Brokers & 3PLs',
    description: 'Automatically capture load details, rates, and carrier info from every call. No data entry. No workflow changes.',
    url: 'https://loadvoice.com',
    siteName: 'LoadVoice',
    images: [
      {
        url: 'https://loadvoice.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'LoadVoice - Freight Broker Call Automation',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LoadVoice - Freight Broker Call Automation',
    description: 'Stop doing manual call notes. Forward calls to LoadVoice and let AI handle documentation.',
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
      description: "Load details, carrier info, and rates extracted - ready in your CRM instantly",
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
      title: "Real-Time Processing",
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
      role: "Freight Broker Owner",
      company: "Express Logistics LLC",
      content: "I used to spend 2 hours every night entering load details from calls. Now LoadVoice does it automatically while I'm negotiating rates. We're booking 40% more loads with the same team.",
      savings: "15 hours/week saved",
      loads: "250+ loads/month"
    },
    {
      name: "Sarah Chen",
      role: "3PL Operations Manager",
      company: "Global Freight Solutions",
      content: "Every carrier call now includes automatic FMCSA verification and insurance checks. Rate cons are ready before we hang up. This eliminated our entire manual documentation process.",
      savings: "40% more loads handled",
      loads: "500+ loads/month"
    },
    {
      name: "Tom Williams",
      role: "Senior Freight Broker",
      company: "Midwest Transport Brokers",
      content: "LoadVoice captures pickup/delivery details, equipment types, and rates perfectly every time. My dispatchers can focus on moving freight instead of data entry.",
      savings: "$8,000/month saved",
      loads: "350+ loads/month"
    }
  ]

  const pricingPlans = [
    {
      name: "Solo Broker",
      price: "$0",
      description: "Perfect for testing with real loads",
      minutes: 60,
      loads: "~5 loads/month",
      features: [
        "Your own broker phone number",
        "60 minutes free every month",
        "All load details captured",
        "Carrier FMCSA verification",
        "Rate confirmation ready",
        "CRM/TMS integration",
        "Email support"
      ]
    },
    {
      name: "Brokerage Team",
      price: "$199",
      description: "For active freight brokerages",
      minutes: 1500,
      loads: "~125 loads/month",
      features: [
        "1,500 minutes/month",
        "3 broker phone numbers",
        "3 team members",
        "Load assignment routing",
        "Real-time rate alerts",
        "Carrier compliance checks",
        "Priority support",
        "Overage: $0.20/min"
      ],
      popular: true
    },
    {
      name: "3PL Enterprise",
      price: "$999",
      description: "For high-volume 3PLs",
      minutes: 15000,
      loads: "~1,250 loads/month",
      features: [
        "15,000 minutes/month",
        "Unlimited broker numbers",
        "20+ team members",
        "Custom TMS integration",
        "API for load data",
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

        {/* Hero Section - FREIGHT BROKER FOCUSED */}
        <section className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center space-y-6">
              <Badge className="bg-green-800/30 text-green-300 border-green-700 animate-pulse">
                <PhoneForwarded className="h-3 w-3 mr-1" />
                For Freight Brokers & 3PLs
              </Badge>

              <h1 className="text-5xl md:text-7xl font-bold">
                <span className="text-white">
                  Automatic Call Documentation for
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Freight Brokers & 3PLs
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto">
                LoadVoice listens in the background and automatically captures load details, rates, and carrier information from every broker-carrier call —
                <span className="text-purple-400 font-semibold"> with zero data entry and no workflow changes.</span>
              </p>

              <p className="text-lg text-gray-400">
                Forward your calls. Talk normally. Your CRM updates itself.
              </p>

              {/* PRIMARY CTA - GET YOUR NUMBER */}
              <div className="pt-8 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup">
                    <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-lg px-10 py-7 shadow-lg shadow-green-500/30">
                      <PhoneForwarded className="mr-2 h-6 w-6" />
                      Get Your LoadVoice Number
                    </Button>
                  </Link>
                  <Link href="#how-it-works">
                    <Button size="lg" variant="outline" className="text-lg px-8 py-7 border-purple-500/50 hover:bg-purple-900/30">
                      <HelpCircle className="mr-2 h-5 w-5" />
                      See How It Works
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Setup in 2 minutes
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Works with any phone system
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    FMCSA checks included
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    No credit card
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* NEW FIRST SECTION - Stop Doing Manual Call Notes */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Stop Doing Manual Call Notes After Every Load
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Every day, freight brokers and 3PL teams spend hours:
              </p>
            </div>

            {/* Pain Points Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-gray-300">Re-typing load details after carrier calls</p>
              </div>
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-gray-300">Copying rates and lane info into their CRM</p>
              </div>
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-gray-300">Verifying carriers in FMCSA mid-call</p>
              </div>
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
                <p className="text-gray-300">Fixing missed or incomplete documentation</p>
              </div>
            </div>

            <div className="text-center mb-12">
              <p className="text-2xl font-bold text-purple-400">
                LoadVoice eliminates all of that — automatically.
              </p>
            </div>

            {/* 3-Step Broker Process */}
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-8 text-center">How LoadVoice Works</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-2 text-white font-bold">1</div>
                    <h4 className="text-xl font-semibold">Get Your LoadVoice Number</h4>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Instantly receive a dedicated phone number for your brokerage or 3PL. Takes 30 seconds.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-2 text-white font-bold">2</div>
                    <h4 className="text-xl font-semibold">Forward Carrier & Shipper Calls</h4>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Forward calls from your existing line or use LoadVoice directly — no new system to learn.
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Works with your existing phone system — no new hardware required.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-2 text-white font-bold">3</div>
                    <h4 className="text-xl font-semibold">Calls Are Documented Automatically</h4>
                  </div>
                  <p className="text-gray-300 text-sm">
                    While you negotiate rates, LoadVoice documents the call in real time:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Load details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Carrier info</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Rates & lanes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>FMCSA verification</span>
                    </li>
                  </ul>
                  <p className="text-green-400 text-sm font-semibold mt-2">
                    All ready for your CRM — before you hang up.
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Link href="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600">
                    <PhoneForwarded className="mr-2 h-5 w-5" />
                    Get Your LoadVoice Number
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

        {/* Built for Real Freight Brokers Section - MOVED UP AND ENHANCED */}
        <section className="py-20 px-6 bg-gradient-to-b from-black/30 to-purple-950/50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge className="bg-purple-800/30 text-purple-300 border-purple-700 mb-4">
                <Users className="h-3 w-3 mr-1" />
                Trusted by 500+ Freight Brokers & 3PLs
              </Badge>
              <h2 className="text-4xl font-bold mb-4">
                Built for How Freight Brokers Actually Work
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                No uploads. No typing. No missed load details.<br/>
                Just forward broker-carrier calls and move on to the next load.
              </p>
              <p className="text-lg text-gray-400 mt-4">
                LoadVoice uses AI to extract structured load data from live freight calls in real time.
              </p>
            </div>

            {/* Broker-Specific Features */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <div className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl hover:border-purple-600/50 transition-colors">
                <Package className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Load Details Captured</h3>
                <p className="text-gray-300">Origin, destination, equipment type, commodity — all extracted automatically from your calls.</p>
              </div>
              <div className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl hover:border-purple-600/50 transition-colors">
                <TrendingUp className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Rate Confirmation Ready</h3>
                <p className="text-gray-300">Rates, lanes, and terms captured in real-time. Rate cons generated before you hang up.</p>
              </div>
              <div className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl hover:border-purple-600/50 transition-colors">
                <Shield className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">FMCSA Verification</h3>
                <p className="text-gray-300">Carrier MC numbers checked automatically. Insurance and authority verified during calls.</p>
              </div>
              <div className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl hover:border-purple-600/50 transition-colors">
                <Clock className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">12 Minutes Saved Per Load</h3>
                <p className="text-gray-300">Average time saved on documentation per load. That's 15+ hours weekly for active brokers.</p>
              </div>
              <div className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl hover:border-purple-600/50 transition-colors">
                <PhoneForwarded className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Works With Your Phone</h3>
                <p className="text-gray-300">Keep your existing number. Forward calls or use LoadVoice directly. No new system to learn.</p>
              </div>
              <div className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl hover:border-purple-600/50 transition-colors">
                <FileText className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">CRM Updates Itself</h3>
                <p className="text-gray-300">Integrates with your TMS/CRM. Load data flows automatically — no manual entry required.</p>
              </div>
            </div>

            {/* Broker-Specific CTA */}
            <div className="text-center p-8 bg-purple-900/30 rounded-xl border border-purple-700/50">
              <p className="text-2xl font-bold mb-4 text-purple-400">
                Stop typing. Start closing more loads.
              </p>
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400">
                  <PhoneForwarded className="mr-2 h-5 w-5" />
                  Get Your LoadVoice Number
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials Section - Broker Focused */}
        <section className="py-20 px-6 bg-black/30">
          <div className="container mx-auto max-w-6xl">
            {/* Raw Quote */}
            <div className="text-center mb-12">
              <p className="text-3xl font-bold text-white italic mb-2">
                "I stopped doing call notes on day one."
              </p>
              <p className="text-gray-400">
                — Freight Broker, Chicago
              </p>
            </div>

            <h2 className="text-4xl font-bold text-center mb-4">
              Freight Brokers Save 15+ Hours Every Week
            </h2>
            <p className="text-xl text-gray-300 text-center mb-12">
              Join 500+ brokers who've eliminated manual call documentation
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="p-6 bg-purple-900/20 border border-purple-700/30 rounded-xl">
                  <div className="flex gap-2 mb-4">
                    <Badge className="bg-green-800/30 text-green-300 border-green-700">
                      {testimonial.savings}
                    </Badge>
                    <Badge className="bg-purple-800/30 text-purple-300 border-purple-700">
                      {testimonial.loads}
                    </Badge>
                  </div>
                  <p className="text-gray-300 mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-400">{testimonial.role}</p>
                    <p className="text-sm text-gray-500">{testimonial.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section - Broker Focused */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Pricing Built for Freight Brokers
              </h2>
              <p className="text-xl text-gray-300">
                Start free. Scale as your brokerage grows. Cancel anytime.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => (
                <div key={index} className={`relative p-6 bg-purple-900/20 border rounded-xl ${plan.popular ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-purple-700/30'}`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular for Brokers
                    </span>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold mb-1">{plan.price}<span className="text-lg text-gray-400">/month</span></p>
                  <p className="text-gray-400 mb-1">{plan.minutes.toLocaleString()} minutes included</p>
                  <p className="text-purple-400 text-sm mb-2">{plan.loads}</p>
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
                      Get Your LoadVoice Number
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center p-6 bg-purple-900/20 rounded-xl border border-purple-700/30">
              <p className="text-lg text-gray-300">
                <span className="font-bold text-purple-400">Average call duration:</span> 12 minutes for load booking
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Most brokers use 1,200-1,500 minutes/month (100-125 loads)
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section - Broker Urgency */}
        <section className="py-20 px-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50">
          <div className="container mx-auto max-w-4xl text-center">
            <Badge className="bg-yellow-800/30 text-yellow-300 border-yellow-700 mb-6">
              <Timer className="h-3 w-3 mr-1" />
              Average broker saves 12 minutes per load
            </Badge>
            <h2 className="text-4xl font-bold mb-6">
              Other Brokers Are Booking More Loads While You're Typing
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Every carrier call without LoadVoice means 12 minutes of manual documentation.<br/>
              That's 3-4 extra loads you could be booking every day.
            </p>
            <div className="bg-purple-900/30 rounded-xl p-6 mb-8 border border-purple-700/50">
              <p className="text-lg font-semibold text-purple-400 mb-2">
                Quick Math for Active Brokers:
              </p>
              <p className="text-gray-300">
                20 calls/day × 12 minutes saved = <span className="text-green-400 font-bold">4 hours daily</span><br/>
                4 hours × $150/hour opportunity cost = <span className="text-green-400 font-bold">$600/day lost to data entry</span>
              </p>
            </div>
            <div className="space-y-4">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-lg px-10 py-7 shadow-lg shadow-green-500/30">
                  <PhoneForwarded className="mr-2 h-6 w-6" />
                  Start Saving 12 Minutes Per Load Now
                </Button>
              </Link>
              <p className="text-gray-400 text-sm">
                Setup in 2 minutes • 60 free minutes • No credit card required
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