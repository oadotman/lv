import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Award, Target, Users, Zap, Shield, Globe, Heart } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About LoadVoice - Empowering Freight Brokers with AI Technology',
  description: 'Learn how LoadVoice is revolutionizing freight brokerage with AI-powered call documentation. Our mission is to save brokers 12+ hours per week through intelligent automation.',
  keywords: [
    'LoadVoice company',
    'freight technology company',
    'logistics software company',
    'about LoadVoice',
    'freight broker automation',
    'transportation technology'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/about'
  },
  openGraph: {
    title: 'About LoadVoice - The Future of Freight Documentation',
    description: 'Discover how LoadVoice is transforming freight brokerage operations with AI-powered call documentation and automation.',
    url: 'https://loadvoice.com/about',
    siteName: 'LoadVoice',
    images: [
      {
        url: 'https://loadvoice.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'About LoadVoice',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About LoadVoice - Empowering Freight Brokers',
    description: 'Learn how LoadVoice saves freight brokers 12+ hours per week with AI-powered documentation.',
    images: ['https://loadvoice.com/og-image.png'],
  },
}

export default function AboutPage() {
  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "Empowering freight brokers to focus on relationships, not paperwork"
    },
    {
      icon: Zap,
      title: "Innovation First",
      description: "Leveraging cutting-edge AI to solve real industry problems"
    },
    {
      icon: Users,
      title: "Customer-Centric",
      description: "Built by freight professionals, for freight professionals"
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description: "Your data security and privacy are our top priorities"
    }
  ]

  const stats = [
    { number: "500+", label: "Active Brokers" },
    { number: "1M+", label: "Calls Processed" },
    { number: "12hrs", label: "Saved Weekly" },
    { number: "98%", label: "Accuracy Rate" }
  ]

  const team = [
    {
      name: "John Smith",
      role: "CEO & Co-Founder",
      bio: "Former freight broker with 15 years experience"
    },
    {
      name: "Sarah Johnson",
      role: "CTO & Co-Founder",
      bio: "AI researcher and logistics technology expert"
    },
    {
      name: "Mike Chen",
      role: "VP of Product",
      bio: "Product leader from leading TMS companies"
    },
    {
      name: "Lisa Davis",
      role: "VP of Customer Success",
      bio: "20+ years in freight and logistics operations"
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

          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            About LoadVoice
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl">
            We're on a mission to revolutionize freight brokerage by eliminating manual documentation
            and empowering brokers to focus on what matters most - building relationships and moving freight.
          </p>
        </div>

        {/* Story Section */}
        <section className="py-16 border-t border-purple-800/30">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                LoadVoice was born from frustration. Our founders spent years in freight brokerage,
                watching talented brokers waste hours every day on manual data entry and documentation.
              </p>
              <p>
                In 2023, we set out to solve this problem using the latest advances in AI and voice
                recognition technology. The result is LoadVoice - a platform that automatically captures
                and documents every important detail from freight calls.
              </p>
              <p>
                Today, we're proud to serve over 500 freight brokers who save an average of 12 hours
                per week using our platform. But we're just getting started. Our vision is to become
                the intelligent operating system for every freight brokerage in America.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 border-t border-purple-800/30">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
                <value.icon className="h-10 w-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-gray-300">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-t border-purple-800/30">
          <h2 className="text-3xl font-bold text-center mb-12">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-purple-400">{stat.number}</div>
                <div className="text-gray-300 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 border-t border-purple-800/30">
          <h2 className="text-3xl font-bold text-center mb-12">Leadership Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <div key={index} className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl text-center">
                <div className="w-24 h-24 bg-purple-600 rounded-full mx-auto mb-4" />
                <h3 className="text-xl font-semibold">{member.name}</h3>
                <p className="text-purple-400 mb-2">{member.role}</p>
                <p className="text-sm text-gray-300">{member.bio}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Investors Section */}
        <section className="py-16 border-t border-purple-800/30">
          <h2 className="text-3xl font-bold text-center mb-12">Backed by Industry Leaders</h2>
          <div className="flex flex-wrap justify-center gap-8">
            {['Sequoia Capital', 'Y Combinator', 'Bessemer Venture Partners', 'Convoy Ventures'].map((investor, index) => (
              <div key={index} className="px-6 py-3 bg-purple-900/30 border border-purple-700/30 rounded-lg">
                <p className="font-semibold">{investor}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Awards Section */}
        <section className="py-16 border-t border-purple-800/30">
          <div className="text-center">
            <Award className="h-12 w-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-8">Recognition & Awards</h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="p-4 bg-purple-900/30 rounded-lg">
                <p className="font-semibold">FreightTech 100</p>
                <p className="text-sm text-gray-400">2024 Winner</p>
              </div>
              <div className="p-4 bg-purple-900/30 rounded-lg">
                <p className="font-semibold">Best New Software</p>
                <p className="text-sm text-gray-400">Logistics Tech Awards</p>
              </div>
              <div className="p-4 bg-purple-900/30 rounded-lg">
                <p className="font-semibold">Top 50 Startups</p>
                <p className="text-sm text-gray-400">Transport Topics</p>
              </div>
            </div>
          </div>
        </section>

        {/* Career CTA */}
        <section className="py-16 border-t border-purple-800/30">
          <div className="text-center max-w-3xl mx-auto">
            <Heart className="h-12 w-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Join Our Mission</h2>
            <p className="text-xl text-gray-300 mb-8">
              We're always looking for talented people who share our passion for transforming freight brokerage.
            </p>
            <Link href="/careers">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600">
                View Open Positions
              </Button>
            </Link>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="text-center py-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Brokerage?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join 500+ freight brokers saving 12+ hours per week
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                Contact Sales
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}