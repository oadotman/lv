'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PhoneForwarded,
  Phone,
  CheckCircle,
  Check,
  Copy,
  ArrowRight,
  Loader2,
  AlertCircle,
  Settings,
  Zap,
  Info,
  Shield,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface TwilioSetupWizardProps {
  onComplete?: (phoneNumber: string) => void;
  embedded?: boolean;
}

export default function TwilioSetupWizard({ onComplete, embedded = false }: TwilioSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [forwardingMethod, setForwardingMethod] = useState<'unconditional' | 'busy' | 'no-answer'>('unconditional');
  const [setupComplete, setSetupComplete] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // Common US area codes for freight hubs
  const commonAreaCodes = [
    { code: '312', city: 'Chicago, IL' },
    { code: '404', city: 'Atlanta, GA' },
    { code: '214', city: 'Dallas, TX' },
    { code: '213', city: 'Los Angeles, CA' },
    { code: '305', city: 'Miami, FL' },
    { code: '615', city: 'Nashville, TN' },
    { code: '602', city: 'Phoenix, AZ' },
    { code: '206', city: 'Seattle, WA' },
    { code: '617', city: 'Boston, MA' },
    { code: '713', city: 'Houston, TX' }
  ];

  const provisionNumber = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/twilio/provision-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ areaCode })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to provision number');
      }

      const data = await response.json();

      if (data.isExisting) {
        // User already has a number
        setPhoneNumber(data.phoneNumber);
        toast.info('You already have a LoadVoice number!');
      } else {
        // New number provisioned
        setPhoneNumber(data.phoneNumber);
        toast.success('Your LoadVoice number is ready!');
      }

      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to provision number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Number copied to clipboard');
  };

  const completeSetup = async () => {
    setLoading(true);
    try {
      // If user wants to forward their existing number, save the configuration
      if (businessPhone) {
        const response = await fetch('/api/twilio/configure-forwarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber,
            businessPhone,
            forwardingMethod
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save forwarding configuration');
        }
      }

      setSetupComplete(true);
      setStep(3);

      if (businessPhone) {
        toast.success('Setup complete! Now contact your phone provider to forward calls.');
      } else {
        toast.success('Setup complete! Your LoadVoice number is ready to use.');
      }

      if (onComplete) {
        onComplete(phoneNumber);
      }
    } catch (error) {
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${embedded ? '' : 'min-h-screen bg-gradient-to-b from-purple-950 to-black text-white p-6'}`}>
      <div className={`${embedded ? '' : 'container max-w-4xl mx-auto'}`}>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step >= s
                    ? 'bg-purple-600 border-purple-600'
                    : 'border-gray-600'
                }`}>
                  {step > s ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <span className="text-sm font-semibold">{s}</span>
                  )}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    step > s ? 'bg-purple-600' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            <span className={step >= 1 ? 'text-purple-400' : 'text-gray-500'}>Get Number</span>
            <span className={step >= 2 ? 'text-purple-400' : 'text-gray-500'}>Configure</span>
            <span className={step >= 3 ? 'text-purple-400' : 'text-gray-500'}>Complete</span>
          </div>
        </div>

        {/* Step 1: Get Your Number */}
        {step === 1 && (
          <Card className="bg-purple-900/20 border-purple-700/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-600">
                  <Phone className="h-6 w-6" />
                </div>
                <Badge className="bg-green-800/30 text-green-300 border-green-700">
                  30 seconds
                </Badge>
              </div>
              <CardTitle className="text-2xl">Get Your LoadVoice Number</CardTitle>
              <CardDescription className="text-gray-300">
                Choose an area code and we'll instantly provision a dedicated phone number for your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="area-code">Select Your Area Code</Label>
                <Select value={areaCode} onValueChange={setAreaCode}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose an area code..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        Use my local area code (Auto-detect)
                      </div>
                    </SelectItem>
                    {commonAreaCodes.map((ac) => (
                      <SelectItem key={ac.code} value={ac.code}>
                        {ac.code} - {ac.city}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Enter custom area code...</SelectItem>
                  </SelectContent>
                </Select>

                {areaCode === 'custom' && (
                  <Input
                    className="mt-3"
                    placeholder="Enter 3-digit area code"
                    maxLength={3}
                    onChange={(e) => setAreaCode(e.target.value)}
                  />
                )}
              </div>

              <Alert className="bg-blue-900/20 border-blue-700/50">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-gray-300">
                  Your LoadVoice number will be your dedicated line for all freight calls.
                  Calls to this number are automatically recorded, transcribed, and documented in your CRM.
                </AlertDescription>
              </Alert>

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-gray-400">
                  No setup fees • Cancel anytime
                </div>
                <Button
                  onClick={provisionNumber}
                  disabled={!areaCode || areaCode === 'custom' || loading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      Get My Number
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure Forwarding */}
        {step === 2 && (
          <Card className="bg-purple-900/20 border-purple-700/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <Badge className="bg-green-800/30 text-green-300 border-green-700">
                  Your number is ready!
                </Badge>
              </div>
              <CardTitle className="text-2xl">Configure Call Forwarding</CardTitle>
              <CardDescription className="text-gray-300">
                Set up how calls should be forwarded to LoadVoice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display the new number prominently */}
              <div className="p-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl border border-purple-600/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Your LoadVoice Number</p>
                    <p className="text-3xl font-mono font-bold text-purple-300">
                      {phoneNumber || '+1 (312) 555-0100'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={copyToClipboard}
                    className="border-purple-600"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Forwarding Options */}
              <Tabs defaultValue="option1" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-purple-900/30">
                  <TabsTrigger value="option1">Option 1: Use Directly</TabsTrigger>
                  <TabsTrigger value="option2">Option 2: Forward Existing</TabsTrigger>
                </TabsList>

                <TabsContent value="option1" className="space-y-4 mt-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Recommended: Use LoadVoice Number Directly
                    </h4>
                    <p className="text-gray-300 text-sm">
                      Give this number to carriers and shippers. All calls are automatically documented.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                        <span>Instant setup - no configuration needed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                        <span>Works immediately</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                        <span>Perfect call quality</span>
                      </li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="option2" className="space-y-4 mt-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <PhoneForwarded className="h-5 w-5 text-blue-500" />
                      Forward Your Existing Number
                    </h4>
                    <p className="text-gray-300 text-sm">
                      Keep your current business number and forward calls to LoadVoice.
                    </p>

                    <div>
                      <Label htmlFor="business-phone">Your Business Phone Number</Label>
                      <Input
                        id="business-phone"
                        className="mt-2"
                        placeholder="+1 (555) 123-4567"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Forwarding Type</Label>
                      <Select value={forwardingMethod} onValueChange={(v: any) => setForwardingMethod(v)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unconditional">
                            <div>
                              <div className="font-medium">Always Forward</div>
                              <div className="text-xs text-gray-500">All calls go to LoadVoice</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="busy">
                            <div>
                              <div className="font-medium">Forward When Busy</div>
                              <div className="text-xs text-gray-500">Only when you're on another call</div>
                            </div>
                          </SelectItem>
                          <SelectItem value="no-answer">
                            <div>
                              <div className="font-medium">Forward When No Answer</div>
                              <div className="text-xs text-gray-500">After 4 rings</div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Alert className="bg-yellow-900/20 border-yellow-700/50">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                      <AlertDescription className="text-gray-300">
                        <strong>Setup Instructions:</strong> Contact your phone provider and request call forwarding to {phoneNumber}
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  onClick={completeSetup}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-green-500"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing Setup...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card className="bg-gradient-to-r from-green-900/20 to-green-800/20 border-green-700/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-green-600">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <Badge className="bg-green-800/30 text-green-300 border-green-700">
                  Setup Complete!
                </Badge>
              </div>
              <CardTitle className="text-3xl">You're All Set!</CardTitle>
              <CardDescription className="text-gray-300 text-lg">
                Your LoadVoice system is now active and ready to document calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Success Summary */}
              <div className="p-6 bg-purple-900/30 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Your LoadVoice Number:</span>
                  <span className="font-mono text-lg text-purple-300">{phoneNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <Badge className="bg-green-800/30 text-green-300 border-green-700">
                    <span className="animate-pulse mr-1">●</span> Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Recording:</span>
                  <span className="text-green-400">Enabled with compliance</span>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">What Happens Next?</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-purple-600 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Automatic Call Recording</p>
                      <p className="text-gray-400">Every call is recorded with two-party consent compliance</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-purple-600 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">AI Transcription & Extraction</p>
                      <p className="text-gray-400">Load details, carrier info, and rates extracted in real-time</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded bg-purple-600 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Instant CRM Updates</p>
                      <p className="text-gray-400">All data automatically added to your LoadVoice CRM</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Call CTA */}
              <Alert className="bg-blue-900/20 border-blue-700/50">
                <Phone className="h-4 w-4 text-blue-400" />
                <AlertDescription>
                  <strong>Ready to test?</strong> Make a test call to your LoadVoice number now.
                  Talk about a freight load and see it appear in your dashboard instantly!
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => router.push('/calls')}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <PhoneForwarded className="h-4 w-4 mr-2" />
                  View Calls Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/settings/twilio')}
                  className="border-purple-600"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        {!embedded && (
          <Alert className="mt-6 bg-purple-900/20 border-purple-700/50">
            <Shield className="h-4 w-4 text-purple-400" />
            <AlertDescription className="text-gray-300">
              <strong>Bank-Level Security:</strong> All calls are encrypted end-to-end.
              LoadVoice is SOC 2 Type II certified and HIPAA compliant.
              Your data is never shared or used for training AI models.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}