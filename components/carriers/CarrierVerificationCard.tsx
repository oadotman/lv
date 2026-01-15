'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Clock,
  DollarSign,
  FileText,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  Building,
  Calendar,
  Truck,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CarrierVerificationCardProps {
  carrierId?: string;
  mcNumber?: string;
  dotNumber?: string;
  carrierName?: string;
  onVerified?: (data: any) => void;
  className?: string;
}

interface VerificationData {
  verified: boolean;
  mc_number?: string;
  dot_number?: string;
  legal_name?: string;
  dba_name?: string;
  operating_status?: string;
  safety_rating?: string;
  authority_age_days?: number;
  insurance?: {
    liability?: {
      required: number;
      on_file: number;
      status: 'ADEQUATE' | 'INADEQUATE' | 'NOT_ON_FILE';
    };
    cargo?: {
      required: number;
      on_file: number;
      status: 'ADEQUATE' | 'INADEQUATE' | 'NOT_ON_FILE';
    };
  };
  safety_scores?: {
    vehicle_oos_rate?: number;
    driver_oos_rate?: number;
    national_avg_vehicle: number;
    national_avg_driver: number;
  };
  crashes?: {
    fatal: number;
    injury: number;
    tow: number;
    total: number;
  };
  fleet_size?: {
    power_units?: number;
    drivers?: number;
  };
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_score?: number;
  warnings?: Array<{
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
  }>;
  verified_at?: string;
  cache_expires_at?: string;
  from_cache?: boolean;
}

export function CarrierVerificationCard({
  carrierId,
  mcNumber,
  dotNumber,
  carrierName,
  onVerified,
  className,
}: CarrierVerificationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (mcNumber || dotNumber || carrierId) {
      fetchVerification();
    }
  }, [mcNumber, dotNumber, carrierId]);

  const fetchVerification = async (forceRefresh = false) => {
    if (!mcNumber && !dotNumber && !carrierId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (mcNumber) params.append('mc', mcNumber.replace(/^MC-?/i, ''));
      if (dotNumber) params.append('dot', dotNumber.replace(/^DOT-?/i, ''));
      if (carrierId) params.append('carrier_id', carrierId);
      if (forceRefresh) params.append('force', 'true');

      const response = await fetch(`/api/carriers/verify?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Verification failed');
      }

      const data = await response.json();
      setVerificationData(data);

      if (onVerified) {
        onVerified(data);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify carrier');
      setVerificationData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchVerification(true);
  };

  const getStatusIcon = () => {
    if (!verificationData) return <HelpCircle className="h-5 w-5 text-gray-400" />;

    if (!verificationData.verified) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }

    switch (verificationData.risk_level) {
      case 'LOW':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'HIGH':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusTitle = () => {
    if (!verificationData) return 'Not Verified';

    if (!verificationData.verified) {
      return 'CARRIER NOT FOUND';
    }

    switch (verificationData.risk_level) {
      case 'LOW':
        return 'CARRIER VERIFIED';
      case 'MEDIUM':
        return 'CARRIER WARNINGS';
      case 'HIGH':
        return 'HIGH RISK CARRIER';
      default:
        return 'CARRIER STATUS';
    }
  };

  const getCardBorderColor = () => {
    if (!verificationData || !verificationData.verified) return 'border-gray-200';

    switch (verificationData.risk_level) {
      case 'LOW':
        return 'border-green-200 bg-green-50/50';
      case 'MEDIUM':
        return 'border-yellow-200 bg-yellow-50/50';
      case 'HIGH':
        return 'border-red-200 bg-red-50/50';
      default:
        return 'border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error && !verificationData) {
    return (
      <Card className={cn('border-red-200 bg-red-50/50', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="font-semibold text-red-900">Verification Error</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchVerification()}
            className="mt-3"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!verificationData) {
    return (
      <Card className={cn('border-gray-200', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-gray-600">No Verification Data</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No MC or DOT number provided for verification
          </p>
        </CardContent>
      </Card>
    );
  }

  // Not found in FMCSA
  if (!verificationData.verified) {
    return (
      <Card className={cn('border-red-200 bg-red-50/50', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-red-500" />
              <span className="font-semibold text-red-900">CARRIER NOT FOUND</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-red-900">
              MC# {mcNumber || 'N/A'} not found in FMCSA database
            </p>
          </div>

          <div className="space-y-2 text-sm text-red-700">
            <p className="font-medium">Possible reasons:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Invalid MC number</li>
              <li>Very new authority (not yet in system)</li>
              <li>Carrier no longer exists</li>
              <li>Typo in the number</li>
            </ul>
          </div>

          <div className="pt-3 border-t border-red-200">
            <p className="text-sm font-semibold text-red-900">
              ⚠️ Proceed with extreme caution
            </p>
          </div>

          <Button variant="outline" size="sm" className="w-full">
            Try Different Number
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Critical warnings
  const criticalWarnings = verificationData.warnings?.filter(w => w.type === 'CRITICAL') || [];
  const normalWarnings = verificationData.warnings?.filter(w => w.type === 'WARNING') || [];
  const infoWarnings = verificationData.warnings?.filter(w => w.type === 'INFO') || [];

  // Verified carrier display
  return (
    <>
      <Card className={cn(getCardBorderColor(), 'transition-colors', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={cn(
                'font-semibold',
                verificationData.risk_level === 'LOW' && 'text-green-900',
                verificationData.risk_level === 'MEDIUM' && 'text-yellow-900',
                verificationData.risk_level === 'HIGH' && 'text-red-900',
              )}>
                {getStatusTitle()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {verificationData.from_cache && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Cached
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Carrier Name and Numbers */}
          <div>
            <p className="font-semibold text-lg">
              {verificationData.legal_name || carrierName || 'Unknown Carrier'}
            </p>
            {verificationData.dba_name && verificationData.dba_name !== verificationData.legal_name && (
              <p className="text-sm text-gray-600">DBA: {verificationData.dba_name}</p>
            )}
            <div className="flex items-center gap-3 mt-1">
              {verificationData.mc_number && (
                <Badge variant="outline" className="text-xs">
                  MC# {verificationData.mc_number}
                </Badge>
              )}
              {verificationData.dot_number && (
                <Badge variant="outline" className="text-xs">
                  DOT# {verificationData.dot_number}
                </Badge>
              )}
            </div>
          </div>

          {/* Critical Warnings */}
          {criticalWarnings.length > 0 && (
            <div className="bg-red-100 border border-red-300 rounded-md p-3 space-y-2">
              {criticalWarnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium text-red-900">{warning.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Key Information Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Status */}
            <div>
              <p className="text-gray-600">Status</p>
              <p className={cn(
                'font-medium',
                verificationData.operating_status === 'AUTHORIZED' ? 'text-green-600' : 'text-red-600'
              )}>
                {verificationData.operating_status || 'Unknown'}
              </p>
            </div>

            {/* Authority Age */}
            {verificationData.authority_age_days && (
              <div>
                <p className="text-gray-600">Authority Age</p>
                <p className={cn(
                  'font-medium',
                  verificationData.authority_age_days < 90 && 'text-yellow-600'
                )}>
                  {verificationData.authority_age_days < 365
                    ? `${verificationData.authority_age_days} days`
                    : `${Math.floor(verificationData.authority_age_days / 365)} years`}
                </p>
              </div>
            )}

            {/* Insurance Status */}
            <div>
              <p className="text-gray-600">Insurance</p>
              <p className={cn(
                'font-medium',
                verificationData.insurance?.liability?.status === 'ADEQUATE' ? 'text-green-600' :
                verificationData.insurance?.liability?.status === 'INADEQUATE' ? 'text-yellow-600' :
                'text-red-600'
              )}>
                {verificationData.insurance?.liability?.status === 'ADEQUATE' ? 'Active' :
                 verificationData.insurance?.liability?.status === 'INADEQUATE' ? 'Insufficient' :
                 'Not on File'}
                {verificationData.insurance?.liability?.on_file &&
                  ` (${formatCurrency(verificationData.insurance.liability.on_file)})`}
              </p>
            </div>

            {/* Safety Rating */}
            <div>
              <p className="text-gray-600">Safety Rating</p>
              <p className={cn(
                'font-medium',
                verificationData.safety_rating === 'SATISFACTORY' ? 'text-green-600' :
                verificationData.safety_rating === 'CONDITIONAL' ? 'text-yellow-600' :
                verificationData.safety_rating === 'UNSATISFACTORY' ? 'text-red-600' :
                'text-gray-600'
              )}>
                {verificationData.safety_rating || 'Not Rated'}
              </p>
            </div>
          </div>

          {/* Normal Warnings */}
          {normalWarnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 space-y-2">
              {normalWarnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-900">{warning.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullReport(true)}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Full Report
          </Button>
        </CardContent>
      </Card>

      {/* Full Report Modal */}
      <Dialog open={showFullReport} onOpenChange={setShowFullReport}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Full FMCSA Verification Report
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Company Information */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">
                Company Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Legal Name</p>
                  <p className="font-medium">{verificationData.legal_name || 'N/A'}</p>
                </div>
                {verificationData.dba_name && (
                  <div>
                    <p className="text-gray-600">DBA Name</p>
                    <p className="font-medium">{verificationData.dba_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">MC Number</p>
                  <p className="font-medium">{verificationData.mc_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">DOT Number</p>
                  <p className="font-medium">{verificationData.dot_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Operating Status</p>
                  <p className={cn(
                    'font-medium',
                    verificationData.operating_status === 'AUTHORIZED' ? 'text-green-600' : 'text-red-600'
                  )}>
                    {verificationData.operating_status || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Authority Age</p>
                  <p className="font-medium">
                    {verificationData.authority_age_days
                      ? `${verificationData.authority_age_days} days`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Insurance Details */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">
                Insurance Coverage
              </h3>
              <div className="space-y-3">
                {/* Liability Insurance */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Liability Insurance (BIPD)</span>
                    <Badge variant={
                      verificationData.insurance?.liability?.status === 'ADEQUATE' ? 'default' :
                      verificationData.insurance?.liability?.status === 'INADEQUATE' ? 'secondary' :
                      'destructive'
                    }>
                      {verificationData.insurance?.liability?.status || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Required: </span>
                      <span className="font-medium">
                        {verificationData.insurance?.liability?.required
                          ? formatCurrency(verificationData.insurance.liability.required)
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">On File: </span>
                      <span className="font-medium">
                        {verificationData.insurance?.liability?.on_file
                          ? formatCurrency(verificationData.insurance.liability.on_file)
                          : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cargo Insurance */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Cargo Insurance</span>
                    <Badge variant={
                      verificationData.insurance?.cargo?.status === 'ADEQUATE' ? 'default' :
                      verificationData.insurance?.cargo?.status === 'INADEQUATE' ? 'secondary' :
                      'destructive'
                    }>
                      {verificationData.insurance?.cargo?.status || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Required: </span>
                      <span className="font-medium">
                        {verificationData.insurance?.cargo?.required
                          ? formatCurrency(verificationData.insurance.cargo.required)
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">On File: </span>
                      <span className="font-medium">
                        {verificationData.insurance?.cargo?.on_file
                          ? formatCurrency(verificationData.insurance.cargo.on_file)
                          : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Safety Scores */}
            {verificationData.safety_scores && (
              <div>
                <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">
                  Safety Performance
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">Vehicle Out-of-Service Rate</p>
                    <p className={cn(
                      'text-2xl font-bold',
                      (verificationData.safety_scores.vehicle_oos_rate || 0) > 30 ? 'text-red-600' :
                      (verificationData.safety_scores.vehicle_oos_rate || 0) > 20.7 ? 'text-yellow-600' :
                      'text-green-600'
                    )}>
                      {verificationData.safety_scores.vehicle_oos_rate?.toFixed(1) || '0'}%
                    </p>
                    <p className="text-xs text-gray-500">
                      National avg: {verificationData.safety_scores.national_avg_vehicle}%
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">Driver Out-of-Service Rate</p>
                    <p className={cn(
                      'text-2xl font-bold',
                      (verificationData.safety_scores.driver_oos_rate || 0) > 10 ? 'text-red-600' :
                      (verificationData.safety_scores.driver_oos_rate || 0) > 5.5 ? 'text-yellow-600' :
                      'text-green-600'
                    )}>
                      {verificationData.safety_scores.driver_oos_rate?.toFixed(1) || '0'}%
                    </p>
                    <p className="text-xs text-gray-500">
                      National avg: {verificationData.safety_scores.national_avg_driver}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Crash History */}
            {verificationData.crashes && (
              <div>
                <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">
                  Crash History (24 months)
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="border rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{verificationData.crashes.fatal}</p>
                    <p className="text-xs text-gray-600">Fatal</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600">{verificationData.crashes.injury}</p>
                    <p className="text-xs text-gray-600">Injury</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{verificationData.crashes.tow}</p>
                    <p className="text-xs text-gray-600">Tow-away</p>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{verificationData.crashes.total}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fleet Information */}
            {verificationData.fleet_size && (
              <div>
                <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">
                  Fleet Size
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-2xl font-bold">{verificationData.fleet_size.power_units || 0}</p>
                        <p className="text-xs text-gray-600">Power Units</p>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-2xl font-bold">{verificationData.fleet_size.drivers || 0}</p>
                        <p className="text-xs text-gray-600">Drivers</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Warnings */}
            {verificationData.warnings && verificationData.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">
                  All Warnings & Notices
                </h3>
                <div className="space-y-2">
                  {verificationData.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded',
                        warning.type === 'CRITICAL' && 'bg-red-50',
                        warning.type === 'WARNING' && 'bg-yellow-50',
                        warning.type === 'INFO' && 'bg-blue-50'
                      )}
                    >
                      {warning.type === 'CRITICAL' && <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                      {warning.type === 'WARNING' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                      {warning.type === 'INFO' && <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />}
                      <p className="text-sm">{warning.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Assessment */}
            <div>
              <h3 className="font-semibold text-sm uppercase text-gray-600 mb-3">
                Risk Assessment
              </h3>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">Overall Risk Score</span>
                  <span className={cn(
                    'text-2xl font-bold',
                    (verificationData.risk_score || 0) >= 80 ? 'text-green-600' :
                    (verificationData.risk_score || 0) >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  )}>
                    {verificationData.risk_score || 0}/100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Risk Level</span>
                  <Badge
                    variant={
                      verificationData.risk_level === 'LOW' ? 'default' :
                      verificationData.risk_level === 'MEDIUM' ? 'secondary' :
                      'destructive'
                    }
                    className={cn(
                      verificationData.risk_level === 'LOW' && 'bg-green-100 text-green-800',
                      verificationData.risk_level === 'MEDIUM' && 'bg-yellow-100 text-yellow-800',
                      verificationData.risk_level === 'HIGH' && 'bg-red-100 text-red-800'
                    )}
                  >
                    {verificationData.risk_level || 'Unknown'} RISK
                  </Badge>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-xs text-gray-500">
                {verificationData.from_cache && (
                  <p>Cached data expires: {verificationData.cache_expires_at ? format(new Date(verificationData.cache_expires_at), 'PPp') : 'N/A'}</p>
                )}
                <p>Last verified: {verificationData.verified_at ? format(new Date(verificationData.verified_at), 'PPp') : 'N/A'}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const mc = verificationData.mc_number?.replace(/\D/g, '');
                  if (mc) {
                    window.open(`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`, '_blank');
                  }
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on FMCSA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}