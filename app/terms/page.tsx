import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - LoadVoice | Legal Agreement',
  description: 'Read the LoadVoice Terms of Service. Understand your rights and responsibilities when using our freight broker CRM platform. Last updated January 2025.',
  keywords: [
    'LoadVoice terms of service',
    'freight CRM terms',
    'legal agreement',
    'user agreement',
    'service terms'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/terms'
  },
  openGraph: {
    title: 'Terms of Service - LoadVoice',
    description: 'Legal terms and conditions for using LoadVoice freight broker CRM platform.',
    url: 'https://loadvoice.com/terms',
    siteName: 'LoadVoice',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: false,  // Legal pages don't need to be indexed for SEO
    follow: true,
    noarchive: true,
  }
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4 border-b pb-6">
        <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
        <p className="text-gray-600">Last updated: January 21, 2025</p>
        <p className="text-sm text-gray-500">
          © 2025 Loadvoice. All rights reserved. Loadvoice is owned and operated by Nikola Innovations Limited.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none space-y-8">
        {/* 1. Agreement to Terms */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            By accessing and using Loadvoice ("Service"), you agree to be bound by these Terms of Service ("Terms").
            If you do not agree to these Terms, you may not access or use the Service.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Loadvoice is owned and operated by Nikola Innovations Limited ("Company", "we", "us", or "our").
            The Service provides AI-powered transcription and CRM data extraction from sales call recordings.
          </p>
        </section>

        {/* 2. Description of Service */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Loadvoice provides the following features:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Audio transcription of sales call recordings using AssemblyAI</li>
            <li>AI-powered extraction of CRM-relevant data using OpenAI</li>
            <li>Generation of formatted CRM outputs for copy/paste into CRM systems</li>
            <li>Call analytics and insights</li>
            <li>Template management for customized data extraction</li>
            <li>Team collaboration features (on paid plans)</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            The Service does NOT directly integrate with or sync data to any CRM system. All outputs are designed
            for manual copy/paste by the user.
          </p>
        </section>

        {/* 3. Account Registration */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            To use the Service, you must create an account by providing accurate and complete information. You are
            responsible for:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized use of your account</li>
            <li>Ensuring your account information remains accurate and up-to-date</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            You must be at least 18 years old to create an account. By creating an account, you represent and warrant
            that you meet this age requirement.
          </p>
        </section>

        {/* 4. Subscription Plans and Pricing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription Plans and Pricing</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Available Plans:</h3>
            <ul className="space-y-2 text-gray-800">
              <li><strong>Free:</strong> 1 user, 60 minutes/month, $0/month</li>
              <li><strong>Solo:</strong> 1 user, 1,500 minutes/month, $49/month</li>
              <li><strong>Team 5:</strong> 5 users, 6,000 minutes/month, $149/month</li>
              <li><strong>Team 10:</strong> 10 users, 15,000 minutes/month, $299/month</li>
              <li><strong>Enterprise:</strong> Custom users and minutes, $499/month</li>
            </ul>
          </div>
          <p className="text-gray-700 leading-relaxed mb-3">
            All paid plans include a 14-day free trial. You will not be charged until the trial period ends.
            Prices are in USD and exclude applicable taxes.
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            Subscriptions automatically renew at the end of each billing period unless cancelled. You may cancel
            your subscription at any time through your account settings.
          </p>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to modify pricing with 30 days' notice. Price changes will not affect existing
            subscribers until their next renewal date.
          </p>
        </section>

        {/* 5. Payment and Billing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Payment and Billing</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Payments are processed securely through Paddle (Paddle.com Limited), our payment processor and
            Merchant of Record. By subscribing to a paid plan, you authorize Paddle to charge your payment method
            on a recurring basis.
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            Paddle handles all payment processing, billing inquiries, VAT/sales tax collection, and invoicing.
            Your payment information is never stored on our servers.
          </p>
          <p className="text-gray-700 leading-relaxed">
            All sales are final, but we offer a 30-day money-back guarantee (see Section 6 for details).
          </p>
        </section>

        {/* 6. Refund Policy - HIGHLIGHTED */}
        <section className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-900 mb-4">6. 30-Day Money-Back Guarantee</h2>
          <p className="text-gray-800 leading-relaxed mb-3 font-semibold">
            We offer a 30-day money-back guarantee on all paid plans. If you are not satisfied with the Service
            for any reason, you may request a full refund within 30 days of your initial purchase.
          </p>
          <p className="text-gray-800 leading-relaxed mb-3">
            To request a refund:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4 mb-3">
            <li>Contact our support team at <a href="mailto:support@loadvoice.com" className="text-blue-600 underline">support@loadvoice.com</a></li>
            <li>Include your account email and subscription details</li>
            <li>Refund requests must be made within 30 days of the original purchase date</li>
          </ul>
          <p className="text-gray-800 leading-relaxed mb-3">
            Refunds are processed within 5-10 business days and will be issued to the original payment method.
            Upon refund, your account will be downgraded to the Free plan.
          </p>
          <p className="text-gray-800 leading-relaxed font-semibold">
            Note: The 30-day guarantee applies only to your first purchase of a paid plan. Renewals and
            subsequent plan upgrades are not eligible for refunds, but you may cancel at any time to prevent
            future charges.
          </p>
        </section>

        {/* 7. Usage Limits and Fair Use */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Usage Limits and Fair Use</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Each subscription plan includes a monthly allocation of transcription minutes and user seats. You agree to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Use the Service only within the limits of your subscribed plan</li>
            <li>Not abuse or attempt to circumvent usage limits</li>
            <li>Not share account credentials across multiple individuals (except for Team plan members)</li>
            <li>Not use automated scripts or bots to upload excessive content</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            Unused minutes do not roll over to the next billing period. If you exceed your monthly limit, you will
            not be able to upload additional recordings until your next billing cycle or until you upgrade your plan.
          </p>
          <p className="text-gray-700 leading-relaxed mt-3">
            We reserve the right to suspend or terminate accounts that violate fair use policies or engage in abusive behavior.
          </p>
        </section>

        {/* 8. Data Privacy and Security */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Privacy and Security</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            We take data privacy and security seriously. By using the Service, you acknowledge that:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Audio files and transcripts are stored securely in Supabase (EU-based servers available)</li>
            <li>Audio is sent to AssemblyAI for transcription</li>
            <li>Transcripts are sent to OpenAI for CRM data extraction</li>
            <li>We implement industry-standard security measures to protect your data</li>
            <li>You retain ownership of all uploaded content and extracted data</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            For full details on how we collect, use, and protect your data, please review our{' '}
            <a href="/privacy" className="text-blue-600 underline font-semibold">Privacy Policy</a>.
          </p>
        </section>

        {/* 9. User Content and Responsibilities */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. User Content and Responsibilities</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            You are solely responsible for the content you upload to the Service ("User Content"). You represent
            and warrant that:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>You own or have the necessary rights to upload and process the User Content</li>
            <li>You have obtained all necessary consents for recording and processing call recordings</li>
            <li>User Content does not violate any laws, regulations, or third-party rights</li>
            <li>User Content does not contain malware, viruses, or malicious code</li>
            <li>You comply with all applicable call recording consent laws in your jurisdiction</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3 font-semibold">
            Important: Many jurisdictions require consent from all parties before recording a phone call. It is
            your responsibility to ensure compliance with applicable call recording laws.
          </p>
          <p className="text-gray-700 leading-relaxed mt-3">
            We reserve the right to remove any User Content that violates these Terms or applicable laws.
          </p>
        </section>

        {/* 10. Intellectual Property */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            The Service, including its design, code, features, and documentation, is owned by Nikola Innovations
            Limited and protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            You retain all rights to your User Content. By uploading User Content, you grant us a limited,
            non-exclusive license to process and store your content solely for the purpose of providing the Service.
          </p>
          <p className="text-gray-700 leading-relaxed">
            You may not copy, modify, distribute, sell, or reverse engineer any part of the Service without our
            express written permission.
          </p>
        </section>

        {/* 11. Disclaimers and Limitations of Liability */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Disclaimers and Limitations of Liability</h2>
          <p className="text-gray-700 leading-relaxed mb-3 uppercase font-semibold">
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING
            BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            We do not guarantee that:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>The Service will be uninterrupted, error-free, or secure</li>
            <li>Transcriptions or data extractions will be 100% accurate</li>
            <li>AI-generated outputs will meet your specific requirements</li>
            <li>Third-party services (AssemblyAI, OpenAI) will always be available</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3 uppercase font-semibold">
            IN NO EVENT SHALL NIKOLA INNOVATIONS LIMITED BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR
            RELATED TO YOUR USE OF THE SERVICE.
          </p>
          <p className="text-gray-700 leading-relaxed mt-3">
            Our total liability to you for any claims arising from your use of the Service shall not exceed the
            amount you paid us in the 12 months preceding the claim.
          </p>
        </section>

        {/* 12. Termination */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Termination</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            You may terminate your account at any time through your account settings or by contacting support.
            Upon termination:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Your subscription will not renew at the end of the current billing period</li>
            <li>You will retain access to the Service until the end of your paid period</li>
            <li>After termination, your account will be downgraded to the Free plan (if within 30-day refund window) or deleted (if you request account deletion)</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            We reserve the right to suspend or terminate your account if you violate these Terms, engage in
            fraudulent activity, or abuse the Service. In such cases, no refunds will be issued.
          </p>
        </section>

        {/* 13. Changes to Terms */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon
            posting to this page. We will notify you of material changes via email or in-app notification. Your
            continued use of the Service after changes are posted constitutes acceptance of the modified Terms.
          </p>
        </section>

        {/* 14. Governing Law */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Governing Law and Disputes</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            These Terms shall be governed by and construed in accordance with the laws of the United Kingdom,
            without regard to its conflict of law provisions.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Any disputes arising from these Terms or your use of the Service shall be resolved through binding
            arbitration in accordance with UK arbitration rules, except where prohibited by law.
          </p>
        </section>

        {/* 15. Contact Information */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Information</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            If you have any questions about these Terms, please contact us:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800 font-semibold">Nikola Innovations Limited</p>
            <p className="text-gray-700">Email: <a href="mailto:support@loadvoice.com" className="text-blue-600 underline">support@loadvoice.com</a></p>
            <p className="text-gray-700">Website: <a href="https://loadvoice.com" className="text-blue-600 underline">https://loadvoice.com</a></p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 mt-12">
        <p className="text-sm text-gray-500 text-center">
          © 2025 Loadvoice. All rights reserved. Loadvoice is owned and operated by Nikola Innovations Limited.
        </p>
      </div>
    </div>
  );
}
