"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Check, Loader2, AlertCircle } from "lucide-react";
import type { CallStatus } from "@/lib/types/approval";

interface ApproveCallButtonProps {
  callId: string;
  currentStatus: CallStatus;
  onApproved?: () => void;
}

export function ApproveCallButton({ callId, currentStatus, onApproved }: ApproveCallButtonProps) {
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  // Only show button for calls that need approval
  const canApprove = ['transcribed', 'pending_review', 'in_review'].includes(currentStatus);

  if (!canApprove) {
    return null;
  }

  const handleApprove = async () => {
    setIsApproving(true);

    try {
      const response = await fetch(`/api/calls/${callId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: 'Approved from UI',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve call');
      }

      const result = await response.json();

      toast({
        title: "Call Approved",
        description: result.extractionTriggered
          ? "CRM data extraction is now in progress"
          : "Call has been approved successfully",
      });

      // Trigger callback to refresh the page
      if (onApproved) {
        onApproved();
      } else {
        // Reload the page to show updated status
        window.location.reload();
      }
    } catch (error) {
      console.error('Error approving call:', error);

      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve call",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Button
      onClick={handleApprove}
      disabled={isApproving}
      size="lg"
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      {isApproving ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Approving...
        </>
      ) : (
        <>
          <Check className="mr-2 h-5 w-5" />
          Approve & Extract Data
        </>
      )}
    </Button>
  );
}

interface ReviewAlertProps {
  triggerReason: string | null;
  qualityScore?: number;
}

export function ReviewAlert({ triggerReason, qualityScore }: ReviewAlertProps) {
  if (!triggerReason) return null;

  // Determine severity based on quality score
  const isCritical = qualityScore !== undefined && qualityScore < 60;

  return (
    <div
      className={`${
        isCritical
          ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
      } border rounded-lg p-4 flex items-start gap-3`}
    >
      <AlertCircle
        className={`h-5 w-5 ${
          isCritical
            ? 'text-red-600 dark:text-red-400'
            : 'text-blue-600 dark:text-blue-400'
        } mt-0.5 flex-shrink-0`}
      />
      <div className="flex-1">
        <h4
          className={`font-semibold ${
            isCritical
              ? 'text-red-900 dark:text-red-100'
              : 'text-blue-900 dark:text-blue-100'
          } mb-1`}
        >
          {isCritical ? 'Low Quality Detected' : 'Quality Notice'}
        </h4>
        <p
          className={`text-sm ${
            isCritical
              ? 'text-red-800 dark:text-red-200'
              : 'text-blue-800 dark:text-blue-200'
          }`}
        >
          {triggerReason}
        </p>
        {qualityScore !== undefined && (
          <p
            className={`text-xs ${
              isCritical
                ? 'text-red-700 dark:text-red-300'
                : 'text-blue-700 dark:text-blue-300'
            } mt-2`}
          >
            Quality Score: {qualityScore}/100
            {!isCritical && ' - Data has been extracted, but you may want to review'}
          </p>
        )}
      </div>
    </div>
  );
}
