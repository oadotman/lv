'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, FileText } from 'lucide-react';
import { SignatureCapture, SignatureData } from '@/components/signature/SignatureCapture';

export default function AcceptRateConfirmationPage() {
  const params = useParams();
  const trackingToken = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateConfirmation, setRateConfirmation] = useState<any>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [signatureInfo, setSignatureInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    checkSignatureStatus();
  }, [trackingToken]);

  const checkSignatureStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if already signed
      const statusResponse = await fetch(`/api/rate-confirmations/sign?tracking_token=${trackingToken}`);
      const statusData = await statusResponse.json();

      if (statusResponse.ok && statusData.is_signed) {
        setIsSigned(true);
        setSignatureInfo(statusData);
        setLoading(false);
        return;
      }

      // Get rate confirmation details
      // This would need a public endpoint that accepts tracking tokens
      // For now, we'll simulate with the data we have

      // Track view
      await fetch('/api/rate-confirmations/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_token: trackingToken,
          action: 'view'
        })
      });

      // Simulate rate confirmation data
      setRateConfirmation({
        rate_con_number: 'RC-20250103-001',
        pdf_url: '/api/rate-confirmations/pdf/' + trackingToken,
        carrier_name: 'Sample Carrier LLC',
        load: {
          origin_city: 'Chicago',
          origin_state: 'IL',
          destination_city: 'Nashville',
          destination_state: 'TN'
        }
      });

    } catch (err) {
      console.error('Error checking signature status:', err);
      setError('Failed to load rate confirmation. Please check the link and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureComplete = async (signatureData: SignatureData) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/rate-confirmations/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_token: trackingToken,
          signature_data: signatureData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit signature');
      }

      setSubmitted(true);
      setSignatureInfo({
        signed_at: signatureData.signedAt,
        signed_by: signatureData.signerName
      });

      // Track download for the signed version
      await fetch('/api/rate-confirmations/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_token: trackingToken,
          action: 'download'
        })
      });

    } catch (err) {
      console.error('Error submitting signature:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading rate confirmation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !rateConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSigned || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 bg-green-100 rounded-full p-3 w-fit">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Rate Confirmation Signed</CardTitle>
            <CardDescription>
              Thank you for accepting the rate confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Rate Confirmation:</span>
                <span className="font-medium">{rateConfirmation?.rate_con_number || 'RC-XXXXX'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Signed By:</span>
                <span className="font-medium">{signatureInfo?.signed_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Signed At:</span>
                <span className="font-medium">
                  {new Date(signatureInfo?.signed_at).toLocaleString()}
                </span>
              </div>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                A confirmation email has been sent with the signed rate confirmation attached.
                Please keep this for your records.
              </AlertDescription>
            </Alert>

            <div className="pt-4">
              <p className="text-sm text-gray-600 text-center">
                You may now close this window.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rate Confirmation Acceptance
          </h1>
          <p className="text-gray-600">
            Please review and sign the rate confirmation below
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Signature Capture Component */}
        <SignatureCapture
          onSignatureComplete={handleSignatureComplete}
          pdfUrl={rateConfirmation?.pdf_url || ''}
          rateConNumber={rateConfirmation?.rate_con_number || ''}
          carrierName={rateConfirmation?.carrier_name}
          showTermsAcceptance={true}
          termsText="I am authorized to sign on behalf of the carrier and agree to all terms and conditions specified in this rate confirmation. I acknowledge that this electronic signature is legally binding and has the same force and effect as a manual signature."
        />

        {/* Submitting Overlay */}
        {submitting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-gray-600">Submitting signature...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}