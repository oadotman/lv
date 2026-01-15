"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie, Settings } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CookiePreferences {
  essential: boolean; // Always true, can't be disabled
  functional: boolean;
  analytics: boolean;
  performance: boolean;
}

const defaultPreferences: CookiePreferences = {
  essential: true,
  functional: true,
  analytics: true,
  performance: true,
};

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has already made a cookie choice
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      try {
        const savedPrefs = JSON.parse(consent);
        setPreferences({ ...defaultPreferences, ...savedPrefs });
      } catch (e) {
        console.error("Failed to parse cookie preferences:", e);
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem("cookie_consent", JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);

    // Apply preferences (disable tracking if analytics/performance are off)
    if (!prefs.analytics) {
      // Disable PostHog or other analytics
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.opt_out_capturing();
      }
    }

    if (!prefs.performance) {
      // Disable Sentry or other performance monitoring
      // This is just a placeholder - actual implementation depends on your monitoring setup
    }
  };

  const acceptAll = () => {
    savePreferences(defaultPreferences);
  };

  const rejectOptional = () => {
    savePreferences({
      essential: true,
      functional: false,
      analytics: false,
      performance: false,
    });
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted || !showBanner) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom duration-300">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl border-2 border-gray-200">
          <div className="p-6">
            {/* Close button */}
            <button
              onClick={() => setShowBanner(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center">
                  <Cookie className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-bold text-gray-900">
                  We value your privacy
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts.
                  Essential cookies are always enabled to ensure the app functions properly. You can customize your
                  preferences or accept all cookies.
                </p>
                <p className="text-xs text-gray-500">
                  By clicking "Accept All", you consent to our use of cookies. Read our{" "}
                  <Link href="/cookies" className="text-blue-600 underline hover:text-blue-700">
                    Cookie Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-blue-600 underline hover:text-blue-700">
                    Privacy Policy
                  </Link>{" "}
                  for more information.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 md:flex-shrink-0 md:justify-center">
                <Button
                  onClick={acceptAll}
                  className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold"
                >
                  Accept All
                </Button>
                <Button
                  onClick={rejectOptional}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Reject Optional
                </Button>
                <Button
                  onClick={() => {
                    setShowBanner(false);
                    setShowSettings(true);
                  }}
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Customize
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Cookie className="w-6 h-6 text-blue-600" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Essential cookies are always enabled as they are necessary for the
              Service to function.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="essential" className="text-base font-semibold text-gray-900">
                    Essential Cookies
                  </Label>
                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold">
                    REQUIRED
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  These cookies are necessary for the Service to function and cannot be disabled. They include
                  authentication, security, and core functionality cookies.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Examples: Session cookies, CSRF tokens, authentication tokens
                </p>
              </div>
              <Switch
                id="essential"
                checked={true}
                disabled={true}
                className="mt-1"
              />
            </div>

            {/* Functional Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="functional" className="text-base font-semibold text-gray-900 mb-1 block">
                  Functional Cookies
                </Label>
                <p className="text-sm text-gray-600 leading-relaxed">
                  These cookies enable enhanced functionality and personalization, such as remembering your
                  preferences and settings.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Examples: Theme preferences, language selection, UI state
                </p>
              </div>
              <Switch
                id="functional"
                checked={preferences.functional}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, functional: checked })
                }
                className="mt-1"
              />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="analytics" className="text-base font-semibold text-gray-900 mb-1 block">
                  Analytics Cookies
                </Label>
                <p className="text-sm text-gray-600 leading-relaxed">
                  These cookies help us understand how users interact with the Service so we can improve it. They
                  collect anonymized data about page views and feature usage.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Third-party: PostHog (product analytics)
                </p>
              </div>
              <Switch
                id="analytics"
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
                className="mt-1"
              />
            </div>

            {/* Performance Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="performance" className="text-base font-semibold text-gray-900 mb-1 block">
                  Performance Cookies
                </Label>
                <p className="text-sm text-gray-600 leading-relaxed">
                  These cookies help us monitor errors, track performance, and ensure the Service runs smoothly.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Third-party: Sentry (error monitoring), Vercel (performance monitoring)
                </p>
              </div>
              <Switch
                id="performance"
                checked={preferences.performance}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, performance: checked })
                }
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
              className="order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={saveCustom}
              className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white order-1 sm:order-2"
            >
              Save Preferences
            </Button>
          </DialogFooter>

          <div className="text-xs text-gray-500 text-center pb-2">
            Learn more in our{" "}
            <Link href="/cookies" className="text-blue-600 underline hover:text-blue-700">
              Cookie Policy
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
