'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Download, Eye, Pen, RefreshCw, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SignatureCaptureProps {
  onSignatureComplete: (data: SignatureData) => void;
  pdfUrl: string;
  rateConNumber: string;
  carrierName?: string;
  showTermsAcceptance?: boolean;
  termsText?: string;
}

export interface SignatureData {
  signatureImage: string; // Base64 encoded PNG
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  signerPhone?: string;
  signedAt: string;
  acceptedTerms: boolean;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

export function SignatureCapture({
  onSignatureComplete,
  pdfUrl,
  rateConNumber,
  carrierName,
  showTermsAcceptance = true,
  termsText = 'I agree to the terms and conditions specified in this rate confirmation. I acknowledge that this electronic signature is legally binding.'
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set up canvas for high DPI displays
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;

    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    context.scale(scale, scale);

    // Set drawing styles
    context.strokeStyle = '#1f2937';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Set background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling while drawing
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!hasSignature) {
      newErrors.signature = 'Signature is required';
    }

    if (!signerName.trim()) {
      newErrors.signerName = 'Name is required';
    }

    if (!signerTitle.trim()) {
      newErrors.signerTitle = 'Title is required';
    }

    if (!signerEmail.trim()) {
      newErrors.signerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail)) {
      newErrors.signerEmail = 'Invalid email format';
    }

    if (showTermsAcceptance && !acceptedTerms) {
      newErrors.acceptedTerms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get signature as base64 PNG
    const signatureImage = canvas.toDataURL('image/png');

    // Gather all signature data
    const signatureData: SignatureData = {
      signatureImage,
      signerName,
      signerTitle,
      signerEmail,
      signerPhone: signerPhone || undefined,
      signedAt: new Date().toISOString(),
      acceptedTerms,
      notes: notes || undefined,
      ipAddress: undefined, // Will be captured server-side
      userAgent: navigator.userAgent
    };

    onSignatureComplete(signatureData);
  };

  return (
    <div className="space-y-6">
      {/* PDF Preview/Download Section */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Confirmation Document</CardTitle>
          <CardDescription>
            Please review the rate confirmation before signing
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline" onClick={() => window.open(pdfUrl, '_blank')}>
            <Eye className="h-4 w-4 mr-2" />
            View PDF
          </Button>
          <Button variant="outline" onClick={() => {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${rateConNumber}.pdf`;
            link.click();
          }}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </CardContent>
      </Card>

      {/* Signer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Signer Information</CardTitle>
          <CardDescription>
            {carrierName && `Signing on behalf of ${carrierName}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="signerName">Full Name *</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="John Doe"
                className={errors.signerName ? 'border-red-500' : ''}
              />
              {errors.signerName && (
                <p className="text-sm text-red-500 mt-1">{errors.signerName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signerTitle">Title *</Label>
              <Input
                id="signerTitle"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder="Dispatcher / Driver / Owner"
                className={errors.signerTitle ? 'border-red-500' : ''}
              />
              {errors.signerTitle && (
                <p className="text-sm text-red-500 mt-1">{errors.signerTitle}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signerEmail">Email *</Label>
              <Input
                id="signerEmail"
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="john@example.com"
                className={errors.signerEmail ? 'border-red-500' : ''}
              />
              {errors.signerEmail && (
                <p className="text-sm text-red-500 mt-1">{errors.signerEmail}</p>
              )}
            </div>

            <div>
              <Label htmlFor="signerPhone">Phone (Optional)</Label>
              <Input
                id="signerPhone"
                type="tel"
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signature Capture */}
      <Card>
        <CardHeader>
          <CardTitle>Electronic Signature</CardTitle>
          <CardDescription>
            Draw your signature in the box below using your mouse or finger
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`border-2 rounded-lg cursor-crosshair touch-none ${
                errors.signature ? 'border-red-500' : 'border-gray-300'
              }`}
              style={{
                width: '100%',
                height: '200px',
                backgroundColor: '#ffffff'
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 text-gray-400">
                  <Pen className="h-5 w-5" />
                  <span>Sign here</span>
                </div>
              </div>
            )}
          </div>

          {errors.signature && (
            <p className="text-sm text-red-500">{errors.signature}</p>
          )}

          <Button
            variant="outline"
            onClick={clearSignature}
            disabled={!hasSignature}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Signature
          </Button>
        </CardContent>
      </Card>

      {/* Terms Acceptance */}
      {showTermsAcceptance && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="acceptTerms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                className={errors.acceptedTerms ? 'border-red-500' : ''}
              />
              <div className="space-y-2 flex-1">
                <Label htmlFor="acceptTerms" className="text-sm font-normal cursor-pointer">
                  {termsText}
                </Label>
                {errors.acceptedTerms && (
                  <p className="text-sm text-red-500">{errors.acceptedTerms}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <Alert className="flex-1 mr-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            By signing, you legally accept the rate confirmation #{rateConNumber}
          </AlertDescription>
        </Alert>

        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!hasSignature || !signerName || !signerTitle || !signerEmail || (showTermsAcceptance && !acceptedTerms)}
        >
          <Check className="h-5 w-5 mr-2" />
          Submit Signature
        </Button>
      </div>
    </div>
  );
}

export default SignatureCapture;