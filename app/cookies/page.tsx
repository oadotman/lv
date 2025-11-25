export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4 border-b pb-6">
        <h1 className="text-4xl font-bold text-gray-900">Cookie Policy</h1>
        <p className="text-gray-600">Last updated: January 21, 2025</p>
        <p className="text-sm text-gray-500">
          © 2025 SynQall. All rights reserved. SynQall is owned and operated by Nikola Innovations Limited.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none space-y-8">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What Are Cookies?</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit
            a website. They help websites remember your preferences, improve performance, and provide analytics.
          </p>
          <p className="text-gray-700 leading-relaxed">
            SynQall uses cookies and similar tracking technologies to enhance your experience and ensure the
            Service functions properly. This Cookie Policy explains what cookies we use, why we use them, and how
            you can manage your cookie preferences.
          </p>
        </section>

        {/* Types of Cookies We Use */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Types of Cookies We Use</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We use the following categories of cookies on SynQall:
          </p>

          {/* Essential Cookies */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-red-900 mb-2 flex items-center gap-2">
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">REQUIRED</span>
              1. Essential Cookies (Strictly Necessary)
            </h3>
            <p className="text-gray-800 leading-relaxed mb-3">
              These cookies are essential for the Service to function and cannot be disabled. They are usually set
              in response to actions you take, such as logging in or setting privacy preferences.
            </p>
            <div className="bg-white rounded border border-red-200 p-3">
              <p className="text-gray-800 font-semibold mb-2">Examples:</p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li><strong>supabase-auth-token:</strong> Maintains your login session (expires after 1 hour)</li>
                <li><strong>csrf_token:</strong> Prevents cross-site request forgery attacks</li>
                <li><strong>cookie_consent:</strong> Remembers your cookie consent preferences</li>
              </ul>
              <p className="text-xs text-gray-600 mt-3">
                <strong>Duration:</strong> Session cookies (deleted when browser closes) or persistent (up to 30 days)
              </p>
              <p className="text-xs text-red-700 mt-1 font-semibold">
                Note: These cookies cannot be disabled as they are required for the Service to work.
              </p>
            </div>
          </div>

          {/* Functional Cookies */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">2. Functional Cookies</h3>
            <p className="text-gray-800 leading-relaxed mb-3">
              These cookies enable enhanced functionality and personalization, such as remembering your preferences
              and settings.
            </p>
            <div className="bg-white rounded border border-blue-200 p-3">
              <p className="text-gray-800 font-semibold mb-2">Examples:</p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li><strong>user_preferences:</strong> Stores your UI preferences (theme, sidebar state)</li>
                <li><strong>language:</strong> Remembers your language selection</li>
                <li><strong>timezone:</strong> Stores your timezone for accurate timestamps</li>
              </ul>
              <p className="text-xs text-gray-600 mt-3">
                <strong>Duration:</strong> Up to 1 year
              </p>
              <p className="text-xs text-blue-700 mt-1">
                You can disable these cookies, but some features may not work as expected.
              </p>
            </div>
          </div>

          {/* Analytics Cookies */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-green-900 mb-2">3. Analytics Cookies (Optional)</h3>
            <p className="text-gray-800 leading-relaxed mb-3">
              These cookies help us understand how users interact with the Service so we can improve it. They collect
              anonymized data about page views, feature usage, and user behavior.
            </p>
            <div className="bg-white rounded border border-green-200 p-3">
              <p className="text-gray-800 font-semibold mb-2">Third-Party Services:</p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>
                  <strong>PostHog:</strong> Product analytics and session recordings (optional, can be disabled)
                  <br />
                  <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                    PostHog Privacy Policy
                  </a>
                </li>
              </ul>
              <p className="text-xs text-gray-600 mt-3">
                <strong>Data Collected:</strong> Page views, clicks, time spent, device type, browser, anonymized IP address
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <strong>Duration:</strong> Up to 2 years
              </p>
              <p className="text-xs text-green-700 mt-1 font-semibold">
                You can opt out of analytics cookies via the cookie consent banner or account settings.
              </p>
            </div>
          </div>

          {/* Performance Cookies */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <h3 className="text-xl font-semibold text-purple-900 mb-2">4. Performance and Monitoring Cookies</h3>
            <p className="text-gray-800 leading-relaxed mb-3">
              These cookies help us monitor errors, track performance, and ensure the Service runs smoothly.
            </p>
            <div className="bg-white rounded border border-purple-200 p-3">
              <p className="text-gray-800 font-semibold mb-2">Third-Party Services:</p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li>
                  <strong>Sentry:</strong> Error tracking and performance monitoring
                  <br />
                  <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                    Sentry Privacy Policy
                  </a>
                </li>
                <li>
                  <strong>Vercel Analytics:</strong> Performance metrics and real user monitoring
                  <br />
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
                    Vercel Privacy Policy
                  </a>
                </li>
              </ul>
              <p className="text-xs text-gray-600 mt-3">
                <strong>Data Collected:</strong> Error messages, stack traces, performance metrics, anonymized user identifiers
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <strong>Duration:</strong> Session cookies or up to 90 days
              </p>
            </div>
          </div>
        </section>

        {/* Third-Party Cookies */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Cookies</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Some cookies are set by third-party services we use to operate SynQall:
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Service</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Purpose</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Privacy Policy</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Supabase</td>
                  <td className="border border-gray-300 px-4 py-2">Authentication and database</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Link
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Paddle</td>
                  <td className="border border-gray-300 px-4 py-2">Payment processing</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Link
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">PostHog</td>
                  <td className="border border-gray-300 px-4 py-2">Analytics (optional)</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Link
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Sentry</td>
                  <td className="border border-gray-300 px-4 py-2">Error monitoring</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Link
                    </a>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Vercel</td>
                  <td className="border border-gray-300 px-4 py-2">Hosting and performance</td>
                  <td className="border border-gray-300 px-4 py-2">
                    <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Link
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-700 leading-relaxed mt-3">
            We do not control third-party cookies. Please refer to the respective privacy policies above for information
            on how these services use cookies.
          </p>
        </section>

        {/* How to Manage Cookies */}
        <section className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-yellow-900 mb-4">How to Manage Cookies</h2>
          <p className="text-gray-800 leading-relaxed mb-4">
            You have several options for managing cookies on SynQall:
          </p>

          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-yellow-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Cookie Consent Banner</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                When you first visit SynQall, you'll see a cookie consent banner where you can accept or decline
                optional cookies (analytics, performance). Essential cookies are always enabled.
              </p>
              <p className="text-gray-700 text-sm leading-relaxed">
                You can change your preferences at any time by clicking the "Cookie Settings" link in the footer.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-yellow-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Account Settings</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Logged-in users can manage cookie preferences in <strong>Settings → Privacy</strong>.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-yellow-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Browser Settings</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-3">
                Most browsers allow you to control cookies through their settings. Here's how to manage cookies in
                popular browsers:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <strong>Chrome:</strong>{' '}
                  <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Cookie settings
                  </a>
                </li>
                <li>
                  <strong>Firefox:</strong>{' '}
                  <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Cookie settings
                  </a>
                </li>
                <li>
                  <strong>Safari:</strong>{' '}
                  <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Cookie settings
                  </a>
                </li>
                <li>
                  <strong>Edge:</strong>{' '}
                  <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Cookie settings
                  </a>
                </li>
              </ul>
              <p className="text-xs text-yellow-800 mt-3 font-semibold">
                Note: Blocking all cookies may prevent you from logging in or using certain features of the Service.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-yellow-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Do Not Track (DNT)</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                We respect browser Do Not Track (DNT) signals. If your browser has DNT enabled, we will not set
                optional analytics or tracking cookies.
              </p>
            </div>
          </div>
        </section>

        {/* Cookie Duration */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookie Duration</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Cookies used by SynQall have different durations:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Session Cookies:</strong> Deleted automatically when you close your browser</li>
            <li><strong>Persistent Cookies:</strong> Remain on your device for a set period (ranging from 30 days to 2 years)</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            You can clear cookies at any time through your browser settings. This will log you out of the Service.
          </p>
        </section>

        {/* GDPR Compliance */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">GDPR Compliance</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            In compliance with GDPR, we:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Only use essential cookies without consent (they are strictly necessary)</li>
            <li>Request explicit consent before setting optional cookies (analytics, performance)</li>
            <li>Allow you to withdraw consent and delete cookies at any time</li>
            <li>Provide clear information about what cookies we use and why</li>
            <li>Respect Do Not Track (DNT) browser signals</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            For more information about how we process your data, see our{' '}
            <a href="/privacy" className="text-blue-600 underline font-semibold">Privacy Policy</a>.
          </p>
        </section>

        {/* Changes to Cookie Policy */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Cookie Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated
            "Last updated" date. We encourage you to review this policy periodically.
          </p>
        </section>

        {/* Contact Us */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            If you have questions about our use of cookies, please contact us:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800 font-semibold">Nikola Innovations Limited</p>
            <p className="text-gray-700">Email: <a href="mailto:privacy@synqall.com" className="text-blue-600 underline">privacy@synqall.com</a></p>
            <p className="text-gray-700">General Support: <a href="mailto:support@synqall.com" className="text-blue-600 underline">support@synqall.com</a></p>
            <p className="text-gray-700">Website: <a href="https://synqall.com" className="text-blue-600 underline">https://synqall.com</a></p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="border-t pt-6 mt-12">
        <p className="text-sm text-gray-500 text-center">
          © 2025 SynQall. All rights reserved. SynQall is owned and operated by Nikola Innovations Limited.
        </p>
      </div>
    </div>
  );
}
