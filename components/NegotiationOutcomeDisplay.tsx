"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NegotiationOutcome {
  status: 'agreed' | 'pending' | 'rejected' | 'callback_requested';
  agreed_rate: number | null;
  rate_type: 'flat' | 'per_mile';
  rate_includes_fuel: boolean | 'unknown';
  broker_final_position: number | null;
  carrier_final_position: number | null;
  pending_reason?: string;
  rejection_reason?: string;
  callback_conditions?: string;
  accessorials_discussed?: {
    detention?: string;
    lumper?: string;
    tonu?: string;
    other?: string;
  };
  contingencies?: string[];
  confidence: {
    agreement_status: number;
    agreed_rate: number;
    final_positions: number;
  };
  negotiation_summary?: string;
  rate_history?: Array<{ speaker: string; rate: number }>;
}

interface NegotiationOutcomeDisplayProps {
  outcome: NegotiationOutcome;
  shouldGenerateRateCon?: boolean;
  nextSteps?: string[];
  validationWarnings?: string[];
  rateAnalysis?: {
    pattern: string;
    finalGap: number;
    numberOfRounds: number;
    convergence: boolean;
  };
}

export function NegotiationOutcomeDisplay({
  outcome,
  shouldGenerateRateCon,
  nextSteps,
  validationWarnings,
  rateAnalysis,
}: NegotiationOutcomeDisplayProps) {
  const getStatusIcon = () => {
    switch (outcome.status) {
      case 'agreed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'callback_requested':
        return <Phone className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (outcome.status) {
      case 'agreed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'callback_requested':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatRate = (rate: number | null) => {
    if (!rate) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rate);
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Rate Negotiation Outcome
          </CardTitle>
          <Badge className={cn('capitalize', getStatusColor())}>
            {outcome.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Rate Display */}
        {outcome.status === 'agreed' && outcome.agreed_rate && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Agreed Rate</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatRate(outcome.agreed_rate)}
                  {outcome.rate_type === 'per_mile' && <span className="text-sm ml-1">per mile</span>}
                </p>
                {outcome.rate_includes_fuel !== 'unknown' && (
                  <p className="text-xs text-green-600 mt-1">
                    {outcome.rate_includes_fuel ? 'Includes fuel' : 'Plus fuel surcharge'}
                  </p>
                )}
              </div>
              {shouldGenerateRateCon && (
                <Badge variant="outline" className="bg-white">
                  <FileText className="h-3 w-3 mr-1" />
                  Rate Con Ready
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Negotiation Positions */}
        {(outcome.broker_final_position || outcome.carrier_final_position) && (
          <div className="grid grid-cols-2 gap-4">
            {outcome.broker_final_position && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Broker's Final Position</p>
                <p className="text-lg font-semibold">{formatRate(outcome.broker_final_position)}</p>
              </div>
            )}
            {outcome.carrier_final_position && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Carrier's Final Position</p>
                <p className="text-lg font-semibold">{formatRate(outcome.carrier_final_position)}</p>
              </div>
            )}
          </div>
        )}

        {/* Rate Gap Analysis */}
        {outcome.broker_final_position && outcome.carrier_final_position &&
         outcome.status !== 'agreed' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Rate Gap: {formatRate(Math.abs(outcome.broker_final_position - outcome.carrier_final_position))}
                </p>
                <p className="text-xs text-yellow-600">
                  Parties are {((Math.abs(outcome.broker_final_position - outcome.carrier_final_position) /
                    ((outcome.broker_final_position + outcome.carrier_final_position) / 2)) * 100).toFixed(1)}% apart
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status-specific Information */}
        {outcome.status === 'pending' && outcome.pending_reason && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Pending:</strong> {outcome.pending_reason}
            </AlertDescription>
          </Alert>
        )}

        {outcome.status === 'rejected' && outcome.rejection_reason && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Rejection Reason:</strong> {outcome.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        {outcome.status === 'callback_requested' && outcome.callback_conditions && (
          <Alert className="border-blue-200 bg-blue-50">
            <Phone className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Callback Conditions:</strong> {outcome.callback_conditions}
            </AlertDescription>
          </Alert>
        )}

        {/* Accessorials */}
        {outcome.accessorials_discussed &&
         Object.keys(outcome.accessorials_discussed).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Accessorials Discussed</p>
            <div className="space-y-1">
              {outcome.accessorials_discussed.detention && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">Detention</Badge>
                  <span className="text-gray-600">{outcome.accessorials_discussed.detention}</span>
                </div>
              )}
              {outcome.accessorials_discussed.lumper && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">Lumper</Badge>
                  <span className="text-gray-600">{outcome.accessorials_discussed.lumper}</span>
                </div>
              )}
              {outcome.accessorials_discussed.tonu && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">TONU</Badge>
                  <span className="text-gray-600">{outcome.accessorials_discussed.tonu}</span>
                </div>
              )}
              {outcome.accessorials_discussed.other && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">Other</Badge>
                  <span className="text-gray-600">{outcome.accessorials_discussed.other}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contingencies */}
        {outcome.contingencies && outcome.contingencies.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Contingencies
            </p>
            <ul className="list-disc list-inside space-y-1">
              {outcome.contingencies.map((contingency, index) => (
                <li key={index} className="text-sm text-amber-700">{contingency}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence Scores */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">Agreement Confidence</p>
            <p className="text-lg font-semibold">{outcome.confidence.agreement_status}%</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">Rate Confidence</p>
            <p className="text-lg font-semibold">{outcome.confidence.agreed_rate}%</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-xs text-gray-600">Position Confidence</p>
            <p className="text-lg font-semibold">{outcome.confidence.final_positions}%</p>
          </div>
        </div>

        {/* Rate History */}
        {outcome.rate_history && outcome.rate_history.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Negotiation History</p>
            <div className="space-y-1">
              {outcome.rate_history.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-600">{entry.speaker}:</span>
                  <span className="font-medium">{formatRate(entry.rate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rate Analysis */}
        {rateAnalysis && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Negotiation Analysis</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Pattern:</span>
                <span className="ml-1 font-medium capitalize">
                  {rateAnalysis.pattern.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Rounds:</span>
                <span className="ml-1 font-medium">{rateAnalysis.numberOfRounds}</span>
              </div>
              {rateAnalysis.finalGap > 0 && (
                <div>
                  <span className="text-gray-600">Final Gap:</span>
                  <span className="ml-1 font-medium">{formatRate(rateAnalysis.finalGap)}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Convergence:</span>
                <span className="ml-1 font-medium">
                  {rateAnalysis.convergence ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-red-600">No</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {outcome.negotiation_summary && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">{outcome.negotiation_summary}</p>
          </div>
        )}

        {/* Validation Warnings */}
        {validationWarnings && validationWarnings.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <p className="font-medium text-amber-800 mb-1">Review Required</p>
              <ul className="list-disc list-inside space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index} className="text-sm text-amber-700">{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Next Steps */}
        {nextSteps && nextSteps.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Recommended Next Steps</p>
            <ul className="space-y-2">
              {nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-gray-600">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}