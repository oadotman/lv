import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, MapPin, MessageCircle, Clock, Calendar, Headphones } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact LoadVoice - Get Support & Sales Information',
  description: 'Contact LoadVoice for sales inquiries, customer support, or partnership opportunities. Available 24/7 via email, phone, or live chat. Get started with freight call automation today.',
  keywords: [
    'contact LoadVoice',
    'LoadVoice support',
    'freight CRM help',
    'LoadVoice sales',
    'customer service',
    'technical support'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/contact'
  },
  openGraph: {
    title: 'Contact LoadVoice - We\'re Here to Help',
    description: 'Get in touch with LoadVoice for sales, support, or partnership inquiries. Our team is ready to help you transform your freight operations.',
    url: 'https://loadvoice.com/contact',
    siteName: 'LoadVoice',
    images: [
      {
        url: 'https://loadvoice.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Contact LoadVoice',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact LoadVoice - Sales & Support',
    description: 'Get in touch with LoadVoice. Available 24/7 to help transform your freight brokerage.',
    images: ['https://loadvoice.com/og-image.png'],
  },
}

export default function ContactPage() {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      description: "Get a response within 24 hours",
      action: "support@loadvoice.com",
      cta: "Send Email"
    },
    {
      icon: Phone,
      title: "Call Us",
      description: "Mon-Fri 8am-6pm EST",
      action: "1-555-LOADVOICE",
      cta: "Call Now"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Available 24/7",
      action: "Start chat",
      cta: "Open Chat"
    },
    {
      icon: Calendar,
      title: "Schedule Demo",
      description: "See LoadVoice in action",
      action: "Book 30-min demo",
      cta: "Book Demo"
    }
  ]

  const departments = [
    {
      name: "Sales",
      email: "sales@loadvoice.com",
      description: "New accounts and pricing questions"
    },
    {
      name: "Support",
      email: "support@loadvoice.com",
      description: "Technical help and account issues"
    },
    {
      name: "Partnerships",
      email: "partners@loadvoice.com",
      description: "Integration and partnership opportunities"
    },
    {
      name: "Media",
      email: "press@loadvoice.com",
      description: "Press inquiries and media requests"
    }
  ]

  const faqs = [
    {
      question: "What are your support hours?",
      answer: "Our support team is available Monday-Friday 8am-6pm EST. Live chat is available 24/7."
    },
    {
      question: "How quickly can I get started?",
      answer: "You can start using LoadVoice immediately after signing up. Most users are fully operational within 15 minutes."
    },
    {
      question: "Do you offer phone support?",
      answer: "Yes! Phone support is available for all paid plans during business hours."
    },
    {
      question: "Can I schedule a personalized demo?",
      answer: "Absolutely! Click the 'Book Demo' button above to schedule a 30-minute personalized demo."
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
            Get in Touch
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl">
            Have questions about LoadVoice? Our team is here to help you transform your freight operations.
          </p>
        </div>

        {/* Contact Methods Grid */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {contactMethods.map((method, index) => (
            <div key={index} className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl hover:bg-purple-900/40 transition-all">
              <method.icon className="h-10 w-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{method.title}</h3>
              <p className="text-gray-400 text-sm mb-3">{method.description}</p>
              <p className="text-purple-300 font-medium mb-4">{method.action}</p>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                {method.cta}
              </Button>
            </div>
          ))}
        </section>

        {/* Contact Form Section */}
        <section className="grid lg:grid-cols-2 gap-12 py-16 border-t border-purple-800/30">
          <div>
            <h2 className="text-3xl font-bold mb-6">Send Us a Message</h2>
            <p className="text-gray-300 mb-8">
              Fill out the form and our team will get back to you within 24 hours.
            </p>

            {/* Contact Form (Server-rendered structure) */}
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    className="w-full px-4 py-2 bg-purple-900/30 border border-purple-700/30 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    className="w-full px-4 py-2 bg-purple-900/30 border border-purple-700/30 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-700/30 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium mb-2">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-700/30 rounded-lg focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  required
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-700/30 rounded-lg focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select a subject</option>
                  <option value="sales">Sales Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="demo">Request Demo</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  required
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-700/30 rounded-lg focus:outline-none focus:border-purple-500"
                ></textarea>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                Send Message
              </Button>
            </form>
          </div>

          {/* Department Contacts */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Department Contacts</h2>
            <div className="space-y-4 mb-12">
              {departments.map((dept, index) => (
                <div key={index} className="p-4 bg-purple-900/30 border border-purple-700/30 rounded-lg">
                  <h3 className="font-semibold mb-1">{dept.name}</h3>
                  <p className="text-purple-300 text-sm mb-1">{dept.email}</p>
                  <p className="text-gray-400 text-sm">{dept.description}</p>
                </div>
              ))}
            </div>

            {/* Office Location */}
            <div className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
              <MapPin className="h-8 w-8 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Office Location</h3>
              <address className="text-gray-300 not-italic">
                LoadVoice, Inc.<br />
                123 Innovation Drive<br />
                Suite 400<br />
                Austin, TX 78701<br />
                United States
              </address>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 border-t border-purple-800/30">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 bg-purple-900/30 border border-purple-700/30 rounded-xl">
                <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Support Hours */}
        <section className="py-16 border-t border-purple-800/30">
          <div className="text-center max-w-3xl mx-auto">
            <Clock className="h-12 w-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-6">Support Hours</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 bg-purple-900/30 rounded-lg">
                <h3 className="font-semibold mb-2">Phone Support</h3>
                <p className="text-sm text-gray-400">Mon-Fri 8am-6pm EST</p>
              </div>
              <div className="p-4 bg-purple-900/30 rounded-lg">
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-sm text-gray-400">24-hour response time</p>
              </div>
              <div className="p-4 bg-purple-900/30 rounded-lg">
                <h3 className="font-semibold mb-2">Live Chat</h3>
                <p className="text-sm text-gray-400">Available 24/7</p>
              </div>
            </div>
          </div>
        </section>

        {/* Emergency Support */}
        <section className="text-center py-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl">
          <Headphones className="h-12 w-12 text-white mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            Need Immediate Assistance?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Our support team is standing by to help you succeed
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              Start Live Chat
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
              Call Support
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}