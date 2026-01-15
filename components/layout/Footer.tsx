"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { useState } from "react";

export function Footer() {
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  const handleCookieSettings = () => {
    // This will be connected to the cookie consent banner when implemented
    setShowCookieSettings(true);
    // Trigger cookie banner to reappear
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cookie_consent');
      window.location.reload();
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">LoadVoice</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              AI-powered CRM automation from sales call recordings. Transcribe, extract, and sync data effortlessly.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-blue-600 transition">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/calls" className="text-gray-600 hover:text-blue-600 transition">
                  Calls
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-gray-600 hover:text-blue-600 transition">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-600 hover:text-blue-600 transition">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-blue-600 transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/analytics" className="text-gray-600 hover:text-blue-600 transition">
                  Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-gray-600 hover:text-blue-600 transition">
                  Help Center
                </Link>
              </li>
              <li>
                <a href="mailto:support@loadvoice.com" className="text-gray-600 hover:text-blue-600 transition">
                  Contact Support
                </a>
              </li>
              <li>
                <Link href="/settings" className="text-gray-600 hover:text-blue-600 transition">
                  Account Settings
                </Link>
              </li>
              <li>
                <Link href="/settings/team" className="text-gray-600 hover:text-blue-600 transition">
                  Team Management
                </Link>
              </li>
              <li>
                <Link href="/partners" className="text-gray-600 hover:text-blue-600 transition font-medium">
                  Partners
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-blue-600 transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-gray-600 hover:text-blue-600 transition">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/gdpr" className="text-gray-600 hover:text-blue-600 transition">
                  GDPR Compliance
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-gray-600 hover:text-blue-600 transition">
                  Data Security
                </Link>
              </li>
              <li>
                <button
                  onClick={handleCookieSettings}
                  className="text-gray-600 hover:text-blue-600 transition text-left"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 text-center md:text-left">
            <p>© 2025 LoadVoice. All rights reserved.</p>
            <p className="text-xs text-gray-500 mt-1">
              LoadVoice is owned and operated by Nikola Innovations Limited.
            </p>
          </div>

          {/* Social Links (Placeholder) */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/loadvoice"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition"
              aria-label="Twitter"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
            <a
              href="https://linkedin.com/company/loadvoice"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition"
              aria-label="LinkedIn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
