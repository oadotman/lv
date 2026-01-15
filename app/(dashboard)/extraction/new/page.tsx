'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload,
  FileAudio,
  Phone,
  Truck,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Zap,
  Clock,
  X,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type CallType = 'shipper_call' | 'carrier_call' | 'check_call';
type ProcessingStatus = 'idle' | 'uploading' | 'transcribing' | 'extracting' | 'complete' | 'error';

interface ExtractedData {
  call_type: CallType;
  summary: string;
  origin?: { city: string; state: string };
  destination?: { city: string; state: string };
  rate?: number;
  pickup_date?: string;
  delivery_date?: string;
  carrier?: { name: string; mc_number?: string };
  shipper?: { name: string; contact?: string };
  equipment_type?: string;
  commodity?: string;
  weight?: number;
  special_requirements?: string;
  confidence_score?: number;
  transcription_id?: string;
  call_id?: string;
}

export default function NewExtractionPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [callType, setCallType] = useState<CallType>('shipper_call');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      // Validate file size (max 500MB)
      if (uploadedFile.size > 500 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 500MB',
          variant: 'destructive',
        });
        return;
      }
      setFile(uploadedFile);
      setProcessingStatus('idle');
      setExtractedData(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.flac'],
    },
    maxFiles: 1,
  });

  const handleProcess = async () => {
    if (!file) return;

    try {
      setProcessingStatus('uploading');
      setProgress(10);
      setError(null);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('call_type', callType);
      formData.append('phone_number', 'Manual Upload'); // Indicate this is a manual upload

      // Upload the file
      const uploadResponse = await fetch('/api/calls/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const uploadData = await uploadResponse.json();
      const uploadedCallId = uploadData.call_id;
      setCallId(uploadedCallId);

      setProcessingStatus('transcribing');
      setProgress(40);

      // Start transcription
      const transcribeResponse = await fetch(`/api/calls/${uploadedCallId}/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_type: callType
        })
      });

      if (!transcribeResponse.ok) {
        const error = await transcribeResponse.json();
        throw new Error(error.error || 'Failed to transcribe audio');
      }

      const transcriptionData = await transcribeResponse.json();

      setProcessingStatus('extracting');
      setProgress(70);

      // Extract freight data
      const extractResponse = await fetch(`/api/calls/${uploadedCallId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription_id: transcriptionData.transcription_id,
          call_type: callType
        })
      });

      if (!extractResponse.ok) {
        const error = await extractResponse.json();
        throw new Error(error.error || 'Failed to extract data');
      }

      const extractionData = await extractResponse.json();

      // Format extracted data for display
      const formattedData: ExtractedData = {
        call_type: callType,
        summary: extractionData.summary || 'Load details extracted successfully',
        origin: extractionData.origin || extractionData.pickup_location ? {
          city: extractionData.origin?.city || extractionData.pickup_location?.split(',')[0]?.trim(),
          state: extractionData.origin?.state || extractionData.pickup_location?.split(',')[1]?.trim()
        } : undefined,
        destination: extractionData.destination || extractionData.delivery_location ? {
          city: extractionData.destination?.city || extractionData.delivery_location?.split(',')[0]?.trim(),
          state: extractionData.destination?.state || extractionData.delivery_location?.split(',')[1]?.trim()
        } : undefined,
        rate: extractionData.rate || extractionData.rate_amount,
        pickup_date: extractionData.pickup_date,
        delivery_date: extractionData.delivery_date,
        equipment_type: extractionData.equipment_type,
        commodity: extractionData.commodity,
        weight: extractionData.weight,
        special_requirements: extractionData.special_requirements,
        shipper: extractionData.shipper,
        carrier: extractionData.carrier,
        confidence_score: extractionData.confidence_score || 85,
        transcription_id: transcriptionData.transcription_id,
        call_id: uploadedCallId
      };

      setExtractedData(formattedData);
      setProgress(100);
      setProcessingStatus('complete');

      toast({
        title: 'Extraction Complete!',
        description: 'Load details extracted successfully',
      });

    } catch (err: any) {
      console.error('Processing error:', err);
      setProcessingStatus('error');
      setError(err.message || 'Failed to process recording');
      toast({
        title: 'Processing Failed',
        description: err.message || 'Failed to process recording',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setProcessingStatus('idle');
    setProgress(0);
    setExtractedData(null);
    setCallId(null);
    setError(null);
  };

  const handleSaveToLoads = async () => {
    if (!extractedData || !callId) return;

    try {
      // Create a new load from the extracted data
      const loadData = {
        origin_city: extractedData.origin?.city,
        origin_state: extractedData.origin?.state,
        destination_city: extractedData.destination?.city,
        destination_state: extractedData.destination?.state,
        pickup_date: extractedData.pickup_date,
        delivery_date: extractedData.delivery_date,
        rate_amount: extractedData.rate,
        equipment_type: extractedData.equipment_type,
        commodity: extractedData.commodity,
        weight_pounds: extractedData.weight,
        special_requirements: extractedData.special_requirements,
        status: 'quoted',
        metadata: {
          source: 'manual_upload',
          call_id: callId,
          transcription_id: extractedData.transcription_id,
          extraction_confidence: extractedData.confidence_score
        }
      };

      const response = await fetch('/api/loads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loadData)
      });

      if (!response.ok) {
        throw new Error('Failed to create load');
      }

      const { load } = await response.json();

      toast({
        title: 'Load Created',
        description: 'Load has been saved successfully',
      });

      // Navigate to the new load
      router.push(`/loads/${load.id}`);

    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save load. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyToClipboard = () => {
    if (!extractedData) return;

    const text = `
Call Type: ${extractedData.call_type.replace('_', ' ')}
Summary: ${extractedData.summary}
Route: ${extractedData.origin?.city || 'Unknown'}, ${extractedData.origin?.state || ''} → ${extractedData.destination?.city || 'Unknown'}, ${extractedData.destination?.state || ''}
Pickup: ${extractedData.pickup_date || 'TBD'}
Delivery: ${extractedData.delivery_date || 'TBD'}
Rate: $${extractedData.rate || 'TBD'}
Equipment: ${extractedData.equipment_type || 'TBD'}
Commodity: ${extractedData.commodity || 'TBD'}
Weight: ${extractedData.weight || 'TBD'} lbs
${extractedData.shipper ? `Shipper: ${extractedData.shipper.name}` : ''}
${extractedData.carrier ? `Carrier: ${extractedData.carrier.name}` : ''}
`.trim();

    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Extracted data copied to clipboard',
    });
  };

  const getStatusMessage = () => {
    switch (processingStatus) {
      case 'uploading':
        return 'Uploading audio file...';
      case 'transcribing':
        return 'Transcribing conversation with AI...';
      case 'extracting':
        return 'Extracting load details...';
      case 'complete':
        return 'Extraction complete!';
      case 'error':
        return 'Processing failed';
      default:
        return '';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Extraction</h1>
        <p className="text-muted-foreground">
          Upload a call recording and we'll extract all the details automatically
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <Zap className="h-5 w-5 text-blue-600 mb-1" />
            <CardTitle className="text-sm">Fast Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Get structured data from any call quickly
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
            <CardTitle className="text-sm">AI-Powered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Advanced AI extraction with high accuracy
            </p>
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-sky-50">
          <CardHeader className="pb-3">
            <Clock className="h-5 w-5 text-sky-600 mb-1" />
            <CardTitle className="text-sm">Save Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Eliminate manual data entry from your workflow
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Recording</CardTitle>
            <CardDescription>
              Drag and drop or click to upload your call recording
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Call Type Selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Call Type</Label>
              <RadioGroup
                value={callType}
                onValueChange={(value) => setCallType(value as CallType)}
                disabled={processingStatus !== 'idle'}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shipper_call" id="shipper" />
                  <Label htmlFor="shipper" className="cursor-pointer flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Shipper Call
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="carrier_call" id="carrier" />
                  <Label htmlFor="carrier" className="cursor-pointer flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Carrier Call
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="check_call" id="check" />
                  <Label htmlFor="check" className="cursor-pointer flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Check Call
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Dropzone */}
            {!file ? (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                {isDragActive ? (
                  <p className="text-sm text-blue-600">Drop the file here...</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">
                      Drop your call recording here, or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports MP3, WAV, M4A, WEBM, OGG, FLAC (max 500MB)
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {processingStatus === 'idle' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleReset}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Processing Status */}
            {processingStatus !== 'idle' && processingStatus !== 'complete' && processingStatus !== 'error' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{getStatusMessage()}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Error Display */}
            {processingStatus === 'error' && error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {processingStatus === 'idle' && file && (
                <Button onClick={handleProcess} className="flex-1">
                  <Zap className="mr-2 h-4 w-4" />
                  Process Recording
                </Button>
              )}
              {processingStatus !== 'idle' && processingStatus !== 'complete' && processingStatus !== 'error' && (
                <Button disabled className="flex-1">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </Button>
              )}
              {processingStatus === 'error' && (
                <>
                  <Button onClick={handleReset} variant="outline" className="flex-1">
                    Try Again
                  </Button>
                  <Button onClick={handleProcess} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Processing
                  </Button>
                </>
              )}
              {processingStatus === 'complete' && (
                <>
                  <Button onClick={handleReset} variant="outline" className="flex-1">
                    Upload Another
                  </Button>
                  <Button onClick={handleSaveToLoads} className="flex-1">
                    Save to Loads
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Extracted Data Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Data</CardTitle>
            <CardDescription>
              {extractedData ? 'Review and edit extracted information' : 'Extracted data will appear here'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!extractedData ? (
              <div className="h-[400px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileAudio className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No data yet</p>
                  <p className="text-xs mt-1">Upload and process a call to see results</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Confidence Score */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {extractedData.call_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <Badge
                      variant="default"
                      className={extractedData.confidence_score && extractedData.confidence_score >= 80 ? 'bg-green-600' : 'bg-yellow-600'}
                    >
                      {extractedData.confidence_score}%
                    </Badge>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <Label className="text-xs text-muted-foreground">Summary</Label>
                  <p className="text-sm mt-1">{extractedData.summary}</p>
                </div>

                {/* Route */}
                {(extractedData.origin || extractedData.destination) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Origin</Label>
                      <p className="text-sm font-medium mt-1">
                        {extractedData.origin
                          ? `${extractedData.origin.city}, ${extractedData.origin.state}`
                          : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Destination</Label>
                      <p className="text-sm font-medium mt-1">
                        {extractedData.destination
                          ? `${extractedData.destination.city}, ${extractedData.destination.state}`
                          : 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Dates */}
                {(extractedData.pickup_date || extractedData.delivery_date) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Pickup</Label>
                      <p className="text-sm font-medium mt-1">
                        {extractedData.pickup_date || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Delivery</Label>
                      <p className="text-sm font-medium mt-1">
                        {extractedData.delivery_date || 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Equipment & Commodity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Equipment</Label>
                    <p className="text-sm font-medium mt-1">
                      {extractedData.equipment_type || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Commodity</Label>
                    <p className="text-sm font-medium mt-1">
                      {extractedData.commodity || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Weight */}
                {extractedData.weight && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Weight</Label>
                    <p className="text-sm font-medium mt-1">
                      {extractedData.weight.toLocaleString()} lbs
                    </p>
                  </div>
                )}

                {/* Rate */}
                {extractedData.rate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Rate</Label>
                    <p className="text-xl font-bold text-green-600 mt-1">
                      ${extractedData.rate.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Special Requirements */}
                {extractedData.special_requirements && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Special Requirements</Label>
                    <p className="text-sm mt-1">{extractedData.special_requirements}</p>
                  </div>
                )}

                {/* Shipper/Carrier Info */}
                {extractedData.shipper && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Shipper</Label>
                    <p className="text-sm font-medium mt-1">
                      {extractedData.shipper.name}
                      {extractedData.shipper.contact && (
                        <span className="text-muted-foreground"> • {extractedData.shipper.contact}</span>
                      )}
                    </p>
                  </div>
                )}

                {extractedData.carrier && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Carrier</Label>
                    <p className="text-sm font-medium mt-1">
                      {extractedData.carrier.name}
                      {extractedData.carrier.mc_number && (
                        <span className="text-muted-foreground"> • {extractedData.carrier.mc_number}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleCopyToClipboard}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  {callId && (
                    <Link href={`/calls/${callId}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        View Call Details
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}