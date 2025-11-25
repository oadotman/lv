"use client";

import { getConfidenceBadgeColor, getConfidenceIndicator } from "@/lib/quality/review-triggers";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldConfidenceBadgeProps {
  confidence: number;
  fieldName?: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
}

export function FieldConfidenceBadge({
  confidence,
  fieldName,
  showTooltip = true,
  size = 'sm',
}: FieldConfidenceBadgeProps) {
  const indicator = getConfidenceIndicator(confidence);
  const colors = getConfidenceBadgeColor(confidence);
  const percentage = Math.round(confidence * 100);

  const badge = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border} ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}
    >
      <span>{colors.icon}</span>
      <span className="capitalize">{indicator}</span>
      {size === 'md' && <span className="text-xs opacity-75">({percentage}%)</span>}
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {badge}
            <Info className="h-3 w-3 opacity-50" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            {fieldName && (
              <p className="font-semibold">{fieldName}</p>
            )}
            <p>Confidence: {percentage}%</p>
            {indicator === 'low' && (
              <p className="text-amber-600 dark:text-amber-400">
                You may want to verify this field
              </p>
            )}
            {indicator === 'medium' && (
              <p className="text-yellow-600 dark:text-yellow-400">
                This field is likely correct
              </p>
            )}
            {indicator === 'high' && (
              <p className="text-green-600 dark:text-green-400">
                High confidence - likely accurate
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface QualitySummaryCardProps {
  qualityScore: number;
  transcriptConfidence: number;
  lowConfidenceFieldsCount: number;
  className?: string;
}

export function QualitySummaryCard({
  qualityScore,
  transcriptConfidence,
  lowConfidenceFieldsCount,
  className = '',
}: QualitySummaryCardProps) {
  const overallIndicator = getConfidenceIndicator(qualityScore / 100);
  const colors = getConfidenceBadgeColor(qualityScore / 100);

  return (
    <div
      className={`rounded-lg border p-4 ${colors.bg} ${colors.border} ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className={`text-sm font-semibold ${colors.text}`}>
            Quality Score
          </h4>
          <p className="text-xs opacity-75 mt-0.5">
            Overall data quality assessment
          </p>
        </div>
        <span className="text-2xl">{colors.icon}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Overall</span>
          <span className={`text-sm font-semibold ${colors.text}`}>
            {qualityScore}/100
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs opacity-75">Transcription</span>
          <span className="text-xs">
            {Math.round(transcriptConfidence * 100)}%
          </span>
        </div>

        {lowConfidenceFieldsCount > 0 && (
          <div className="flex items-center justify-between text-xs opacity-75">
            <span>Fields to review</span>
            <span>{lowConfidenceFieldsCount}</span>
          </div>
        )}
      </div>

      {overallIndicator === 'low' && (
        <p className="text-xs mt-3 pt-3 border-t border-current/10">
          💡 Tip: Review highlighted fields and edit as needed
        </p>
      )}
    </div>
  );
}
