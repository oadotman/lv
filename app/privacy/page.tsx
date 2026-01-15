import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - LoadVoice | Data Protection & GDPR',
  description: 'LoadVoice Privacy Policy - Learn how we protect your freight data, ensure GDPR compliance, and maintain industry-leading security standards for your call recordings and business information.',
  keywords: [
    'LoadVoice privacy policy',
    'data protection',
    'GDPR compliance',
    'freight data security',
    'call recording privacy',
    'data processing agreement'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/privacy'
  },
  openGraph: {
    title: 'Privacy Policy - LoadVoice',
    description: 'Learn how LoadVoice protects your data and ensures compliance with GDPR and data protection regulations.',
    url: 'https://loadvoice.com/privacy',
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

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4 border-b pb-6">
        <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-gray-600">Last updated: January 21, 2025</p>
        <p className="text-sm text-gray-500">
          © 2025 Loadvoice. All rights reserved. Loadvoice is owned and operated by Nikola Innovations Limited.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none space-y-8">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Nikola Innovations Limited ("we", "us", or "our") operates Loadvoice, an AI-powered platform for
            transcribing sales call recordings and extracting CRM data. This Privacy Policy explains how we collect,
            use, disclose, and protect your personal information when you use our Service.
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            We are committed to protecting your privacy and complying with applicable data protection laws, including
            the General Data Protection Regulation (GDPR) and the UK Data Protection Act 2018.
          </p>
          <p className="text-gray-700 leading-relaxed">
            By using Loadvoice, you consent to the data practices described in this Privacy Policy.
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">1.1 Information You Provide</h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            When you create an account or use our Service, you provide:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-4">
            <li><strong>Account Information:</strong> Email address, full name, password (encrypted)</li>
            <li><strong>Payment Information:</strong> Processed by Paddle (see Section 3.1) - we do not store credit card details</li>
            <li><strong>Audio Files:</strong> Sales call recordings you upload to the Service</li>
            <li><strong>CRM Data:</strong> Customer names, sales rep names, and other information you provide or that we extract from transcripts</li>
            <li><strong>Templates:</strong> Custom CRM field templates you create</li>
            <li><strong>Support Communications:</strong> Messages and correspondence when you contact our support team</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">1.2 Information Collected Automatically</h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            When you use the Service, we automatically collect:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4 mb-4">
            <li><strong>Usage Data:</strong> Pages viewed, features used, time spent on the platform</li>
            <li><strong>Device Information:</strong> Browser type, operating system, IP address, device identifiers</li>
            <li><strong>Log Data:</strong> Access times, errors, API calls, and performance metrics</li>
            <li><strong>Cookies:</strong> See our <a href="/cookies" className="text-blue-600 underline">Cookie Policy</a> for details</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">1.3 Information from Third Parties</h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            We receive data from third-party services we use to provide the Service:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>AssemblyAI:</strong> Transcription data and speaker diarization results</li>
            <li><strong>OpenAI:</strong> Extracted CRM fields and insights from transcripts</li>
            <li><strong>Paddle:</strong> Payment status, subscription information, billing details</li>
          </ul>
        </section>

        {/* 2. How We Use Your Information */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            We use your personal information for the following purposes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Provide the Service:</strong> Process audio files, generate transcripts, extract CRM data</li>
            <li><strong>Account Management:</strong> Create and maintain your account, authenticate access</li>
            <li><strong>Billing and Payments:</strong> Process subscriptions, issue invoices, handle refunds</li>
            <li><strong>Customer Support:</strong> Respond to inquiries, troubleshoot issues, provide assistance</li>
            <li><strong>Service Improvement:</strong> Analyze usage patterns, fix bugs, develop new features</li>
            <li><strong>Security:</strong> Detect fraud, prevent abuse, protect against unauthorized access</li>
            <li><strong>Legal Compliance:</strong> Comply with legal obligations, enforce our Terms of Service</li>
            <li><strong>Communications:</strong> Send transactional emails (call completion, usage warnings, billing notifications)</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            <strong>Legal Basis (GDPR):</strong> We process your data based on (1) contractual necessity (to provide
            the Service you signed up for), (2) legitimate interests (security, service improvement), and (3) your
            consent (for optional communications).
          </p>
        </section>

        {/* 3. Third-Party Services and Data Sharing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Third-Party Services and Data Sharing</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use the following third-party services to operate Loadvoice. Your data is shared with these providers
            only as necessary to provide the Service:
          </p>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">3.1 Paddle (Payment Processing)</h3>
              <p className="text-gray-800 mb-2">
                <strong>Purpose:</strong> Payment processing, subscription management, invoicing
              </p>
              <p className="text-gray-800 mb-2">
                <strong>Data Shared:</strong> Email, name, billing address, payment card details (encrypted)
              </p>
              <p className="text-gray-800">
                <strong>Privacy Policy:</strong> <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://www.paddle.com/legal/privacy</a>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Note: Paddle is our Merchant of Record and handles all payment processing. Your payment information
                is never stored on our servers.
              </p>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-sky-900 mb-2">3.2 Supabase (Database & Storage)</h3>
              <p className="text-gray-800 mb-2">
                <strong>Purpose:</strong> User authentication, database storage, file storage
              </p>
              <p className="text-gray-800 mb-2">
                <strong>Data Shared:</strong> Account information, audio files, transcripts, CRM data, templates
              </p>
              <p className="text-gray-800">
                <strong>Privacy Policy:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://supabase.com/privacy</a>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Note: Supabase offers EU-based servers for GDPR compliance. All data is encrypted at rest and in transit.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-2">3.3 AssemblyAI (Transcription)</h3>
              <p className="text-gray-800 mb-2">
                <strong>Purpose:</strong> Audio transcription with speaker diarization
              </p>
              <p className="text-gray-800 mb-2">
                <strong>Data Shared:</strong> Audio files, transcription results
              </p>
              <p className="text-gray-800">
                <strong>Privacy Policy:</strong> <a href="https://www.assemblyai.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://www.assemblyai.com/legal/privacy-policy</a>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Note: Audio files are temporarily processed by AssemblyAI and deleted after transcription is complete.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">3.4 OpenAI (AI Data Extraction)</h3>
              <p className="text-gray-800 mb-2">
                <strong>Purpose:</strong> Extract CRM fields and insights from transcripts using GPT-4o
              </p>
              <p className="text-gray-800 mb-2">
                <strong>Data Shared:</strong> Transcripts, CRM extraction prompts
              </p>
              <p className="text-gray-800">
                <strong>Privacy Policy:</strong> <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://openai.com/policies/privacy-policy</a>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                Note: We use OpenAI's API with data retention policies disabled (data is not used to train models).
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3.5 Other Services</h3>
              <ul className="space-y-2 text-gray-800">
                <li><strong>Vercel:</strong> Hosting and deployment (<a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Privacy Policy</a>)</li>
                <li><strong>Inngest:</strong> Background job processing (<a href="https://www.inngest.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Privacy Policy</a>)</li>
                <li><strong>Resend:</strong> Transactional emails (<a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Privacy Policy</a>)</li>
                <li><strong>PostHog:</strong> Analytics (optional, can be disabled) (<a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Privacy Policy</a>)</li>
                <li><strong>Sentry:</strong> Error monitoring (<a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Privacy Policy</a>)</li>
              </ul>
            </div>
          </div>

          <p className="text-gray-700 leading-relaxed mt-4">
            We do not sell, rent, or trade your personal information to third parties for marketing purposes.
          </p>
        </section>

        {/* 4. Data Retention */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Retention</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            We retain your personal information for as long as necessary to provide the Service and comply with legal obligations:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Account Data:</strong> Retained until you delete your account, then deleted within 30 days</li>
            <li><strong>Audio Files:</strong> Stored indefinitely until you delete them manually</li>
            <li><strong>Transcripts & Extractions:</strong> Stored indefinitely until you delete associated calls</li>
            <li><strong>Billing Records:</strong> Retained for 7 years for tax and accounting purposes (legal requirement)</li>
            <li><strong>Support Communications:</strong> Retained for 2 years after last contact</li>
            <li><strong>Log Data:</strong> Retained for 90 days, then automatically deleted</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            You may request deletion of your data at any time by contacting support or deleting your account through account settings.
          </p>
        </section>

        {/* 5. Your Rights (GDPR) */}
        <section className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">5. Your Rights Under GDPR</h2>
          <p className="text-gray-800 leading-relaxed mb-3">
            If you are located in the European Economic Area (EEA) or UK, you have the following rights under GDPR:
          </p>
          <ul className="space-y-3 text-gray-800">
            <li>
              <strong className="text-blue-900">Right to Access:</strong> Request a copy of all personal data we hold about you
            </li>
            <li>
              <strong className="text-blue-900">Right to Rectification:</strong> Correct inaccurate or incomplete data
            </li>
            <li>
              <strong className="text-blue-900">Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your data
            </li>
            <li>
              <strong className="text-blue-900">Right to Restrict Processing:</strong> Limit how we use your data
            </li>
            <li>
              <strong className="text-blue-900">Right to Data Portability:</strong> Receive your data in a machine-readable format
            </li>
            <li>
              <strong className="text-blue-900">Right to Object:</strong> Object to processing based on legitimate interests
            </li>
            <li>
              <strong className="text-blue-900">Right to Withdraw Consent:</strong> Withdraw consent for data processing at any time
            </li>
            <li>
              <strong className="text-blue-900">Right to Lodge a Complaint:</strong> File a complaint with your local data protection authority
            </li>
          </ul>
          <p className="text-gray-800 leading-relaxed mt-4 font-semibold">
            To exercise any of these rights, contact us at <a href="mailto:privacy@loadvoice.com" className="text-blue-600 underline">privacy@loadvoice.com</a>. We will respond within 30 days.
          </p>
        </section>

        {/* 6. Data Security */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Encryption:</strong> All data is encrypted in transit (TLS/SSL) and at rest (AES-256)</li>
            <li><strong>Authentication:</strong> Secure password hashing with bcrypt</li>
            <li><strong>Access Controls:</strong> Role-based permissions and Row Level Security (RLS) in database</li>
            <li><strong>Monitoring:</strong> Real-time error tracking and security monitoring with Sentry</li>
            <li><strong>Regular Backups:</strong> Daily automated backups with point-in-time recovery</li>
            <li><strong>Vulnerability Scanning:</strong> Regular security audits and dependency updates</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            While we strive to protect your data, no method of transmission over the internet is 100% secure.
            You are responsible for maintaining the confidentiality of your account credentials.
          </p>
        </section>

        {/* 7. International Data Transfers */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. International Data Transfers</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Loadvoice operates globally and may transfer data across borders. Some of our third-party providers
            are based in the United States or other countries outside the EEA/UK.
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            When we transfer your data internationally, we ensure adequate safeguards are in place:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
            <li>Privacy Shield certification (where applicable)</li>
            <li>GDPR-compliant data processing agreements with all third-party providers</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            You may request details about international data transfers by contacting <a href="mailto:privacy@loadvoice.com" className="text-blue-600 underline">privacy@loadvoice.com</a>.
          </p>
        </section>

        {/* 8. Children's Privacy */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            Loadvoice is not intended for use by individuals under the age of 18. We do not knowingly collect
            personal information from children. If you believe we have inadvertently collected data from a child,
            please contact us immediately at <a href="mailto:privacy@loadvoice.com" className="text-blue-600 underline">privacy@loadvoice.com</a>
            and we will delete it promptly.
          </p>
        </section>

        {/* 9. Cookies and Tracking */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies and Tracking Technologies</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            We use cookies and similar tracking technologies to improve your experience on Loadvoice. For detailed
            information about the cookies we use and how to manage them, please see our{' '}
            <a href="/cookies" className="text-blue-600 underline font-semibold">Cookie Policy</a>.
          </p>
          <p className="text-gray-700 leading-relaxed">
            You can control cookies through your browser settings. Note that disabling certain cookies may affect
            the functionality of the Service.
          </p>
        </section>

        {/* 10. Changes to Privacy Policy */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated
            "Last updated" date. We will notify you of material changes via email or in-app notification. Your continued
            use of the Service after changes are posted constitutes acceptance of the updated Privacy Policy.
          </p>
        </section>

        {/* 11. Contact Us */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            If you have questions about this Privacy Policy or wish to exercise your data protection rights, please contact us:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800 font-semibold">Nikola Innovations Limited</p>
            <p className="text-gray-700">Data Protection Officer</p>
            <p className="text-gray-700">Email: <a href="mailto:privacy@loadvoice.com" className="text-blue-600 underline">privacy@loadvoice.com</a></p>
            <p className="text-gray-700">General Support: <a href="mailto:support@loadvoice.com" className="text-blue-600 underline">support@loadvoice.com</a></p>
            <p className="text-gray-700">Website: <a href="https://loadvoice.com" className="text-blue-600 underline">https://loadvoice.com</a></p>
          </div>
          <p className="text-gray-700 leading-relaxed mt-4">
            <strong>EU Representative:</strong> If you are located in the EU and have concerns about our data
            processing practices, you may contact your local data protection authority.
          </p>
        </section>

        {/* Data Protection Authority */}
        <section className="bg-gray-50 border border-gray-300 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">UK Supervisory Authority</h3>
          <p className="text-gray-800">Information Commissioner's Office (ICO)</p>
          <p className="text-gray-700">Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://ico.org.uk</a></p>
          <p className="text-gray-700">Phone: 0303 123 1113</p>
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
