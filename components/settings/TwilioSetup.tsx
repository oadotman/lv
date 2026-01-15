'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Phone, Check, AlertCircle, Copy, Settings, Trash2, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/lib/hooks/useOrganization';

interface PhoneNumber {
  id: string;
  twilio_number: string;
  friendly_name: string;
  forward_to: string | null;
  status: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
    fax: boolean;
  };
  metadata: {
    region?: string;
    locality?: string;
    rate_center?: string;
  };
}

export function TwilioSetup() {
  const { organization } = useOrganization();
  const [phones, setPhones] = useState<PhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [forwardTo, setForwardTo] = useState('');

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/twilio/setup');
      const data = await response.json();
      setPhones(data.phones || []);
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error);
      toast.error('Failed to load phone numbers');
    } finally {
      setIsLoading(false);
    }
  };

  const provisionNumber = async () => {
    if (!organization) {
      toast.error('No organization found');
      return;
    }

    setIsProvisioning(true);
    try {
      const response = await fetch('/api/twilio/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          areaCode: areaCode || undefined,
          forwardTo: forwardTo || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to provision number');
      }

      toast.success(`Phone number ${data.phoneNumber} provisioned successfully!`);
      setShowSetupDialog(false);
      setAreaCode('');
      setForwardTo('');
      await fetchPhoneNumbers();
    } catch (error) {
      console.error('Provisioning error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to provision number');
    } finally {
      setIsProvisioning(false);
    }
  };

  const releaseNumber = async (phoneId: string) => {
    if (!confirm('Are you sure you want to release this phone number? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/twilio/setup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneId }),
      });

      if (!response.ok) {
        throw new Error('Failed to release number');
      }

      toast.success('Phone number released successfully');
      await fetchPhoneNumbers();
    } catch (error) {
      console.error('Release error:', error);
      toast.error('Failed to release phone number');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const testCall = (phoneNumber: string) => {
    // This would trigger a test call
    toast.info('Test call feature coming soon!');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const hasActivePhone = phones.some(p => p.status === 'active');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Automatic Call Recording
              </CardTitle>
              <CardDescription>
                Never manually upload a call again - all calls auto-record and process
              </CardDescription>
            </div>
            {hasActivePhone && (
              <Badge variant="default" className="bg-green-600">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasActivePhone ? (
            <>
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>How LoadVoice Call Recording Works</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>We provide you with a dedicated phone number</li>
                    <li>Forward your business calls to this number (or use it directly)</li>
                    <li>All calls automatically record and get processed by LoadVoice</li>
                    <li>Keep your existing number - your clients won't notice any change</li>
                    <li>Recordings appear instantly in your LoadVoice dashboard</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Ready to automate?</h3>
                <p className="text-gray-600 mb-4">
                  Get your LoadVoice phone number and start recording calls automatically.
                  Setup takes less than 2 minutes.
                </p>
                <Button
                  size="lg"
                  onClick={() => setShowSetupDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Get Your Recording Number
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {phones.filter(p => p.status === 'active').map((phone) => (
                <div key={phone.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Label className="text-sm text-gray-500">Your LoadVoice Number</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-mono font-semibold">
                          {phone.twilio_number}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(phone.twilio_number)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {phone.metadata.locality && (
                        <p className="text-sm text-gray-500 mt-1">
                          {phone.metadata.locality}, {phone.metadata.region}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testCall(phone.twilio_number)}
                      >
                        <PhoneCall className="w-4 h-4 mr-1" />
                        Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => releaseNumber(phone.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {phone.forward_to && (
                    <div>
                      <Label className="text-sm text-gray-500">Forwarding To</Label>
                      <p className="font-mono">{phone.forward_to}</p>
                    </div>
                  )}

                  <Tabs defaultValue="forward" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="forward">Call Forwarding</TabsTrigger>
                      <TabsTrigger value="direct">Direct Use</TabsTrigger>
                    </TabsList>

                    <TabsContent value="forward" className="space-y-3">
                      <Alert>
                        <Check className="w-4 h-4" />
                        <AlertTitle>Setup Instructions</AlertTitle>
                        <AlertDescription className="mt-2">
                          <ol className="list-decimal ml-5 space-y-1">
                            <li>Call your phone service provider</li>
                            <li>Request: "Please forward all calls to {phone.twilio_number}"</li>
                            <li>That's it! All calls will auto-record and process</li>
                          </ol>
                          <p className="mt-3 text-sm font-semibold">
                            Your clients still call your regular number - they won't know the difference!
                          </p>
                        </AlertDescription>
                      </Alert>
                    </TabsContent>

                    <TabsContent value="direct" className="space-y-3">
                      <Alert>
                        <AlertDescription>
                          Give this number directly to carriers and shippers.
                          All calls will automatically record and process in LoadVoice.
                        </AlertDescription>
                      </Alert>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(phone.twilio_number)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Number
                        </Button>
                        <Button variant="outline">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-2 text-sm">
                    <Badge variant="secondary">
                      Voice {phone.capabilities.voice ? '✓' : '✗'}
                    </Badge>
                    {phone.capabilities.sms && (
                      <Badge variant="secondary">SMS ✓</Badge>
                    )}
                  </div>
                </div>
              ))}

              <Alert className="bg-green-50 border-green-200">
                <Check className="w-4 h-4 text-green-600" />
                <AlertTitle className="text-green-900">Recording Active</AlertTitle>
                <AlertDescription className="text-green-800">
                  All calls to your LoadVoice number are being automatically recorded and processed.
                  Recordings typically appear in your dashboard within 30 seconds of call completion.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Get Your LoadVoice Phone Number</DialogTitle>
            <DialogDescription>
              Set up automatic call recording in seconds
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="areaCode">
                Preferred Area Code (optional)
              </Label>
              <Input
                id="areaCode"
                placeholder="e.g., 212"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                maxLength={3}
              />
              <p className="text-sm text-gray-500">
                Leave blank to get any available number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forwardTo">
                Forward Calls To (optional)
              </Label>
              <Input
                id="forwardTo"
                placeholder="e.g., +1234567890"
                value={forwardTo}
                onChange={(e) => setForwardTo(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                If you want calls forwarded to another number
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Monthly Cost:</strong> ~$1 for the number + $0.0025 per minute recorded.
                Average user: $5-10/month total.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSetupDialog(false)}
              disabled={isProvisioning}
            >
              Cancel
            </Button>
            <Button
              onClick={provisionNumber}
              disabled={isProvisioning}
            >
              {isProvisioning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Provisioning...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Get Number
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}