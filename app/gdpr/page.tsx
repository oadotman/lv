import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GDPR Compliance - LoadVoice | EU Data Protection',
  description: 'LoadVoice GDPR Compliance - Full EU data protection compliance for freight brokers. Data portability, right to erasure, and transparent data processing for your freight operations.',
  keywords: [
    'LoadVoice GDPR',
    'EU data protection',
    'GDPR compliance freight',
    'data portability',
    'right to erasure',
    'data processing agreement'
  ],
  alternates: {
    canonical: 'https://loadvoice.com/gdpr'
  },
  openGraph: {
    title: 'GDPR Compliance - LoadVoice',
    description: 'Full GDPR compliance for EU freight brokers. Data protection and privacy rights guaranteed.',
    url: 'https://loadvoice.com/gdpr',
    siteName: 'LoadVoice',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: false,  // Legal pages don't need to be indexed for SEO
    follow: true,  // But should allow following links
    noarchive: true,  // Don't cache legal content
  }
};

export default function GDPRCompliancePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4 border-b pb-6">
        <h1 className="text-4xl font-bold text-gray-900">GDPR Compliance</h1>
        <p className="text-gray-600">Last updated: January 21, 2025</p>
        <p className="text-sm text-gray-500">
          © 2025 Loadvoice. All rights reserved. Loadvoice is owned and operated by Nikola Innovations Limited.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none space-y-8">
        {/* Introduction */}
        <section className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">Our Commitment to GDPR</h2>
          <p className="text-gray-800 leading-relaxed mb-3">
            Loadvoice is committed to full compliance with the General Data Protection Regulation (GDPR),
            the UK Data Protection Act 2018, and other applicable data protection laws. This page explains
            how we meet our obligations as a data controller and processor.
          </p>
          <p className="text-gray-800 leading-relaxed">
            Nikola Innovations Limited is the data controller for all personal data collected through Loadvoice.
            We take our responsibility for protecting your data seriously and have implemented comprehensive
            technical and organizational measures to ensure GDPR compliance.
          </p>
        </section>

        {/* Legal Basis for Processing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Legal Basis for Data Processing</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Under GDPR Article 6, we process your personal data under the following legal bases:
          </p>

          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contractual Necessity (Article 6(1)(b))</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Processing is necessary to provide the Service you signed up for, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Account creation and authentication</li>
                <li>Audio transcription and CRM data extraction</li>
                <li>Storage of call recordings and transcripts</li>
                <li>Service delivery and functionality</li>
              </ul>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Legitimate Interests (Article 6(1)(f))</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Processing is necessary for our legitimate business interests, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Fraud prevention and security monitoring</li>
                <li>Service improvement and bug fixes</li>
                <li>Customer support and troubleshooting</li>
                <li>Business analytics (anonymized)</li>
              </ul>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Consent (Article 6(1)(a))</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Processing based on your explicit consent, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Optional analytics cookies (PostHog)</li>
                <li>Marketing communications (if you opt in)</li>
                <li>Session recordings for UX improvement</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2 font-semibold">
                You may withdraw consent at any time via Settings → Privacy or the cookie consent banner.
              </p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Legal Obligation (Article 6(1)(c))</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Processing required to comply with legal obligations, including:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Tax and accounting record retention (7 years)</li>
                <li>Response to lawful data requests from authorities</li>
                <li>Compliance with data breach notification requirements</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Your GDPR Rights */}
        <section className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-900 mb-4">2. Your GDPR Rights</h2>
          <p className="text-gray-800 leading-relaxed mb-4">
            Under GDPR, you have the following data protection rights. We will respond to all requests within
            30 days (or 60 days for complex requests).
          </p>

          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Access (Article 15)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You have the right to request a copy of all personal data we hold about you. This includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4 mb-2">
                <li>Account information (email, name, metadata)</li>
                <li>Usage data and activity logs</li>
                <li>Stored audio files and transcripts</li>
                <li>CRM extractions and templates</li>
              </ul>
              <p className="text-xs text-green-800 font-semibold">
                How to exercise: Email <a href="mailto:privacy@loadvoice.com" className="underline">privacy@loadvoice.com</a> with subject "Data Access Request"
              </p>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Rectification (Article 16)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You have the right to correct inaccurate or incomplete personal data.
              </p>
              <p className="text-xs text-green-800 font-semibold">
                How to exercise: Update directly in Settings → Account or contact support
              </p>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Erasure / "Right to be Forgotten" (Article 17)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You have the right to request deletion of your personal data. We will delete your data unless
                we have a legal obligation to retain it (e.g., billing records for tax purposes).
              </p>
              <p className="text-xs text-green-800 font-semibold">
                How to exercise: Settings → Danger Zone → Delete Account or email <a href="mailto:privacy@loadvoice.com" className="underline">privacy@loadvoice.com</a>
              </p>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Restrict Processing (Article 18)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You have the right to limit how we process your data in certain circumstances (e.g., while
                disputing accuracy).
              </p>
              <p className="text-xs text-green-800 font-semibold">
                How to exercise: Email <a href="mailto:privacy@loadvoice.com" className="underline">privacy@loadvoice.com</a> with details
              </p>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Data Portability (Article 20)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You have the right to receive your personal data in a structured, machine-readable format (JSON/CSV)
                and transmit it to another controller.
              </p>
              <p className="text-xs text-green-800 font-semibold">
                How to exercise: Email <a href="mailto:privacy@loadvoice.com" className="underline">privacy@loadvoice.com</a> with subject "Data Portability Request"
              </p>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Object (Article 21)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You have the right to object to processing based on legitimate interests or for direct marketing purposes.
              </p>
              <p className="text-xs text-green-800 font-semibold">
                How to exercise: Settings → Privacy or email <a href="mailto:privacy@loadvoice.com" className="underline">privacy@loadvoice.com</a>
              </p>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Withdraw Consent (Article 7(3))</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You have the right to withdraw consent for processing at any time (for analytics, cookies, etc.).
              </p>
              <p className="text-xs text-green-800 font-semibold">
                How to exercise: Settings → Privacy → Cookie Preferences or click "Cookie Settings" in footer
              </p>
            </div>

            <div className="bg-white rounded-lg border border-green-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Right to Lodge a Complaint (Article 77)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                You have the right to file a complaint with your local data protection authority if you believe
                we are not complying with GDPR.
              </p>
              <div className="bg-gray-50 rounded p-3 mt-2">
                <p className="text-sm text-gray-800 font-semibold">UK Supervisory Authority:</p>
                <p className="text-sm text-gray-700">Information Commissioner's Office (ICO)</p>
                <p className="text-sm text-gray-700">Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://ico.org.uk</a></p>
                <p className="text-sm text-gray-700">Phone: 0303 123 1113</p>
              </div>
            </div>
          </div>
        </section>

        {/* Data Protection Measures */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Technical and Organizational Measures</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We have implemented the following measures to protect your data in compliance with GDPR Article 32:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-sky-900 mb-2">Technical Measures</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li><strong>Encryption:</strong> TLS 1.3 in transit, AES-256 at rest</li>
                <li><strong>Access Control:</strong> Role-based permissions (RBAC)</li>
                <li><strong>Authentication:</strong> bcrypt password hashing, MFA available</li>
                <li><strong>Database Security:</strong> Row Level Security (RLS) in Supabase</li>
                <li><strong>Monitoring:</strong> Real-time error tracking with Sentry</li>
                <li><strong>Backups:</strong> Daily automated backups with encryption</li>
                <li><strong>Penetration Testing:</strong> Annual security audits</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">Organizational Measures</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li><strong>Data Minimization:</strong> Collect only necessary data</li>
                <li><strong>Purpose Limitation:</strong> Use data only for stated purposes</li>
                <li><strong>Staff Training:</strong> Regular GDPR compliance training</li>
                <li><strong>Access Policies:</strong> Principle of least privilege</li>
                <li><strong>Data Processors:</strong> GDPR-compliant DPAs with all vendors</li>
                <li><strong>Incident Response:</strong> 72-hour breach notification plan</li>
                <li><strong>Privacy by Design:</strong> Privacy considered in all features</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Processing Agreements */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Processing Agreements (DPAs)</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We have GDPR-compliant Data Processing Agreements in place with all third-party processors:
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Processor</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Purpose</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Location</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Safeguards</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Supabase</td>
                  <td className="border border-gray-300 px-4 py-2">Database & Storage</td>
                  <td className="border border-gray-300 px-4 py-2">EU (optional)</td>
                  <td className="border border-gray-300 px-4 py-2">DPA, SCCs, EU servers</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">AssemblyAI</td>
                  <td className="border border-gray-300 px-4 py-2">Transcription</td>
                  <td className="border border-gray-300 px-4 py-2">US</td>
                  <td className="border border-gray-300 px-4 py-2">DPA, SCCs, auto-deletion</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">OpenAI</td>
                  <td className="border border-gray-300 px-4 py-2">AI Extraction</td>
                  <td className="border border-gray-300 px-4 py-2">US</td>
                  <td className="border border-gray-300 px-4 py-2">DPA, no training on data</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Paddle</td>
                  <td className="border border-gray-300 px-4 py-2">Payment Processing</td>
                  <td className="border border-gray-300 px-4 py-2">UK/EU</td>
                  <td className="border border-gray-300 px-4 py-2">PCI-DSS, DPA</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Vercel</td>
                  <td className="border border-gray-300 px-4 py-2">Hosting</td>
                  <td className="border border-gray-300 px-4 py-2">Global (EU available)</td>
                  <td className="border border-gray-300 px-4 py-2">DPA, SCCs, SOC 2</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            <strong>SCCs:</strong> Standard Contractual Clauses approved by the European Commission for international data transfers
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention Policy</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            In compliance with GDPR Article 5(1)(e) (storage limitation), we retain data only as long as necessary:
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-300">
                  <th className="text-left py-2 px-2 font-semibold">Data Type</th>
                  <th className="text-left py-2 px-2 font-semibold">Retention Period</th>
                  <th className="text-left py-2 px-2 font-semibold">Justification</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-yellow-200">
                  <td className="py-2 px-2">Account Data</td>
                  <td className="py-2 px-2">Until deletion + 30 days</td>
                  <td className="py-2 px-2">Contractual necessity</td>
                </tr>
                <tr className="border-b border-yellow-200">
                  <td className="py-2 px-2">Audio Files</td>
                  <td className="py-2 px-2">Until manual deletion</td>
                  <td className="py-2 px-2">User-controlled storage</td>
                </tr>
                <tr className="border-b border-yellow-200">
                  <td className="py-2 px-2">Transcripts</td>
                  <td className="py-2 px-2">Until call deletion</td>
                  <td className="py-2 px-2">Service provision</td>
                </tr>
                <tr className="border-b border-yellow-200">
                  <td className="py-2 px-2">Billing Records</td>
                  <td className="py-2 px-2">7 years</td>
                  <td className="py-2 px-2">Legal obligation (tax law)</td>
                </tr>
                <tr className="border-b border-yellow-200">
                  <td className="py-2 px-2">Support Tickets</td>
                  <td className="py-2 px-2">2 years</td>
                  <td className="py-2 px-2">Legitimate interest</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">Access Logs</td>
                  <td className="py-2 px-2">90 days</td>
                  <td className="py-2 px-2">Security monitoring</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Data Breach Procedures */}
        <section className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-red-900 mb-4">6. Data Breach Response (Article 33-34)</h2>
          <p className="text-gray-800 leading-relaxed mb-4">
            In the event of a data breach that poses a risk to your rights and freedoms, we will:
          </p>
          <div className="space-y-3">
            <div className="bg-white rounded border border-red-200 p-3">
              <p className="text-sm font-semibold text-gray-900">Within 72 Hours:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4 mt-1">
                <li>Notify the ICO (UK supervisory authority)</li>
                <li>Document the breach and assess risk</li>
                <li>Begin containment and remediation</li>
              </ul>
            </div>
            <div className="bg-white rounded border border-red-200 p-3">
              <p className="text-sm font-semibold text-gray-900">Without Undue Delay:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-4 mt-1">
                <li>Notify affected users via email and in-app notification</li>
                <li>Provide clear guidance on protective measures</li>
                <li>Offer support and monitoring services (if applicable)</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-800 leading-relaxed mt-4 text-sm">
            To date, Loadvoice has experienced zero data breaches. We maintain comprehensive incident response
            plans and conduct regular security drills.
          </p>
        </section>

        {/* International Transfers */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. International Data Transfers (Chapter V)</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Some of our third-party processors are located outside the EEA/UK. We ensure adequate safeguards for
            international transfers:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Standard Contractual Clauses (SCCs):</strong> EU Commission-approved clauses for US transfers</li>
            <li><strong>Adequacy Decisions:</strong> Transfers to countries with adequate protection (e.g., UK-EU adequacy)</li>
            <li><strong>Supplementary Measures:</strong> Additional encryption and access controls for US transfers</li>
            <li><strong>Data Localization:</strong> Option to use EU-only servers (Supabase EU region)</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            You may request details about specific data transfers by contacting{' '}
            <a href="mailto:privacy@loadvoice.com" className="text-blue-600 underline">privacy@loadvoice.com</a>.
          </p>
        </section>

        {/* Children's Data */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Data (Article 8)</h2>
          <p className="text-gray-700 leading-relaxed">
            Loadvoice is not intended for use by children under 18. We do not knowingly process data of children.
            If you believe we have inadvertently collected data from a child, please contact us immediately at{' '}
            <a href="mailto:privacy@loadvoice.com" className="text-blue-600 underline">privacy@loadvoice.com</a> and
            we will delete it within 72 hours.
          </p>
        </section>

        {/* Automated Decision-Making */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Automated Decision-Making (Article 22)</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Loadvoice uses AI (OpenAI) to extract CRM data from transcripts. However:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>We do NOT make automated decisions that have legal or similarly significant effects on you</li>
            <li>AI outputs are always subject to human review and editing</li>
            <li>You have full control to modify, delete, or disregard AI-generated outputs</li>
            <li>AI is used solely to assist with data extraction, not to make decisions about you</li>
          </ul>
        </section>

        {/* Contact DPO */}
        <section className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">10. Contact Our Data Protection Officer</h2>
          <p className="text-gray-800 leading-relaxed mb-3">
            For any GDPR-related inquiries, to exercise your rights, or to report concerns, please contact our
            Data Protection Officer:
          </p>
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <p className="text-gray-800 font-semibold">Nikola Innovations Limited</p>
            <p className="text-gray-700">Data Protection Officer</p>
            <p className="text-gray-700">Email: <a href="mailto:privacy@loadvoice.com" className="text-blue-600 underline">privacy@loadvoice.com</a></p>
            <p className="text-gray-700">General Support: <a href="mailto:support@loadvoice.com" className="text-blue-600 underline">support@loadvoice.com</a></p>
            <p className="text-gray-700">Website: <a href="https://loadvoice.com" className="text-blue-600 underline">https://loadvoice.com</a></p>
          </div>
          <p className="text-gray-800 leading-relaxed mt-4 text-sm">
            We will respond to all GDPR requests within 30 days (or 60 days for complex requests, with notification).
          </p>
        </section>

        {/* Related Policies */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Policies</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="/privacy" className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Privacy Policy</h3>
              <p className="text-sm text-gray-600">Full details on data collection and use</p>
            </a>
            <a href="/cookies" className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Cookie Policy</h3>
              <p className="text-sm text-gray-600">Information about cookies and tracking</p>
            </a>
            <a href="/security" className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Data Security</h3>
              <p className="text-sm text-gray-600">Technical security measures and certifications</p>
            </a>
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
