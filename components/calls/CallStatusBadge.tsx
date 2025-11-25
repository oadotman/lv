"use client";

import { Badge } from "@/components/ui/badge";
import type { CallStatus } from "@/lib/types/approval";
import { CheckCircle2, Clock, AlertCircle, XCircle, Loader2, Eye, ThumbsUp } from "lucide-react";

interface CallStatusBadgeProps {
  status: CallStatus;
  className?: string;
}

export function CallStatusBadge({ status, className }: CallStatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant as any}
      className={`flex items-center gap-1.5 ${className || ''}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}

function getStatusConfig(status: CallStatus) {
  const iconSize = 14;

  switch (status) {
    case 'uploading':
      return {
        label: 'Uploading',
        variant: 'secondary',
        icon: <Loader2 size={iconSize} className="animate-spin" />,
      };

    case 'processing':
    case 'transcribing':
      return {
        label: 'Transcribing',
        variant: 'secondary',
        icon: <Loader2 size={iconSize} className="animate-spin" />,
      };

    case 'transcribed':
      return {
        label: 'Transcribed',
        variant: 'outline',
        icon: <CheckCircle2 size={iconSize} />,
      };

    case 'pending_review':
      return {
        label: 'Needs Review',
        variant: 'default',
        icon: <AlertCircle size={iconSize} />,
      };

    case 'in_review':
      return {
        label: 'In Review',
        variant: 'secondary',
        icon: <Eye size={iconSize} />,
      };

    case 'approved':
      return {
        label: 'Approved',
        variant: 'default',
        icon: <ThumbsUp size={iconSize} className="text-green-600 dark:text-green-400" />,
      };

    case 'extracting':
      return {
        label: 'Extracting Data',
        variant: 'secondary',
        icon: <Loader2 size={iconSize} className="animate-spin" />,
      };

    case 'completed':
      return {
        label: 'Completed',
        variant: 'default',
        icon: <CheckCircle2 size={iconSize} className="text-green-600 dark:text-green-400" />,
      };

    case 'rejected':
      return {
        label: 'Rejected',
        variant: 'destructive',
        icon: <XCircle size={iconSize} />,
      };

    case 'failed':
      return {
        label: 'Failed',
        variant: 'destructive',
        icon: <AlertCircle size={iconSize} />,
      };

    default:
      return {
        label: status,
        variant: 'outline',
        icon: <Clock size={iconSize} />,
      };
  }
}
