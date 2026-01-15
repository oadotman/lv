'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatPhoneNumber } from '@/lib/utils';

interface ClickToCallProps {
  phoneNumber: string;
  contactName?: string;
  contactId?: string;
  contactType?: 'carrier' | 'shipper' | 'broker' | 'other';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  showLabel?: boolean;
}

export function ClickToCall({
  phoneNumber,
  contactName,
  contactId,
  contactType,
  size = 'default',
  variant = 'outline',
  className = '',
  showLabel = true,
}: ClickToCallProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [notes, setNotes] = useState('');
  const [callSession, setCallSession] = useState<{
    callSid: string;
    sessionId: string;
  } | null>(null);
  const [callStatus, setCallStatus] = useState<string>('');

  const initiateCall = async () => {
    setIsCalling(true);
    setCallStatus('Initiating call...');

    try {
      const response = await fetch('/api/twilio/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toNumber: phoneNumber,
          contactId,
          contactType,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate call');
      }

      setCallSession({
        callSid: data.callSid,
        sessionId: data.sessionId,
      });

      setCallStatus('Calling...');
      toast.success(`Calling ${formatPhoneNumber(phoneNumber)}`);

      // Poll for call status
      pollCallStatus(data.callSid);
    } catch (error) {
      console.error('Call error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate call');
      setIsCalling(false);
      setCallStatus('');
      setIsDialogOpen(false);
    }
  };

  const pollCallStatus = async (callSid: string) => {
    const maxAttempts = 60; // Poll for up to 1 minute
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/twilio/call?sid=${callSid}`);
        const data = await response.json();

        switch (data.status) {
          case 'completed':
            setCallStatus('Call completed');
            clearInterval(interval);
            setIsCalling(false);
            setIsDialogOpen(false);
            toast.success(
              `Call completed (${Math.floor(data.duration / 60)}:${String(
                data.duration % 60
              ).padStart(2, '0')})`
            );
            break;
          case 'busy':
            setCallStatus('Line busy');
            clearInterval(interval);
            setIsCalling(false);
            toast.error('Line was busy');
            break;
          case 'no-answer':
            setCallStatus('No answer');
            clearInterval(interval);
            setIsCalling(false);
            toast.error('No answer');
            break;
          case 'failed':
            setCallStatus('Call failed');
            clearInterval(interval);
            setIsCalling(false);
            toast.error('Call failed');
            break;
          case 'in-progress':
            setCallStatus('Connected');
            break;
          case 'ringing':
            setCallStatus('Ringing...');
            break;
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIsCalling(false);
          setCallStatus('');
        }
      } catch (error) {
        console.error('Status poll error:', error);
        clearInterval(interval);
        setIsCalling(false);
        setCallStatus('');
      }
    }, 1000);
  };

  const handleClick = () => {
    if (!phoneNumber) {
      toast.error('No phone number provided');
      return;
    }

    setIsDialogOpen(true);
  };

  const endCall = () => {
    // In a real implementation, this would end the call via Twilio API
    setIsCalling(false);
    setCallStatus('');
    setIsDialogOpen(false);
    toast.info('Call ended');
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={!phoneNumber}
      >
        <Phone className={size === 'icon' ? 'w-4 h-4' : 'w-4 h-4 mr-2'} />
        {showLabel && size !== 'icon' && 'Call'}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isCalling ? 'Call in Progress' : 'Make a Call'}
            </DialogTitle>
            <DialogDescription>
              {isCalling
                ? callStatus
                : `Call ${contactName || formatPhoneNumber(phoneNumber)}`}
            </DialogDescription>
          </DialogHeader>

          {!isCalling ? (
            <div className="space-y-4">
              <div>
                <Label>Calling</Label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-semibold">
                    {formatPhoneNumber(phoneNumber)}
                  </p>
                  {contactType && (
                    <Badge variant="secondary" className="capitalize">
                      {contactType}
                    </Badge>
                  )}
                </div>
                {contactName && (
                  <p className="text-sm text-gray-500 mt-1">{contactName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this call..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Phone className="w-16 h-16 text-blue-600" />
                  <div className="absolute -bottom-1 -right-1">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {formatPhoneNumber(phoneNumber)}
                </p>
                <p className="text-sm text-gray-500 mt-1">{callStatus}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            {!isCalling ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={initiateCall}>
                  <Phone className="w-4 h-4 mr-2" />
                  Start Call
                </Button>
              </>
            ) : (
              <Button
                variant="destructive"
                onClick={endCall}
                className="w-full"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                End Call
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Inline click-to-call for phone numbers in text
 */
export function PhoneLink({
  phoneNumber,
  className = '',
}: {
  phoneNumber: string;
  className?: string;
}) {
  return (
    <ClickToCall
      phoneNumber={phoneNumber}
      variant="ghost"
      size="sm"
      className={`p-0 h-auto font-normal ${className}`}
      showLabel={false}
    />
  );
}