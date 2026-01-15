'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Info,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Building2,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Truck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface CarrierVerificationBadgeProps {
  carrierId?: string;
  mcNumber?: string;
  dotNumber?: string;
  carrierName?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onVerificationComplete?: (result: any) => void;
}

interface VerificationData {
  verified: boolean;
  legal_name?: string;
  operating_status?: string;
  safety_rating?: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  risk_score: number;
  warnings: Array<{
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
  }>;
  insurance?: {
    liability: {
      status: string;
      required: number;
      on_file: number;
    };
    cargo: {
      status: string;
      required: number;
      on_file: number;
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
  authority_age_days?: number;
  verified_at?: string;
  from_cache?: boolean;
}

export function CarrierVerificationBadge({
  carrierId,
  mcNumber,
  dotNumber,
  carrierName,
  showDetails = false,
  size = 'md',
  className,
  onVerificationComplete,
}: CarrierVerificationBadgeProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-verify if we have the necessary data
    if ((mcNumber || dotNumber) && !verificationData) {
      verifyCarrier(false);
    }
  }, [mcNumber, dotNumber]);

  const verifyCarrier = async (forceRefresh: boolean = false) => {
    if (!mcNumber && !dotNumber && !carrierId) {
      setError('No MC or DOT number available');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (mcNumber) params.append('mc', mcNumber);
      if (dotNumber) params.append('dot', dotNumber);
      if (carrierId) params.append('carrier_id', carrierId);
      if (forceRefresh) params.append('force', 'true');

      const response = await fetch(`/api/carriers/verify?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setVerificationData(data);
      if (onVerificationComplete) {
        onVerificationComplete(data);
      }

      if (!data.from_cache && data.verified) {
        toast({
          title: 'Carrier Verified',
          description: `${data.legal_name || carrierName} has been verified with FMCSA`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      toast({
        title: 'Verification Error',
        description: 'Unable to verify carrier at this time',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getRiskIcon = () => {
    if (!verificationData) return <Shield className="h-4 w-4" />;

    switch (verificationData.risk_level) {
      case 'LOW':
        return <ShieldCheck className="h-4 w-4" />;
      case 'MEDIUM':
        return <ShieldAlert className="h-4 w-4" />;
      case 'HIGH':
        return <ShieldX className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getRiskColor = () => {
    if (!verificationData) return 'bg-gray-100 text-gray-700';

    switch (verificationData.risk_level) {
      case 'LOW':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'HIGH':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return `$${amount.toLocaleString()}`;
  };

  if (isVerifying && !verificationData) {
    return (
      <Skeleton className={cn('h-6 w-24', className)} />
    );
  }

  return (
    <>
      <div className={cn('inline-flex items-center gap-2', className)}>
        {verificationData ? (
          <Badge
            className={cn(
              getRiskColor(),
              'cursor-pointer transition-all hover:opacity-80',
              size === 'sm' && 'text-xs px-2 py-0.5',
              size === 'lg' && 'text-base px-4 py-1.5'
            )}
            onClick={() => setShowDetailsDialog(true)}
          >
            {getRiskIcon()}
            <span className="ml-1">
              {verificationData.risk_level} RISK ({verificationData.risk_score}/100)
            </span>
          </Badge>
        ) : (
          <Button
            variant="outline"
            size={size === 'sm' ? 'sm' : size === 'lg' ? 'default' : 'sm'}
            onClick={() => verifyCarrier(false)}
            disabled={isVerifying}
            className="gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Verify Carrier
              </>
            )}
          </Button>
        )}

        {verificationData && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => verifyCarrier(true)}
            disabled={isVerifying}
            title="Refresh verification"
            className="h-8 w-8"
          >
            <RefreshCw className={cn('h-4 w-4', isVerifying && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Verification Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getRiskIcon()}
              Carrier Verification Report
            </DialogTitle>
            <DialogDescription>
              FMCSA SAFER Database Verification Results
            </DialogDescription>
          </DialogHeader>

          {verificationData && (
            <div className="space-y-6">
              {/* Risk Summary */}
              <Card className={cn('border-2', getRiskColor())}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Risk Assessment</span>
                    <Badge variant="outline" className="text-lg font-bold">
                      {verificationData.risk_score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Level</p>
                      <p className="text-lg font-semibold">{verificationData.risk_level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Operating Status</p>
                      <p className="text-lg font-semibold">
                        {verificationData.operating_status || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings */}
              {verificationData.warnings && verificationData.warnings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Warnings & Alerts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {verificationData.warnings.map((warning, idx) => (
                        <Alert
                          key={idx}
                          className={cn(
                            warning.type === 'CRITICAL' && 'border-red-500 bg-red-50',
                            warning.type === 'WARNING' && 'border-yellow-500 bg-yellow-50',
                            warning.type === 'INFO' && 'border-blue-500 bg-blue-50'
                          )}
                        >
                          {getWarningIcon(warning.type)}
                          <AlertDescription className="ml-2">
                            {warning.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Legal Name</p>
                      <p className="font-medium">{verificationData.legal_name || carrierName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">MC Number</p>
                      <p className="font-medium">{mcNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">DOT Number</p>
                      <p className="font-medium">{dotNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Authority Age</p>
                      <p className="font-medium">
                        {verificationData.authority_age_days
                          ? `${verificationData.authority_age_days} days`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insurance Status */}
              {verificationData.insurance && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Insurance Coverage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Liability Insurance</span>
                          <Badge
                            variant={
                              verificationData.insurance.liability.status === 'ADEQUATE'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {verificationData.insurance.liability.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Required: {formatCurrency(verificationData.insurance.liability.required)}</span>
                          <span>On File: {formatCurrency(verificationData.insurance.liability.on_file)}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Cargo Insurance</span>
                          <Badge
                            variant={
                              verificationData.insurance.cargo.status === 'ADEQUATE'
                                ? 'default'
                                : verificationData.insurance.cargo.status === 'NOT_ON_FILE'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {verificationData.insurance.cargo.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Required: {formatCurrency(verificationData.insurance.cargo.required)}</span>
                          <span>On File: {formatCurrency(verificationData.insurance.cargo.on_file)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Safety Scores */}
              {verificationData.safety_scores && (
                <Card>
                  <CardHeader>
                    <CardTitle>Safety Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Vehicle Out-of-Service Rate</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {verificationData.safety_scores.vehicle_oos_rate?.toFixed(1) || 'N/A'}%
                          </span>
                          {verificationData.safety_scores.vehicle_oos_rate && (
                            <>
                              {verificationData.safety_scores.vehicle_oos_rate >
                              verificationData.safety_scores.national_avg_vehicle ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                (Nat'l Avg: {verificationData.safety_scores.national_avg_vehicle}%)
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Driver Out-of-Service Rate</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            {verificationData.safety_scores.driver_oos_rate?.toFixed(1) || 'N/A'}%
                          </span>
                          {verificationData.safety_scores.driver_oos_rate && (
                            <>
                              {verificationData.safety_scores.driver_oos_rate >
                              verificationData.safety_scores.national_avg_driver ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                (Nat'l Avg: {verificationData.safety_scores.national_avg_driver}%)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fleet Information */}
              {verificationData.fleet_size && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Fleet Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Power Units</p>
                        <p className="text-lg font-semibold">
                          {verificationData.fleet_size.power_units || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Drivers</p>
                        <p className="text-lg font-semibold">
                          {verificationData.fleet_size.drivers || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Verification Metadata */}
              <div className="text-sm text-muted-foreground text-center">
                Verified at: {new Date(verificationData.verified_at || Date.now()).toLocaleString()}
                {verificationData.from_cache && ' (Cached)'}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CarrierVerificationBadge;