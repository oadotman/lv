'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, AlertCircle, CheckCircle, Edit, Send, Download, Eye } from 'lucide-react';
import { CarrierVerificationBadge } from '@/components/carriers/CarrierVerificationBadge';
import { toast } from '@/components/ui/use-toast';
import { createBrowserClient } from '@supabase/ssr';
import { format } from 'date-fns';

interface ExtractedData {
  carrier?: {
    carrier_name?: string;
    mc_number?: string;
    dot_number?: string;
    primary_contact?: string;
    dispatch_phone?: string;
    dispatch_email?: string;
    driver_name?: string;
    driver_phone?: string;
  };
  load?: {
    origin_city?: string;
    origin_state?: string;
    destination_city?: string;
    destination_state?: string;
    pickup_date?: string;
    delivery_date?: string;
    commodity?: string;
    weight?: number;
    equipment_type?: string;
    reference_number?: string;
  };
  rate?: {
    carrier_rate?: number;
    shipper_rate?: number;
  };
  shipper?: {
    shipper_name?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
  };
}

interface GenerateRateConButtonProps {
  callId: string;
  extractedData?: ExtractedData | null;
  callFields?: any[];
  agentOutputs?: any;
  className?: string;
}

interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

export function GenerateRateConButton({
  callId,
  extractedData,
  callFields,
  agentOutputs,
  className,
}: GenerateRateConButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreflightDialog, setShowPreflightDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [editableData, setEditableData] = useState<ExtractedData | null>(null);
  const [loadId, setLoadId] = useState<string | null>(null);
  const [rateConfirmationId, setRateConfirmationId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Parse and merge extraction data from various sources
  const getMergedExtractionData = (): ExtractedData => {
    let mergedData: ExtractedData = {};

    // Start with provided extracted data
    if (extractedData) {
      mergedData = { ...extractedData };
    }

    // Merge from call_fields if available
    if (callFields && callFields.length > 0) {
      callFields.forEach(field => {
        const fieldName = field.field_name.toLowerCase();
        const fieldValue = field.field_value;

        // Map field names to extraction structure
        if (fieldName.includes('carrier') && fieldName.includes('name')) {
          mergedData.carrier = { ...mergedData.carrier, carrier_name: fieldValue };
        } else if (fieldName.includes('mc') || fieldName.includes('mc_number')) {
          mergedData.carrier = { ...mergedData.carrier, mc_number: fieldValue };
        } else if (fieldName.includes('origin') && fieldName.includes('city')) {
          mergedData.load = { ...mergedData.load, origin_city: fieldValue };
        } else if (fieldName.includes('origin') && fieldName.includes('state')) {
          mergedData.load = { ...mergedData.load, origin_state: fieldValue };
        } else if (fieldName.includes('destination') && fieldName.includes('city')) {
          mergedData.load = { ...mergedData.load, destination_city: fieldValue };
        } else if (fieldName.includes('destination') && fieldName.includes('state')) {
          mergedData.load = { ...mergedData.load, destination_state: fieldValue };
        } else if (fieldName.includes('rate') && !fieldName.includes('shipper')) {
          const rate = parseFloat(fieldValue);
          if (!isNaN(rate)) {
            mergedData.rate = { ...mergedData.rate, carrier_rate: rate };
          }
        } else if (fieldName.includes('pickup') && fieldName.includes('date')) {
          mergedData.load = { ...mergedData.load, pickup_date: fieldValue };
        } else if (fieldName.includes('commodity')) {
          mergedData.load = { ...mergedData.load, commodity: fieldValue };
        } else if (fieldName.includes('weight')) {
          mergedData.load = { ...mergedData.load, weight: parseInt(fieldValue) };
        } else if (fieldName.includes('equipment')) {
          mergedData.load = { ...mergedData.load, equipment_type: fieldValue };
        }
      });
    }

    // Merge from agent_outputs if available
    if (agentOutputs) {
      if (agentOutputs.carrier) {
        mergedData.carrier = { ...mergedData.carrier, ...agentOutputs.carrier };
      }
      if (agentOutputs.load) {
        mergedData.load = { ...mergedData.load, ...agentOutputs.load };
      }
      if (agentOutputs.rate) {
        mergedData.rate = { ...mergedData.rate, ...agentOutputs.rate };
      }
    }

    return mergedData;
  };

  // Validate required fields for rate confirmation
  const validateData = (data: ExtractedData): ValidationResult => {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.carrier?.carrier_name) missingFields.push('Carrier Name');
    if (!data.carrier?.mc_number && !data.carrier?.dot_number) {
      missingFields.push('MC# or DOT#');
    }
    if (!data.load?.origin_city) missingFields.push('Origin City');
    if (!data.load?.origin_state) missingFields.push('Origin State');
    if (!data.load?.destination_city) missingFields.push('Destination City');
    if (!data.load?.destination_state) missingFields.push('Destination State');
    if (!data.rate?.carrier_rate) missingFields.push('Carrier Rate');
    if (!data.load?.pickup_date) missingFields.push('Pickup Date');

    // Recommended fields (warnings)
    if (!data.load?.delivery_date) warnings.push('Delivery Date not specified');
    if (!data.carrier?.dispatch_email) warnings.push('Carrier email not available for sending');
    if (!data.load?.commodity) warnings.push('Commodity description missing');
    if (!data.load?.equipment_type) warnings.push('Equipment type not specified');

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings,
    };
  };

  // Check if extraction has already been saved as a load
  const checkExistingLoad = async () => {
    try {
      const response = await fetch(`/api/extraction/save-to-load?callId=${callId}`);
      const data = await response.json();

      if (data.saved && data.loadId) {
        setLoadId(data.loadId);
        return data.loadId;
      }
      return null;
    } catch (error) {
      console.error('Error checking existing load:', error);
      return null;
    }
  };

  const handleGenerateClick = async () => {
    const mergedData = getMergedExtractionData();
    setEditableData(mergedData);

    const validationResult = validateData(mergedData);
    setValidation(validationResult);

    if (validationResult.isValid && validationResult.warnings.length === 0) {
      // All good, proceed directly
      await createLoadAndRateConfirmation(mergedData);
    } else if (validationResult.isValid) {
      // Valid but has warnings
      setShowPreflightDialog(true);
    } else {
      // Missing required fields, show edit dialog
      setShowEditDialog(true);
    }
  };

  const createLoadAndRateConfirmation = async (data: ExtractedData) => {
    setIsGenerating(true);
    setShowPreflightDialog(false);
    setShowEditDialog(false);

    try {
      // Step 1: Check if load already exists
      let existingLoadId = await checkExistingLoad();

      // Step 2: Create load if it doesn't exist
      if (!existingLoadId) {
        const saveResponse = await fetch('/api/extraction/save-to-load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId,
            extraction: {
              callType: 'rate_confirmation',
              data,
            },
          }),
        });

        if (!saveResponse.ok) {
          throw new Error('Failed to create load from extraction');
        }

        const saveResult = await saveResponse.json();
        existingLoadId = saveResult.load?.id || saveResult.created?.loadId;

        if (!existingLoadId) {
          throw new Error('Load creation succeeded but no ID returned');
        }
      }

      setLoadId(existingLoadId);

      // Step 3: Generate rate confirmation
      const rateConResponse = await fetch('/api/rate-confirmations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ load_id: existingLoadId }),
      });

      if (!rateConResponse.ok) {
        const error = await rateConResponse.json();
        throw new Error(error.details || 'Failed to generate rate confirmation');
      }

      const rateConResult = await rateConResponse.json();

      setRateConfirmationId(rateConResult.rate_confirmation?.id);
      setPdfUrl(rateConResult.rate_confirmation?.pdf_url);

      toast({
        title: 'Rate Confirmation Generated!',
        description: `RC# ${rateConResult.rate_confirmation?.rate_con_number} created successfully`,
      });

      // Show preview dialog
      setShowPreviewDialog(true);

    } catch (error) {
      console.error('Error generating rate confirmation:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate rate confirmation',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!rateConfirmationId || !editableData?.carrier?.dispatch_email) {
      toast({
        title: 'Cannot Send Email',
        description: 'No carrier email address available',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/rate-confirmations/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rate_confirmation_id: rateConfirmationId,
          to_emails: [editableData.carrier.dispatch_email],
          include_acceptance_link: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast({
        title: 'Email Sent!',
        description: `Rate confirmation sent to ${editableData.carrier.dispatch_email}`,
      });

      setShowPreviewDialog(false);
    } catch (error) {
      toast({
        title: 'Email Failed',
        description: 'Failed to send rate confirmation email',
        variant: 'destructive',
      });
    }
  };

  const updateEditableField = (category: keyof ExtractedData, field: string, value: any) => {
    setEditableData(prev => ({
      ...prev,
      [category]: {
        ...prev?.[category],
        [field]: value,
      },
    }));
  };

  return (
    <>
      <Button
        onClick={handleGenerateClick}
        disabled={isGenerating}
        className={className}
        variant="default"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="h-5 w-5 mr-2" />
            Generate Rate Confirmation
          </>
        )}
      </Button>

      {/* Pre-flight Check Dialog */}
      <Dialog open={showPreflightDialog} onOpenChange={setShowPreflightDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Confirmation Pre-Check</DialogTitle>
            <DialogDescription>
              Review the following before generating the rate confirmation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {validation?.warnings && validation.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Warnings:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">All required fields are present</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(true)}>
              Edit Fields
            </Button>
            <Button onClick={() => editableData && createLoadAndRateConfirmation(editableData)}>
              Continue Generation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Fields Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rate Confirmation Data</DialogTitle>
            <DialogDescription>
              Fill in missing required fields and review extracted data
            </DialogDescription>
          </DialogHeader>

          {validation?.missingFields && validation.missingFields.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Missing Required Fields:</div>
                <div className="text-sm">{validation.missingFields.join(', ')}</div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Carrier Information */}
            <div>
              <h3 className="font-medium mb-3">Carrier Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="carrier_name">Carrier Name *</Label>
                  <Input
                    id="carrier_name"
                    value={editableData?.carrier?.carrier_name || ''}
                    onChange={(e) => updateEditableField('carrier', 'carrier_name', e.target.value)}
                    className={validation?.missingFields.includes('Carrier Name') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="mc_number">MC Number *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="mc_number"
                      value={editableData?.carrier?.mc_number || ''}
                      onChange={(e) => updateEditableField('carrier', 'mc_number', e.target.value)}
                      placeholder="MC-123456"
                      className="flex-1"
                    />
                    {(editableData?.carrier?.mc_number || editableData?.carrier?.dot_number) && (
                      <CarrierVerificationBadge
                        mcNumber={editableData?.carrier?.mc_number}
                        dotNumber={editableData?.carrier?.dot_number}
                        size="sm"
                        showDetails
                      />
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="dot_number">DOT Number</Label>
                  <Input
                    id="dot_number"
                    value={editableData?.carrier?.dot_number || ''}
                    onChange={(e) => updateEditableField('carrier', 'dot_number', e.target.value)}
                    placeholder="DOT-1234567"
                  />
                </div>
                <div>
                  <Label htmlFor="dispatch_email">Dispatcher Email</Label>
                  <Input
                    id="dispatch_email"
                    type="email"
                    value={editableData?.carrier?.dispatch_email || ''}
                    onChange={(e) => updateEditableField('carrier', 'dispatch_email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dispatch_phone">Dispatcher Phone</Label>
                  <Input
                    id="dispatch_phone"
                    value={editableData?.carrier?.dispatch_phone || ''}
                    onChange={(e) => updateEditableField('carrier', 'dispatch_phone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Load Information */}
            <div>
              <h3 className="font-medium mb-3">Load Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin_city">Origin City *</Label>
                  <Input
                    id="origin_city"
                    value={editableData?.load?.origin_city || ''}
                    onChange={(e) => updateEditableField('load', 'origin_city', e.target.value)}
                    className={validation?.missingFields.includes('Origin City') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="origin_state">Origin State *</Label>
                  <Input
                    id="origin_state"
                    value={editableData?.load?.origin_state || ''}
                    onChange={(e) => updateEditableField('load', 'origin_state', e.target.value)}
                    maxLength={2}
                    className={validation?.missingFields.includes('Origin State') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="destination_city">Destination City *</Label>
                  <Input
                    id="destination_city"
                    value={editableData?.load?.destination_city || ''}
                    onChange={(e) => updateEditableField('load', 'destination_city', e.target.value)}
                    className={validation?.missingFields.includes('Destination City') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="destination_state">Destination State *</Label>
                  <Input
                    id="destination_state"
                    value={editableData?.load?.destination_state || ''}
                    onChange={(e) => updateEditableField('load', 'destination_state', e.target.value)}
                    maxLength={2}
                    className={validation?.missingFields.includes('Destination State') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="pickup_date">Pickup Date *</Label>
                  <Input
                    id="pickup_date"
                    type="date"
                    value={editableData?.load?.pickup_date || ''}
                    onChange={(e) => updateEditableField('load', 'pickup_date', e.target.value)}
                    className={validation?.missingFields.includes('Pickup Date') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_date">Delivery Date</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={editableData?.load?.delivery_date || ''}
                    onChange={(e) => updateEditableField('load', 'delivery_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="commodity">Commodity</Label>
                  <Input
                    id="commodity"
                    value={editableData?.load?.commodity || ''}
                    onChange={(e) => updateEditableField('load', 'commodity', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="equipment_type">Equipment Type</Label>
                  <Input
                    id="equipment_type"
                    value={editableData?.load?.equipment_type || ''}
                    onChange={(e) => updateEditableField('load', 'equipment_type', e.target.value)}
                    placeholder="Dry Van"
                  />
                </div>
              </div>
            </div>

            {/* Rate Information */}
            <div>
              <h3 className="font-medium mb-3">Rate Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="carrier_rate">Carrier Rate *</Label>
                  <Input
                    id="carrier_rate"
                    type="number"
                    value={editableData?.rate?.carrier_rate || ''}
                    onChange={(e) => updateEditableField('rate', 'carrier_rate', parseFloat(e.target.value))}
                    className={validation?.missingFields.includes('Carrier Rate') ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="shipper_rate">Shipper Rate</Label>
                  <Input
                    id="shipper_rate"
                    type="number"
                    value={editableData?.rate?.shipper_rate || ''}
                    onChange={(e) => updateEditableField('rate', 'shipper_rate', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editableData) {
                  const newValidation = validateData(editableData);
                  setValidation(newValidation);
                  if (newValidation.isValid) {
                    createLoadAndRateConfirmation(editableData);
                  }
                }
              }}
            >
              Generate Rate Confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview and Send Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rate Confirmation Generated!</DialogTitle>
            <DialogDescription>
              Your rate confirmation has been generated successfully
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Rate confirmation has been created and saved to the system
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Load ID</p>
                <p className="font-medium">{loadId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Carrier</p>
                <p className="font-medium">{editableData?.carrier?.carrier_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Route</p>
                <p className="font-medium">
                  {editableData?.load?.origin_city}, {editableData?.load?.origin_state} → {editableData?.load?.destination_city}, {editableData?.load?.destination_state}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rate</p>
                <p className="font-medium">${editableData?.rate?.carrier_rate?.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
              >
                <Eye className="h-4 w-4 mr-2" />
                View PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (pdfUrl) {
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = `rate-confirmation-${loadId}.pdf`;
                    link.click();
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                className="flex-1"
                onClick={handleSendEmail}
                disabled={!editableData?.carrier?.dispatch_email}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Carrier
              </Button>
            </div>

            {!editableData?.carrier?.dispatch_email && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No carrier email on file. Add email address to send the rate confirmation.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button onClick={() => { if (loadId) window.location.href = `/loads/${loadId}` }}>
              View Load Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default GenerateRateConButton;