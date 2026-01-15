/**
 * LoadVoice Onboarding Flow
 * Minimal signup → First extraction → Complete profile
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Upload,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Play,
  Headphones,
  FileText,
  Users,
  CreditCard
} from 'lucide-react';
import { LoadVoiceLogo, ExtractionProgress } from '@/components/ui/loadvoice-polish';
import { createBrowserClient } from '@supabase/ssr';

// Onboarding steps
const STEPS = [
  { id: 'welcome', title: 'Welcome to LoadVoice', icon: Truck },
  { id: 'demo', title: 'See the Magic', icon: Sparkles },
  { id: 'first-extraction', title: 'Try It Yourself', icon: Upload },
  { id: 'setup-team', title: 'Set Up Your Team', icon: Users },
  { id: 'choose-plan', title: 'Choose Your Plan', icon: CreditCard },
  { id: 'complete', title: "You're All Set!", icon: CheckCircle }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({
    companyName: '',
    phoneNumber: '',
    monthlyLoads: '',
    teamSize: '',
    currentTools: '',
    selectedPlan: ''
  });
  const [demoStarted, setDemoStarted] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check if user is authenticated
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/signup?redirect=onboarding');
    }
  }

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function previousStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function completeOnboarding() {
    // Save user data to profile
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('profiles')
        .update({
          company_name: userData.companyName,
          phone_number: userData.phoneNumber,
          onboarding_completed: true,
          onboarding_data: userData
        })
        .eq('id', user.id);
    }

    // Redirect to dashboard
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-sky-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Step indicator */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-lg">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center ${index <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}
              >
                <Icon className="w-4 h-4" />
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 ml-2 ${index < currentStep ? 'bg-blue-600' : 'bg-gray-300'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center min-h-screen px-4 py-20">
        <AnimatePresence mode="wait">
          {currentStep === 0 && <WelcomeStep onNext={nextStep} />}
          {currentStep === 1 && <DemoStep onNext={nextStep} demoStarted={demoStarted} setDemoStarted={setDemoStarted} />}
          {currentStep === 2 && <FirstExtractionStep onNext={nextStep} setExtractionComplete={setExtractionComplete} />}
          {currentStep === 3 && <TeamSetupStep onNext={nextStep} userData={userData} setUserData={setUserData} />}
          {currentStep === 4 && <PlanSelectionStep onNext={nextStep} userData={userData} setUserData={setUserData} />}
          {currentStep === 5 && <CompleteStep onComplete={completeOnboarding} userData={userData} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Step 1: Welcome
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-2xl w-full"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <LoadVoiceLogo size="lg" />
        <h1 className="text-4xl font-bold text-gray-900 mt-6">
          Welcome to LoadVoice
        </h1>
        <p className="text-xl text-gray-600 mt-4">
          Upload calls. Extract data. Build your CRM.
          <br />
          <span className="font-semibold text-blue-600">Automatically, while you work.</span>
        </p>

        <div className="grid grid-cols-3 gap-4 mt-8 mb-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Headphones className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600">Upload Calls</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-6 h-6 text-sky-600" />
            </div>
            <p className="text-sm text-gray-600">AI Extraction</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">Rate Cons</p>
          </div>
        </div>

        <button
          onClick={onNext}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center"
        >
          Get Started
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>

        <p className="text-sm text-gray-500 mt-4">
          3-minute setup • No credit card required • 60 minutes free
        </p>
      </div>
    </motion.div>
  );
}

// Step 2: Demo
function DemoStep({
  onNext,
  demoStarted,
  setDemoStarted
}: {
  onNext: () => void;
  demoStarted: boolean;
  setDemoStarted: (val: boolean) => void;
}) {
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'processing' | 'complete'>('idle');

  useEffect(() => {
    if (demoStarted) {
      // Simulate extraction process
      setTimeout(() => setExtractionStatus('processing'), 500);
      setTimeout(() => setExtractionStatus('complete'), 3000);
    }
  }, [demoStarted]);

  return (
    <motion.div
      key="demo"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-4xl w-full"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-6">
          See LoadVoice in Action
        </h2>

        {!demoStarted ? (
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Watch how we extract load details from a real freight call in seconds
            </p>
            <button
              onClick={() => setDemoStarted(true)}
              className="bg-sky-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-sky-700 transition-colors inline-flex items-center"
            >
              <Play className="mr-2 w-5 h-5" />
              Play Demo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Demo call transcript */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2 font-semibold">Sample Call Transcript:</p>
              <p className="text-sm text-gray-700 italic">
                "Hi, this is Mike from ABC Logistics. I need a flatbed to move 42,000 pounds of steel
                from Chicago to Nashville. Pickup tomorrow morning, deliver by Friday.
                Looking to pay around $2,800..."
              </p>
            </div>

            {/* Extraction progress */}
            {extractionStatus === 'processing' && (
              <ExtractionProgress
                status="extracting"
                progress={60}
                message="Extracting freight details..."
              />
            )}

            {/* Extracted data */}
            {extractionStatus === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mr-2" />
                  <span className="text-lg font-semibold text-green-600">Extraction Complete!</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs text-blue-600 font-semibold mb-2">ORIGIN</p>
                    <p className="font-medium">Chicago, IL</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs text-blue-600 font-semibold mb-2">DESTINATION</p>
                    <p className="font-medium">Nashville, TN</p>
                  </div>
                  <div className="bg-sky-50 rounded-lg p-4">
                    <p className="text-xs text-sky-600 font-semibold mb-2">COMMODITY</p>
                    <p className="font-medium">Steel (42,000 lbs)</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-xs text-green-600 font-semibold mb-2">RATE</p>
                    <p className="font-medium">$2,800</p>
                  </div>
                </div>

                <button
                  onClick={onNext}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Try It Yourself
                  <ArrowRight className="inline ml-2 w-5 h-5" />
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Step 3: First Extraction
function FirstExtractionStep({
  onNext,
  setExtractionComplete
}: {
  onNext: () => void;
  setExtractionComplete: (val: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setExtractionStatus('uploading');

    // Simulate upload and extraction
    setTimeout(() => setExtractionStatus('processing'), 1000);
    setTimeout(() => {
      setExtractionStatus('complete');
      setExtractionComplete(true);
      setUploading(false);
    }, 4000);
  }

  return (
    <motion.div
      key="first-extraction"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-2xl w-full"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-6">
          Upload Your First Call
        </h2>

        {extractionStatus === 'idle' && (
          <>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Drag and drop your audio file here, or click to browse
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors inline-block"
              >
                Choose File
              </label>
              {file && (
                <p className="mt-4 text-sm text-gray-600">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {file && (
              <button
                onClick={handleUpload}
                className="w-full mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Extraction
              </button>
            )}

            <div className="mt-6 bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">No audio file?</span> No problem!
                <button
                  onClick={handleUpload}
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Use sample call
                </button>
              </p>
            </div>
          </>
        )}

        {extractionStatus !== 'idle' && extractionStatus !== 'complete' && (
          <ExtractionProgress
            status={extractionStatus}
            progress={extractionStatus === 'uploading' ? 30 : 70}
            message={extractionStatus === 'uploading' ? 'Uploading file...' : 'Extracting freight details...'}
          />
        )}

        {extractionStatus === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Extraction Complete!
            </h3>
            <p className="text-gray-600 mb-6">
              Your first call has been successfully processed
            </p>
            <button
              onClick={onNext}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue Setup
              <ArrowRight className="inline ml-2 w-5 h-5" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Step 4: Team Setup
function TeamSetupStep({
  onNext,
  userData,
  setUserData
}: {
  onNext: () => void;
  userData: any;
  setUserData: (data: any) => void;
}) {
  return (
    <motion.div
      key="team-setup"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-2xl w-full"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-6">
          Tell Us About Your Business
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={userData.companyName}
              onChange={(e) => setUserData({ ...userData, companyName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ABC Logistics Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={userData.phoneNumber}
              onChange={(e) => setUserData({ ...userData, phoneNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How many loads do you handle per month?
            </label>
            <select
              value={userData.monthlyLoads}
              onChange={(e) => setUserData({ ...userData, monthlyLoads: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select range</option>
              <option value="1-50">1-50 loads</option>
              <option value="51-200">51-200 loads</option>
              <option value="201-500">201-500 loads</option>
              <option value="500+">500+ loads</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Size
            </label>
            <select
              value={userData.teamSize}
              onChange={(e) => setUserData({ ...userData, teamSize: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select size</option>
              <option value="1">Just me</option>
              <option value="2-5">2-5 people</option>
              <option value="6-10">6-10 people</option>
              <option value="11+">11+ people</option>
            </select>
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={!userData.companyName || !userData.monthlyLoads}
          className="w-full mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          Continue
          <ArrowRight className="inline ml-2 w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

// Step 5: Plan Selection
function PlanSelectionStep({
  onNext,
  userData,
  setUserData
}: {
  onNext: () => void;
  userData: any;
  setUserData: (data: any) => void;
}) {
  const plans = [
    { id: 'starter', name: 'Starter', price: '$99/mo', minutes: '500 min', recommended: userData.teamSize === '1' },
    { id: 'pro', name: 'Professional', price: '$199/mo', minutes: '1,500 min', recommended: userData.teamSize === '2-5' },
    { id: 'team', name: 'Team', price: '$349/mo', minutes: '4,000 min', recommended: userData.teamSize === '6-10' }
  ];

  return (
    <motion.div
      key="plan-selection"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="max-w-4xl w-full"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-6">
          Choose Your Plan
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Start with 60 minutes free. Upgrade anytime.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ scale: 1.02 }}
              className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                userData.selectedPlan === plan.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setUserData({ ...userData, selectedPlan: plan.id })}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">{plan.price}</p>
              <p className="text-sm text-gray-600 mb-4">{plan.minutes}/month</p>
              <div className="flex items-center justify-center">
                {userData.selectedPlan === plan.id ? (
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <button
          onClick={onNext}
          disabled={!userData.selectedPlan}
          className="w-full mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
        >
          Complete Setup
          <ArrowRight className="inline ml-2 w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

// Step 6: Complete
function CompleteStep({
  onComplete,
  userData
}: {
  onComplete: () => void;
  userData: any;
}) {
  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-2xl w-full"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
        </motion.div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to LoadVoice, {userData.companyName}!
        </h2>

        <p className="text-lg text-gray-600 mb-8">
          Your account is ready. Let's start building your freight CRM.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Start Guide:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              Upload shipper and carrier calls
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              AI extracts all load details in 60 seconds
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              Auto-populate your carriers and shippers database
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              Generate rate confirmations with one click
            </li>
          </ul>
        </div>

        <button
          onClick={onComplete}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>

        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact support@loadvoice.com or check our
          <a href="/help" className="text-blue-600 hover:underline ml-1">help center</a>
        </p>
      </div>
    </motion.div>
  );
}