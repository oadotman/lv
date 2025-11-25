export default function DataSecurityPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4 border-b pb-6">
        <h1 className="text-4xl font-bold text-gray-900">Data Security</h1>
        <p className="text-gray-600">Last updated: January 21, 2025</p>
        <p className="text-sm text-gray-500">
          © 2025 SynQall. All rights reserved. SynQall is owned and operated by Nikola Innovations Limited.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-gray max-w-none space-y-8">
        {/* Introduction */}
        <section className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">Our Security Commitment</h2>
          <p className="text-gray-800 leading-relaxed mb-3">
            At SynQall, data security is our top priority. We understand that you trust us with sensitive sales call
            recordings and customer information. This page details the comprehensive technical and organizational security
            measures we have implemented to protect your data.
          </p>
          <p className="text-gray-800 leading-relaxed">
            We follow industry best practices and comply with international security standards including ISO 27001
            principles, SOC 2 requirements, and GDPR Article 32 (Security of Processing).
          </p>
        </section>

        {/* Security Framework */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Security Framework</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Encryption</h3>
              <p className="text-sm text-gray-700">
                All data encrypted in transit (TLS 1.3) and at rest (AES-256)
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl mb-2">🛡️</div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">Access Control</h3>
              <p className="text-sm text-gray-700">
                Role-based permissions, MFA, and least-privilege access
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="text-lg font-semibold text-orange-900 mb-2">Monitoring</h3>
              <p className="text-sm text-gray-700">
                24/7 security monitoring with real-time alerting
              </p>
            </div>
          </div>
        </section>

        {/* Data Encryption */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Data Encryption</h2>

          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Encryption in Transit</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                All data transmitted between your browser and our servers is encrypted using:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>TLS 1.3:</strong> Latest transport layer security protocol</li>
                <li><strong>HSTS:</strong> Strict transport security to prevent downgrade attacks</li>
                <li><strong>Certificate Pinning:</strong> Prevents man-in-the-middle attacks</li>
                <li><strong>Perfect Forward Secrecy:</strong> Each session uses unique encryption keys</li>
              </ul>
              <div className="bg-gray-50 rounded p-3 mt-3">
                <p className="text-sm text-gray-800">
                  <strong>SSL Rating:</strong> A+ on SSL Labs
                  <br />
                  <strong>Cipher Suites:</strong> Only strong ciphers (AES-GCM, ChaCha20-Poly1305)
                </p>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Encryption at Rest</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                All stored data is encrypted using industry-standard encryption:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>AES-256:</strong> Military-grade encryption for all database records</li>
                <li><strong>Encrypted Backups:</strong> All backups encrypted with separate keys</li>
                <li><strong>File Storage:</strong> Audio files encrypted in Supabase Storage</li>
                <li><strong>Key Management:</strong> Encryption keys stored in secure key vaults</li>
              </ul>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Password Security</h3>
              <p className="text-gray-700 leading-relaxed mb-3">
                User passwords are protected with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>bcrypt Hashing:</strong> Industry-standard password hashing with salt</li>
                <li><strong>Minimum Complexity:</strong> 8+ characters, uppercase, lowercase, number requirements</li>
                <li><strong>Password Reset:</strong> Secure token-based reset with email verification</li>
                <li><strong>Breach Detection:</strong> Check against known breached password databases</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Access Control */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Access Control & Authentication</h2>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-5 mb-4">
            <h3 className="text-xl font-semibold text-green-900 mb-3">Multi-Factor Authentication (MFA)</h3>
            <p className="text-gray-800 leading-relaxed mb-3">
              We strongly recommend enabling MFA for all accounts. MFA adds an extra layer of security by requiring:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-800 ml-4">
              <li>Something you know (password)</li>
              <li>Something you have (authenticator app or SMS code)</li>
            </ul>
            <p className="text-sm text-green-800 font-semibold mt-3">
              Enable MFA in Settings → Security → Two-Factor Authentication
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Role-Based Access Control (RBAC)</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Team plans include granular permission controls:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li><strong>Owner:</strong> Full access including billing and team management</li>
                <li><strong>Admin:</strong> Manage calls, templates, and view analytics</li>
                <li><strong>Member:</strong> Upload calls and view own transcripts</li>
                <li><strong>Viewer:</strong> Read-only access to calls and analytics</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Row Level Security (RLS)</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Database-level security ensures users can only access their own data. Every query is automatically
                filtered by user ID at the database layer, preventing unauthorized data access even in the event of
                application vulnerabilities.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Management</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Secure session handling:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Sessions expire after 1 hour of inactivity</li>
                <li>Secure, httpOnly cookies prevent XSS attacks</li>
                <li>Session tokens rotated on privilege changes</li>
                <li>Automatic logout on password change</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Infrastructure Security */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Infrastructure Security</h2>

          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-purple-900 mb-3">Cloud Infrastructure</h3>
              <p className="text-gray-800 leading-relaxed mb-3">
                SynQall is hosted on enterprise-grade cloud infrastructure:
              </p>
              <div className="bg-white rounded border border-purple-200 p-3">
                <p className="text-sm text-gray-800 mb-2"><strong>Hosting Providers:</strong></p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    <strong>Vercel (CDN & Edge):</strong> SOC 2 Type II certified, DDoS protection, global edge network
                  </li>
                  <li>
                    <strong>Supabase (Database):</strong> AWS-backed, SOC 2 compliant, automatic backups
                  </li>
                  <li>
                    <strong>AWS S3 (via Supabase):</strong> 99.999999999% durability, cross-region replication
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-orange-900 mb-3">Network Security</h3>
              <ul className="space-y-2 text-gray-800 text-sm">
                <li><strong>Firewall:</strong> Stateful firewalls with restrictive ingress rules</li>
                <li><strong>DDoS Protection:</strong> Cloudflare/Vercel DDoS mitigation (up to 100 Gbps)</li>
                <li><strong>Rate Limiting:</strong> API rate limits to prevent abuse (100 req/min)</li>
                <li><strong>IP Whitelisting:</strong> Available for Enterprise plans</li>
                <li><strong>VPN Access:</strong> Admin access requires VPN (internal team only)</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-blue-900 mb-3">Application Security</h3>
              <ul className="space-y-2 text-gray-800 text-sm">
                <li><strong>Input Validation:</strong> All user inputs sanitized and validated</li>
                <li><strong>CSRF Protection:</strong> Anti-CSRF tokens on all state-changing requests</li>
                <li><strong>XSS Prevention:</strong> Content Security Policy (CSP) headers</li>
                <li><strong>SQL Injection:</strong> Parameterized queries only, no dynamic SQL</li>
                <li><strong>File Upload:</strong> Strict MIME type validation, size limits, virus scanning</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Monitoring & Incident Response */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Security Monitoring & Incident Response</h2>

          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-5 mb-4">
            <h3 className="text-xl font-semibold text-red-900 mb-3">24/7 Security Monitoring</h3>
            <p className="text-gray-800 leading-relaxed mb-3">
              We actively monitor for security threats and suspicious activity:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-4">
              <li><strong>Real-Time Alerting:</strong> Immediate notifications for suspicious login attempts, API abuse, errors</li>
              <li><strong>Error Tracking:</strong> Sentry monitors all application errors and security exceptions</li>
              <li><strong>Log Analysis:</strong> Automated analysis of access logs for anomalies</li>
              <li><strong>Uptime Monitoring:</strong> 24/7 uptime checks with 1-minute intervals</li>
              <li><strong>Intrusion Detection:</strong> Automated threat detection and IP blocking</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Incident Response Plan</h3>
              <p className="text-gray-700 text-sm leading-relaxed mb-3">
                In the event of a security incident, we follow a structured response process:
              </p>
              <div className="space-y-2 text-sm">
                <div className="bg-gray-50 rounded p-3">
                  <p className="font-semibold text-gray-900">1. Detection & Analysis (0-1 hour)</p>
                  <p className="text-gray-700">Identify threat, assess scope, activate response team</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="font-semibold text-gray-900">2. Containment (1-4 hours)</p>
                  <p className="text-gray-700">Isolate affected systems, prevent further damage</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="font-semibold text-gray-900">3. Eradication (4-24 hours)</p>
                  <p className="text-gray-700">Remove threat, patch vulnerabilities, restore systems</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="font-semibold text-gray-900">4. Notification (Within 72 hours)</p>
                  <p className="text-gray-700">Notify ICO and affected users (if data breach)</p>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <p className="font-semibold text-gray-900">5. Post-Incident Review</p>
                  <p className="text-gray-700">Document lessons learned, improve security measures</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Backups & Disaster Recovery */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Backups & Disaster Recovery</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Automated Backups</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li><strong>Frequency:</strong> Daily automated backups at 2:00 AM UTC</li>
                <li><strong>Retention:</strong> 30 days of daily backups, 12 months of monthly backups</li>
                <li><strong>Encryption:</strong> All backups encrypted with AES-256</li>
                <li><strong>Geographic Redundancy:</strong> Backups stored in multiple regions</li>
                <li><strong>Testing:</strong> Monthly backup restoration tests</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Disaster Recovery</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li><strong>RTO (Recovery Time Objective):</strong> 4 hours</li>
                <li><strong>RPO (Recovery Point Objective):</strong> 24 hours</li>
                <li><strong>Point-in-Time Recovery:</strong> Restore to any point in last 30 days</li>
                <li><strong>Failover:</strong> Automatic failover to backup region</li>
                <li><strong>Uptime SLA:</strong> 99.9% uptime guarantee (Team/Enterprise plans)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security Audits & Compliance */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Security Audits & Compliance</h2>

          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-purple-900 mb-3">Regular Security Audits</h3>
              <ul className="space-y-2 text-gray-800 text-sm">
                <li><strong>Penetration Testing:</strong> Annual third-party penetration tests</li>
                <li><strong>Vulnerability Scanning:</strong> Weekly automated vulnerability scans</li>
                <li><strong>Code Reviews:</strong> All code changes reviewed for security issues</li>
                <li><strong>Dependency Audits:</strong> Daily automated checks for vulnerable dependencies</li>
                <li><strong>Security Training:</strong> Quarterly security training for all team members</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Compliance & Certifications</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm mt-3">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Standard</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Status</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">GDPR</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">Compliant</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">EU/UK data protection regulation</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">SOC 2 Type II</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">Via Infrastructure</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Vercel and Supabase are SOC 2 certified</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">ISO 27001</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-semibold">Aligned</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Follow ISO 27001 principles (not certified)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">PCI-DSS</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">Compliant</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Via Paddle (payment processor)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Third-Party Security */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Security</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We carefully vet all third-party services and ensure they meet our security standards:
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Service</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Security Features</th>
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Certifications</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Supabase</td>
                  <td className="border border-gray-300 px-4 py-2">RLS, encryption at rest, SOC 2</td>
                  <td className="border border-gray-300 px-4 py-2">SOC 2 Type II, GDPR</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">AssemblyAI</td>
                  <td className="border border-gray-300 px-4 py-2">Auto-deletion, encrypted processing</td>
                  <td className="border border-gray-300 px-4 py-2">SOC 2 Type II, GDPR</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">OpenAI</td>
                  <td className="border border-gray-300 px-4 py-2">No training on API data, encrypted</td>
                  <td className="border border-gray-300 px-4 py-2">SOC 2, ISO 27001</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Paddle</td>
                  <td className="border border-gray-300 px-4 py-2">PCI-DSS Level 1, tokenization</td>
                  <td className="border border-gray-300 px-4 py-2">PCI-DSS, GDPR</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-4 py-2">Vercel</td>
                  <td className="border border-gray-300 px-4 py-2">DDoS protection, edge encryption</td>
                  <td className="border border-gray-300 px-4 py-2">SOC 2 Type II</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* User Security Best Practices */}
        <section className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-yellow-900 mb-4">9. User Security Best Practices</h2>
          <p className="text-gray-800 leading-relaxed mb-4">
            While we implement robust security measures, you play a crucial role in protecting your account:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded border border-yellow-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Do:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Use a strong, unique password (12+ characters)</li>
                <li>Enable Multi-Factor Authentication (MFA)</li>
                <li>Keep your browser and OS updated</li>
                <li>Log out when using shared devices</li>
                <li>Review team member permissions regularly</li>
                <li>Report suspicious activity immediately</li>
              </ul>
            </div>
            <div className="bg-white rounded border border-yellow-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Don't:</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm ml-4">
                <li>Share your password with anyone</li>
                <li>Reuse passwords across multiple sites</li>
                <li>Click suspicious links in emails</li>
                <li>Use public Wi-Fi without a VPN</li>
                <li>Store passwords in plain text</li>
                <li>Ignore security warnings or alerts</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Vulnerability Disclosure */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Responsible Vulnerability Disclosure</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We welcome security researchers to report vulnerabilities responsibly. If you discover a security issue:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Report</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm ml-4 mb-3">
              <li>Email: <a href="mailto:security@synqall.com" className="text-blue-600 underline">security@synqall.com</a></li>
              <li>Include detailed steps to reproduce the vulnerability</li>
              <li>Do NOT publicly disclose the vulnerability until we've addressed it</li>
              <li>Allow us 90 days to fix the issue before public disclosure</li>
            </ul>
            <p className="text-sm text-gray-700 mt-3">
              <strong>Response Time:</strong> We acknowledge all reports within 48 hours and provide regular updates.
            </p>
            <p className="text-sm text-green-700 font-semibold mt-2">
              We do not currently offer a bug bounty program, but we publicly acknowledge responsible disclosures
              (with your permission).
            </p>
          </div>
        </section>

        {/* Contact Security Team */}
        <section className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-4">Contact Our Security Team</h2>
          <p className="text-gray-800 leading-relaxed mb-3">
            For security inquiries, vulnerability reports, or concerns, contact our security team:
          </p>
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <p className="text-gray-800 font-semibold">Nikola Innovations Limited</p>
            <p className="text-gray-700">Security Team</p>
            <p className="text-gray-700">Email: <a href="mailto:security@synqall.com" className="text-blue-600 underline">security@synqall.com</a></p>
            <p className="text-gray-700">General Support: <a href="mailto:support@synqall.com" className="text-blue-600 underline">support@synqall.com</a></p>
            <p className="text-gray-700">Website: <a href="https://synqall.com" className="text-blue-600 underline">https://synqall.com</a></p>
          </div>
        </section>

        {/* Related Policies */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Policies</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="/privacy" className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Privacy Policy</h3>
              <p className="text-sm text-gray-600">How we collect and use your data</p>
            </a>
            <a href="/gdpr" className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">GDPR Compliance</h3>
              <p className="text-sm text-gray-600">Your data protection rights</p>
            </a>
            <a href="/terms" className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Terms of Service</h3>
              <p className="text-sm text-gray-600">Agreement and usage terms</p>
            </a>
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
