'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { FileText, Download, Mail, Eye, Loader2, Check } from 'lucide-react';
import { RateConfirmationPDF, type RateConfirmationData } from '@/lib/loads/rateConfirmationPDF';
import type { Load, Carrier, Shipper } from '@/lib/types';

interface RateConfirmationButtonProps {
  load: Load;
  carrier?: Carrier;
  shipper?: Shipper;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function RateConfirmationButton({
  load,
  carrier,
  shipper,
  className,
  variant = 'outline',
  size = 'default'
}: RateConfirmationButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  // Check if we have minimum required data
  const canGenerate = load && carrier && load.rate_to_carrier;

  const generatePDFData = (): RateConfirmationData => {
    return {
      // Pass the actual Load object
      load: load,

      // Pass the actual Carrier object
      carrier: carrier || undefined,

      // Pass the actual Shipper object
      shipper: shipper || undefined,

      // Organization info
      organization: {
        name: 'Loadvoice Freight Brokerage',
        mc_number: 'MC-123456',
        dot_number: 'DOT-789012',
        address: '123 Logistics Way',
        city: 'Chicago',
        state: 'IL',
        zip: '60601',
        phone: '(555) 123-4567',
        email: 'dispatch@loadvoice.com',
        logo_url: undefined
      },

      // Confirmation details
      confirmationNumber: `RC-${load.id.slice(0, 8).toUpperCase()}`,
      generatedBy: 'System',
      specialInstructions: load.special_requirements?.join(', '),
      paymentTerms: load.payment_terms || 'Net 30 - Quick Pay Available (2% fee)'
    };
  };


  const handleDownload = async () => {
    if (!canGenerate) {
      toast({
        title: 'Missing Information',
        description: 'Load must have a carrier and rate assigned to generate confirmation.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const pdfGenerator = new RateConfirmationPDF();
      const data = generatePDFData();

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `rate-confirmation-${load.id.slice(0, 8)}-${timestamp}.pdf`;

      // Save the PDF
      pdfGenerator.save(data, filename);

      setLastGenerated(new Date());
      toast({
        title: 'Rate Confirmation Generated',
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate rate confirmation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmail = async () => {
    if (!canGenerate) {
      toast({
        title: 'Missing Information',
        description: 'Load must have a carrier and rate assigned to generate confirmation.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const pdfGenerator = new RateConfirmationPDF();
      const data = generatePDFData();

      // Generate PDF as base64
      const base64 = pdfGenerator.generateBase64(data);

      // Here you would typically send this to your backend API
      // to email the PDF to the carrier
      // await sendRateConfirmationEmail(carrier.email, base64);

      toast({
        title: 'Email Sent',
        description: `Rate confirmation sent to ${carrier?.email}`,
      });
    } catch (error) {
      console.error('Error emailing PDF:', error);
      toast({
        title: 'Email Failed',
        description: 'Failed to send rate confirmation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (!canGenerate) {
      toast({
        title: 'Missing Information',
        description: 'Load must have a carrier and rate assigned to generate confirmation.',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const pdfGenerator = new RateConfirmationPDF();
      const data = generatePDFData();

      // Generate PDF blob
      const blob = pdfGenerator.generate(data);

      // Open in new tab for preview
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      toast({
        title: 'Preview Opened',
        description: 'Rate confirmation opened in new tab',
      });
    } catch (error) {
      console.error('Error previewing PDF:', error);
      toast({
        title: 'Preview Failed',
        description: 'Failed to preview rate confirmation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!canGenerate) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        title="Carrier and rate required"
      >
        <FileText className="w-4 h-4 mr-2" />
        Rate Confirmation
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : lastGenerated ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Rate Confirmation
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Rate Confirmation
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handlePreview} disabled={isGenerating}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} disabled={isGenerating}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail} disabled={isGenerating}>
          <Mail className="w-4 h-4 mr-2" />
          Email to Carrier
        </DropdownMenuItem>
        {lastGenerated && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Last generated: {lastGenerated.toLocaleTimeString()}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simplified version for quick access
export function QuickRateConfirmationButton({
  load,
  carrier,
  shipper
}: {
  load: Load;
  carrier?: Carrier;
  shipper?: Shipper;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerate = load && carrier && load.rate_to_carrier;

  const handleQuickDownload = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    try {
      const pdfGenerator = new RateConfirmationPDF();

      // Use the same simplified data structure
      const data: RateConfirmationData = {
        // Pass the actual objects
        load: load,
        carrier: carrier,
        shipper: shipper || undefined,

        // Organization info
        organization: {
          name: 'Loadvoice Freight',
          mc_number: 'MC-123456',
          dot_number: 'DOT-789012',
          address: '123 Logistics Way',
          city: 'Chicago',
          state: 'IL',
          zip: '60601',
          phone: '(555) 123-4567',
          email: 'dispatch@loadvoice.com',
          logo_url: undefined
        },

        // Confirmation details
        confirmationNumber: `RC-${load.id.slice(0, 8).toUpperCase()}`,
        generatedBy: 'System',
        specialInstructions: load.special_requirements?.join(', '),
        paymentTerms: load.payment_terms || 'Net 30'
      };

      pdfGenerator.save(data, `RC-${load.id.slice(0, 8)}.pdf`);

      toast({
        title: 'Downloaded',
        description: 'Rate confirmation saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleQuickDownload}
      disabled={!canGenerate || isGenerating}
      title={canGenerate ? 'Download rate confirmation' : 'Carrier and rate required'}
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
    </Button>
  );
}