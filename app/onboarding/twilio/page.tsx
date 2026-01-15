'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Dynamic import to avoid SSR issues
const TwilioSetupWizard = dynamic(() => import('@/components/twilio/SetupWizard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 to-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading setup wizard...</p>
      </div>
    </div>
  )
});

export default function TwilioOnboardingPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          router.push('/login?redirect=/onboarding/twilio');
          return;
        }
        const data = await response.json();
        setUserEmail(data.email);
      } catch (error) {
        router.push('/login?redirect=/onboarding/twilio');
      }
    };
    checkAuth();
  }, [router]);

  const handleSetupComplete = (phoneNumber: string) => {
    // Navigate to the dashboard after successful setup
    router.push('/calls?setup=complete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black text-white">
      {/* Header */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/calls">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Skip Setup
            </Button>
          </Link>
          <div className="text-sm text-gray-400">
            Logged in as: {userEmail}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-5xl mx-auto px-6 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to LoadVoice!
          </h1>
          <p className="text-xl text-gray-300">
            Let's get your call forwarding set up in less than 2 minutes
          </p>
        </div>

        {/* Setup Wizard */}
        <TwilioSetupWizard onComplete={handleSetupComplete} />
      </div>
    </div>
  );
}