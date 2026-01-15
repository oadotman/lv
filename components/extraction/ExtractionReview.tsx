'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Save,
  Copy,
  FileText,
  Flag,
  Check,
  Edit3,
  AlertCircle,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  Package,
  User,
  Phone,
  Building,
  Hash,
  Loader2,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { FreightExtraction } from '@/lib/extraction/freightExtraction';

interface ExtractionReviewProps {
  extraction: Partial<FreightExtraction>;
  onSave: (data: Partial<FreightExtraction>) => Promise<void>;
  onGenerateRateCon?: () => void;
  confidence?: number;
  callId?: string;
}

interface FieldConfidence {
  [key: string]: number;
}

export function ExtractionReview({
  extraction: initialExtraction,
  onSave,
  onGenerateRateCon,
  confidence = 0,
  callId,
}: ExtractionReviewProps) {
  const [extraction, setExtraction] = useState<Partial<FreightExtraction>>(initialExtraction);
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  // Mock field confidence scores - in production, these would come from the AI
  const fieldConfidence: FieldConfidence = {
    origin: 95,
    destination: 92,
    pickup_date: 88,
    delivery_date: 85,
    rate: 90,
    carrier: 78,
    shipper: 94,
    equipment: 96,
    commodity: 89,
  };

  const handleFieldEdit = (field: string, value: any) => {
    setExtraction(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedFieldEdit = (parent: string, field: string, value: any) => {
    setExtraction(prev => ({
      ...prev,
      [parent]: {
        ...((prev as any)[parent] || {}),
        [field]: value,
      },
    }));
  };

  const toggleEditMode = (field: string) => {
    setEditMode(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(extraction);
      toast({
        title: 'Extraction Saved',
        description: 'Data has been saved to your loads',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save extraction data',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToClipboard = () => {
    const text = formatExtractionAsText(extraction);
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: 'Extraction data copied successfully',
    });
  };

  const handleFlagForReview = () => {
    setFlagDialogOpen(true);
  };

  const submitFlag = () => {
    // In production, this would save the flag to the database
    toast({
      title: 'Flagged for Review',
      description: 'This extraction has been flagged for manual review',
    });
    setFlagDialogOpen(false);
    setFlagReason('');
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-blue-600 bg-blue-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return 'High';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Low';
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Extraction Review</h3>
          <p className="text-sm text-muted-foreground">
            Review and edit extracted data before saving
          </p>
        </div>
        <div className="flex items-center gap-2">
          {confidence > 0 && (
            <Badge className={cn('gap-1', getConfidenceColor(confidence))}>
              <AlertCircle className="h-3 w-3" />
              {confidence}% Confidence
            </Badge>
          )}
          <Badge variant="outline">
            {extraction.call_type?.replace('_', ' ').toUpperCase() || 'Unknown'}
          </Badge>
        </div>
      </div>

      {/* Main Extraction Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Route Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Route Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Origin */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Origin</Label>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {getConfidenceLabel(fieldConfidence.origin)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleEditMode('origin')}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {editMode.origin ? (
                <div className="flex gap-2">
                  <Input
                    value={extraction.route_details?.origin?.city || ''}
                    onChange={(e) => handleNestedFieldEdit('route_details', 'origin', {
                      ...extraction.route_details?.origin,
                      city: e.target.value,
                    })}
                    placeholder="City"
                    className="h-8"
                  />
                  <Input
                    value={extraction.route_details?.origin?.state || ''}
                    onChange={(e) => handleNestedFieldEdit('route_details', 'origin', {
                      ...extraction.route_details?.origin,
                      state: e.target.value,
                    })}
                    placeholder="State"
                    className="h-8 w-20"
                    maxLength={2}
                  />
                  <Button
                    size="sm"
                    onClick={() => toggleEditMode('origin')}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium">
                  {extraction.route_details?.origin?.city || 'Not specified'},{' '}
                  {extraction.route_details?.origin?.state || 'XX'}
                </p>
              )}
            </div>

            {/* Destination */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Destination</Label>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {getConfidenceLabel(fieldConfidence.destination)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleEditMode('destination')}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {editMode.destination ? (
                <div className="flex gap-2">
                  <Input
                    value={extraction.route_details?.destination?.city || ''}
                    onChange={(e) => handleNestedFieldEdit('route_details', 'destination', {
                      ...extraction.route_details?.destination,
                      city: e.target.value,
                    })}
                    placeholder="City"
                    className="h-8"
                  />
                  <Input
                    value={extraction.route_details?.destination?.state || ''}
                    onChange={(e) => handleNestedFieldEdit('route_details', 'destination', {
                      ...extraction.route_details?.destination,
                      state: e.target.value,
                    })}
                    placeholder="State"
                    className="h-8 w-20"
                    maxLength={2}
                  />
                  <Button
                    size="sm"
                    onClick={() => toggleEditMode('destination')}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium">
                  {extraction.route_details?.destination?.city || 'Not specified'},{' '}
                  {extraction.route_details?.destination?.state || 'XX'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pickup Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Pickup Date</Label>
                <Badge variant="outline" className="text-xs">
                  {getConfidenceLabel(fieldConfidence.pickup_date)}
                </Badge>
              </div>
              <Input
                type="date"
                value={extraction.route_details?.pickup_date || ''}
                onChange={(e) => handleNestedFieldEdit('route_details', 'pickup_date', e.target.value)}
                className="h-8"
              />
            </div>

            {/* Delivery Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Delivery Date</Label>
                <Badge variant="outline" className="text-xs">
                  {getConfidenceLabel(fieldConfidence.delivery_date)}
                </Badge>
              </div>
              <Input
                type="date"
                value={extraction.route_details?.delivery_date || ''}
                onChange={(e) => handleNestedFieldEdit('route_details', 'delivery_date', e.target.value)}
                className="h-8"
              />
            </div>
          </CardContent>
        </Card>

        {/* Equipment & Commodity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Equipment & Freight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Equipment Type</Label>
              <Select
                value={extraction.equipment_details?.type || ''}
                onValueChange={(value) => handleNestedFieldEdit('equipment_details', 'type', value)}
              >
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry_van">Dry Van</SelectItem>
                  <SelectItem value="reefer">Reefer</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="step_deck">Step Deck</SelectItem>
                  <SelectItem value="Lowboy">Lowboy</SelectItem>
                  <SelectItem value="tanker">Tanker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Commodity</Label>
              <Input
                value={extraction.equipment_details?.commodity || ''}
                onChange={(e) => handleNestedFieldEdit('equipment_details', 'commodity', e.target.value)}
                className="h-8 mt-1"
                placeholder="Enter commodity"
              />
            </div>

            <div>
              <Label className="text-xs">Weight (lbs)</Label>
              <Input
                type="number"
                value={extraction.equipment_details?.weight || ''}
                onChange={(e) => handleNestedFieldEdit('equipment_details', 'weight', parseInt(e.target.value))}
                className="h-8 mt-1"
                placeholder="Enter weight"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Total Rate</Label>
                <Badge variant="outline" className="text-xs">
                  {getConfidenceLabel(fieldConfidence.rate)}
                </Badge>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500" />
                <Input
                  type="number"
                  value={extraction.pricing?.total_rate || ''}
                  onChange={(e) => handleNestedFieldEdit('pricing', 'total_rate', parseFloat(e.target.value))}
                  className="h-8 pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Carrier Rate</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-500" />
                <Input
                  type="number"
                  value={extraction.pricing?.carrier_rate || ''}
                  onChange={(e) => handleNestedFieldEdit('pricing', 'carrier_rate', parseFloat(e.target.value))}
                  className="h-8 pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            {extraction.pricing?.total_rate && extraction.pricing?.carrier_rate && (
              <div className="p-2 bg-green-50 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Margin</span>
                  <span className="font-semibold text-green-700">
                    ${(extraction.pricing.total_rate - extraction.pricing.carrier_rate).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parties */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building className="h-4 w-4" />
              Parties Involved
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipper */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Shipper
                </Label>
                <Badge variant="outline" className="text-xs">
                  {getConfidenceLabel(fieldConfidence.shipper)}
                </Badge>
              </div>
              <Input
                value={extraction.shipper_information?.name || ''}
                onChange={(e) => handleNestedFieldEdit('shipper_information', 'name', e.target.value)}
                className="h-8 mb-2"
                placeholder="Company name"
              />
              <Input
                value={extraction.shipper_information?.contact || ''}
                onChange={(e) => handleNestedFieldEdit('shipper_information', 'contact', e.target.value)}
                className="h-8"
                placeholder="Contact person"
              />
            </div>

            {/* Carrier */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Carrier
                </Label>
                <Badge variant="outline" className="text-xs">
                  {getConfidenceLabel(fieldConfidence.carrier)}
                </Badge>
              </div>
              <Input
                value={extraction.carrier_information?.company_name || ''}
                onChange={(e) => handleNestedFieldEdit('carrier_information', 'company_name', e.target.value)}
                className="h-8 mb-2"
                placeholder="Company name"
              />
              <Input
                value={extraction.carrier_information?.mc_number || ''}
                onChange={(e) => handleNestedFieldEdit('carrier_information', 'mc_number', e.target.value)}
                className="h-8"
                placeholder="MC Number"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Summary & Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={extraction.summary || ''}
              onChange={(e) => handleFieldEdit('summary', e.target.value)}
              className="min-h-[80px]"
              placeholder="Call summary and important notes..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleFlagForReview}
          className="gap-2"
        >
          <Flag className="h-4 w-4" />
          Flag for Review
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopyToClipboard}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy to Clipboard
          </Button>

          {onGenerateRateCon && extraction.carrier_information && (
            <Button
              variant="outline"
              onClick={onGenerateRateCon}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Generate Rate Con
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save to Loads
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Flag Dialog */}
      <AlertDialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Flag for Review</AlertDialogTitle>
            <AlertDialogDescription>
              Why does this extraction need manual review?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Enter reason for review..."
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitFlag}>Submit Flag</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper function to format extraction as text
function formatExtractionAsText(extraction: Partial<FreightExtraction>): string {
  const lines = [];

  if (extraction.route_details?.origin && extraction.route_details?.destination) {
    lines.push(
      `Route: ${extraction.route_details.origin.city}, ${extraction.route_details.origin.state} → ` +
      `${extraction.route_details.destination.city}, ${extraction.route_details.destination.state}`
    );
  }

  if (extraction.route_details?.pickup_date) {
    lines.push(`Pickup: ${extraction.route_details.pickup_date}`);
  }

  if (extraction.route_details?.delivery_date) {
    lines.push(`Delivery: ${extraction.route_details.delivery_date}`);
  }

  if (extraction.equipment_details?.type) {
    lines.push(`Equipment: ${extraction.equipment_details.type}`);
  }

  if (extraction.equipment_details?.commodity) {
    lines.push(`Commodity: ${extraction.equipment_details.commodity}`);
  }

  if (extraction.pricing?.total_rate) {
    lines.push(`Rate: $${extraction.pricing.total_rate}`);
  }

  if (extraction.shipper_information?.name) {
    lines.push(`Shipper: ${extraction.shipper_information.name}`);
  }

  if (extraction.carrier_information?.company_name) {
    lines.push(`Carrier: ${extraction.carrier_information.company_name}`);
    if (extraction.carrier_information.mc_number) {
      lines.push(`MC#: ${extraction.carrier_information.mc_number}`);
    }
  }

  if (extraction.summary) {
    lines.push(`\nSummary: ${extraction.summary}`);
  }

  return lines.join('\n');
}

// Helper function (add to lib/utils if not present)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}