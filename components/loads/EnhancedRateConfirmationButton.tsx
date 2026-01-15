'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { RateConfirmationModal } from './RateConfirmationModal';
import type { Load, Carrier } from '@/lib/types';

interface EnhancedRateConfirmationButtonProps {
  load: Load;
  carrier?: Carrier;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * Enhanced Rate Confirmation Button that uses the new API-based PDF generation
 * with storage, tracking, and email functionality.
 */
export function EnhancedRateConfirmationButton({
  load,
  carrier,
  variant = 'ghost',
  size = 'icon',
  className
}: EnhancedRateConfirmationButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Check if we have minimum required data
  const hasRequiredData = Boolean(
    load &&
    carrier &&
    load.rate_to_carrier
  );

  const handleClick = () => {
    if (!hasRequiredData) {
      return;
    }
    setModalOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={!hasRequiredData}
        title={hasRequiredData ? 'Manage rate confirmation' : 'Carrier and rate required'}
        className={className}
      >
        <FileText className="h-4 w-4" />
        {size !== 'icon' && <span className="ml-2">Rate Confirmation</span>}
      </Button>

      {modalOpen && (
        <RateConfirmationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          loadId={load.id}
          loadNumber={load.reference_number || load.id.slice(0, 8)}
          carrierName={carrier.carrier_name}
          carrierEmail={carrier.email || ''}
          carrierRate={load.rate_to_carrier || 0}
          hasRequiredData={hasRequiredData}
        />
      )}
    </>
  );
}

/**
 * Quick version for use in tables - icon only
 */
export function QuickEnhancedRateConfirmation({
  load,
  carrier
}: {
  load: Load;
  carrier?: Carrier;
}) {
  return (
    <EnhancedRateConfirmationButton
      load={load}
      carrier={carrier}
      variant="ghost"
      size="icon"
    />
  );
}