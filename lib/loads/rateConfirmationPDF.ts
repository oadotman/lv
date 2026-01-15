import jsPDF from 'jspdf';
import type { Load, Carrier, Shipper } from '@/lib/types';

export interface OrganizationInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  mc_number?: string;
  dot_number?: string;
  logo_url?: string;
}

export interface RateConfirmationData {
  load: Load;
  carrier?: Carrier;
  shipper?: Shipper;
  organization: OrganizationInfo;
  confirmationNumber?: string;
  generatedBy?: string;
  specialInstructions?: string;
  paymentTerms?: string;
}

export class RateConfirmationPDF {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.margin = 15;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;
  }

  // Helper function to add wrapped text
  private addWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number = 5
  ): number {
    const lines = this.pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      if (y > this.pageHeight - this.margin) {
        this.pdf.addPage();
        y = this.margin;
      }
      this.pdf.text(line, x, y);
      y += lineHeight;
    });
    return y;
  }

  // Helper to check and add new page if needed
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }
  }

  // Add company header with logo
  private addHeader(org: OrganizationInfo, confirmationNumber?: string): void {
    // Add colored header bar
    this.pdf.setFillColor(101, 67, 211); // Purple color for freight broker theme
    this.pdf.rect(0, 0, this.pageWidth, 35, 'F');

    // Add white text for company name
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(org.name.toUpperCase(), this.margin, 15);

    // Add "RATE CONFIRMATION" title
    this.pdf.setFontSize(16);
    this.pdf.text('RATE CONFIRMATION', this.margin, 25);

    // Add confirmation number on the right
    if (confirmationNumber) {
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'normal');
      const confirmText = `Confirmation #: ${confirmationNumber}`;
      const textWidth = this.pdf.getTextWidth(confirmText);
      this.pdf.text(confirmText, this.pageWidth - this.margin - textWidth, 25);
    }

    this.pdf.setTextColor(0, 0, 0);
    this.currentY = 45;

    // Add broker company info
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`${org.address}`, this.margin, this.currentY);
    this.currentY += 4;
    this.pdf.text(`${org.city}, ${org.state} ${org.zip}`, this.margin, this.currentY);
    this.currentY += 4;
    this.pdf.text(`Phone: ${org.phone} | Email: ${org.email}`, this.margin, this.currentY);
    if (org.mc_number || org.dot_number) {
      this.currentY += 4;
      const numbers = [];
      if (org.mc_number) numbers.push(`MC#: ${org.mc_number}`);
      if (org.dot_number) numbers.push(`DOT#: ${org.dot_number}`);
      this.pdf.text(numbers.join(' | '), this.margin, this.currentY);
    }
    this.currentY += 10;

    // Add date and time
    const now = new Date();
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(100, 100, 100);
    const dateText = `Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
    const dateWidth = this.pdf.getTextWidth(dateText);
    this.pdf.text(dateText, this.pageWidth - this.margin - dateWidth, this.currentY - 5);
    this.pdf.setTextColor(0, 0, 0);

    // Add separator line
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
  }

  // Add carrier information section
  private addCarrierSection(carrier?: Carrier, load?: Load): void {
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFillColor(240, 240, 250);
    this.pdf.rect(this.margin, this.currentY - 3, this.contentWidth, 8, 'F');
    this.pdf.text('CARRIER INFORMATION', this.margin + 2, this.currentY + 2);
    this.currentY += 10;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);

    const leftCol = this.margin + 5;
    const rightCol = this.margin + this.contentWidth / 2;

    // Carrier details
    if (carrier) {
      this.pdf.text(`Carrier Name: ${carrier.carrier_name}`, leftCol, this.currentY);
      if (carrier.mc_number) {
        this.pdf.text(`MC Number: ${carrier.mc_number}`, rightCol, this.currentY);
      }
      this.currentY += 6;

      if (carrier.primary_contact) {
        this.pdf.text(`Contact: ${carrier.primary_contact}`, leftCol, this.currentY);
      }
      if (carrier.phone) {
        this.pdf.text(`Phone: ${carrier.phone}`, rightCol, this.currentY);
      }
      this.currentY += 6;

      if (carrier.email) {
        this.pdf.text(`Email: ${carrier.email}`, leftCol, this.currentY);
      }
      if (carrier.dot_number) {
        this.pdf.text(`DOT Number: ${carrier.dot_number}`, rightCol, this.currentY);
      }
      this.currentY += 6;
    }

    // Driver information from load if available
    if (load?.driver_name || load?.driver_phone) {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Driver Information:', leftCol, this.currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.currentY += 5;

      if (load.driver_name) {
        this.pdf.text(`Driver: ${load.driver_name}`, leftCol, this.currentY);
      }
      if (load.driver_phone) {
        this.pdf.text(`Phone: ${load.driver_phone}`, rightCol, this.currentY);
      }
      this.currentY += 6;

      if (load.truck_number) {
        this.pdf.text(`Truck #: ${load.truck_number}`, leftCol, this.currentY);
      }
      if (load.trailer_number) {
        this.pdf.text(`Trailer #: ${load.trailer_number}`, rightCol, this.currentY);
      }
      this.currentY += 6;
    }

    this.currentY += 5;
  }

  // Add load details section
  private addLoadDetailsSection(load: Load): void {
    this.checkPageBreak(60);

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFillColor(240, 240, 250);
    this.pdf.rect(this.margin, this.currentY - 3, this.contentWidth, 8, 'F');
    this.pdf.text('SHIPMENT DETAILS', this.margin + 2, this.currentY + 2);
    this.currentY += 10;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);

    // Origin and Destination boxes
    const boxWidth = (this.contentWidth - 10) / 2;
    const leftBox = this.margin;
    const rightBox = this.margin + boxWidth + 10;

    // Origin box
    this.pdf.setDrawColor(150, 150, 150);
    this.pdf.setLineWidth(0.3);
    this.pdf.rect(leftBox, this.currentY, boxWidth, 35, 'S');
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('ORIGIN', leftBox + 3, this.currentY + 5);
    this.pdf.setFont('helvetica', 'normal');

    let originY = this.currentY + 10;
    if (load.origin_facility) {
      this.pdf.text(load.origin_facility, leftBox + 3, originY);
      originY += 5;
    }
    this.pdf.text(`${load.origin_city}, ${load.origin_state}`, leftBox + 3, originY);
    originY += 5;
    this.pdf.text(`Pickup: ${this.formatDate(load.pickup_date)}`, leftBox + 3, originY);
    originY += 5;
    if (load.pickup_time) {
      this.pdf.text(`Time: ${load.pickup_time}`, leftBox + 3, originY);
    }

    // Destination box
    this.pdf.rect(rightBox, this.currentY, boxWidth, 35, 'S');
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('DESTINATION', rightBox + 3, this.currentY + 5);
    this.pdf.setFont('helvetica', 'normal');

    let destY = this.currentY + 10;
    if (load.destination_facility) {
      this.pdf.text(load.destination_facility, rightBox + 3, destY);
      destY += 5;
    }
    this.pdf.text(`${load.destination_city}, ${load.destination_state}`, rightBox + 3, destY);
    destY += 5;
    this.pdf.text(`Delivery: ${this.formatDate(load.delivery_date)}`, rightBox + 3, destY);
    destY += 5;
    if (load.delivery_time) {
      this.pdf.text(`Time: ${load.delivery_time}`, rightBox + 3, destY);
    }

    this.currentY += 40;

    // Commodity and equipment details
    const detailsY = this.currentY;
    this.pdf.text(`Commodity: ${load.commodity}`, this.margin + 5, detailsY);
    this.pdf.text(`Equipment Type: ${this.formatEquipmentType(load.equipment_type)}`, rightBox + 3, detailsY);
    this.currentY += 6;

    this.pdf.text(`Weight: ${load.weight_lbs.toLocaleString()} lbs`, this.margin + 5, this.currentY);
    if (load.distance_miles) {
      this.pdf.text(`Distance: ${load.distance_miles.toLocaleString()} miles`, rightBox + 3, this.currentY);
    }
    this.currentY += 6;

    if (load.reference_number) {
      this.pdf.text(`Reference #: ${load.reference_number}`, this.margin + 5, this.currentY);
      this.currentY += 6;
    }

    if (load.po_number) {
      this.pdf.text(`PO #: ${load.po_number}`, this.margin + 5, this.currentY);
      this.currentY += 6;
    }

    this.currentY += 5;
  }

  // Add rate and payment section
  private addRateSection(load: Load, paymentTerms?: string): void {
    this.checkPageBreak(40);

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFillColor(240, 240, 250);
    this.pdf.rect(this.margin, this.currentY - 3, this.contentWidth, 8, 'F');
    this.pdf.text('RATE & PAYMENT', this.margin + 2, this.currentY + 2);
    this.currentY += 10;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);

    // Rate box with emphasis
    this.pdf.setFillColor(255, 255, 240);
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, 15, 'F');
    this.pdf.setDrawColor(200, 200, 100);
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, 15, 'S');

    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(14);
    const rateText = `Total Rate: $${load.rate_to_carrier?.toLocaleString() || '0.00'}`;
    this.pdf.text(rateText, this.margin + 5, this.currentY + 9);

    // Add rate per mile if distance is available
    if (load.distance_miles && load.rate_to_carrier) {
      const rpm = (load.rate_to_carrier / load.distance_miles).toFixed(2);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(10);
      this.pdf.text(`($${rpm} per mile)`, this.margin + 60, this.currentY + 9);
    }

    this.currentY += 20;

    // Payment terms
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);
    const terms = paymentTerms || 'Net 30 days upon receipt of paperwork';
    this.pdf.text(`Payment Terms: ${terms}`, this.margin + 5, this.currentY);
    this.currentY += 6;

    // Add fuel surcharge if applicable
    if (load.fuel_surcharge) {
      this.pdf.text(`Fuel Surcharge: $${load.fuel_surcharge.toLocaleString()}`, this.margin + 5, this.currentY);
      this.currentY += 6;
    }

    // Add detention if applicable
    if (load.detention_time) {
      this.pdf.text(`Detention: ${load.detention_time} hours (as per agreement)`, this.margin + 5, this.currentY);
      this.currentY += 6;
    }

    this.currentY += 5;
  }

  // Add special instructions section
  private addSpecialInstructions(instructions?: string, requirements?: string[]): void {
    if (!instructions && (!requirements || requirements.length === 0)) return;

    this.checkPageBreak(30);

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFillColor(240, 240, 250);
    this.pdf.rect(this.margin, this.currentY - 3, this.contentWidth, 8, 'F');
    this.pdf.text('SPECIAL INSTRUCTIONS', this.margin + 2, this.currentY + 2);
    this.currentY += 10;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);

    // Add requirements as bullet points
    if (requirements && requirements.length > 0) {
      requirements.forEach(req => {
        this.pdf.text(`• ${req}`, this.margin + 5, this.currentY);
        this.currentY += 5;
      });
      this.currentY += 3;
    }

    // Add special instructions
    if (instructions) {
      this.currentY = this.addWrappedText(
        instructions,
        this.margin + 5,
        this.currentY,
        this.contentWidth - 10,
        5
      );
    }

    this.currentY += 5;
  }

  // Add terms and conditions section
  private addTermsAndConditions(): void {
    this.checkPageBreak(80);

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFillColor(240, 240, 250);
    this.pdf.rect(this.margin, this.currentY - 3, this.contentWidth, 8, 'F');
    this.pdf.text('TERMS AND CONDITIONS', this.margin + 2, this.currentY + 2);
    this.currentY += 10;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);

    const terms = [
      '1. CARRIER AGREES to transport the commodities described above in accordance with all applicable federal and state regulations.',
      '2. CARRIER certifies that it maintains cargo insurance of at least $100,000 and liability insurance of at least $1,000,000.',
      '3. CARRIER shall be liable for loss or damage to cargo while in its possession and control.',
      '4. Payment terms are as stated above. Quick pay available at 2% discount.',
      '5. This rate confirmation is subject to the terms of the broker-carrier agreement on file.',
      '6. CARRIER agrees not to re-broker this load without written consent from BROKER.',
      '7. CARRIER must provide POD within 24 hours of delivery.',
      '8. Any disputes shall be resolved through binding arbitration.'
    ];

    terms.forEach(term => {
      this.currentY = this.addWrappedText(
        term,
        this.margin + 5,
        this.currentY,
        this.contentWidth - 10,
        4
      );
      this.currentY += 2;
    });

    this.currentY += 5;
  }

  // Add signature section
  private addSignatureSection(generatedBy?: string): void {
    // Check if we need a new page for signatures
    if (this.currentY > this.pageHeight - 60) {
      this.pdf.addPage();
      this.currentY = this.margin;
    }

    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFillColor(240, 240, 250);
    this.pdf.rect(this.margin, this.currentY - 3, this.contentWidth, 8, 'F');
    this.pdf.text('AGREEMENT & SIGNATURES', this.margin + 2, this.currentY + 2);
    this.currentY += 12;

    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(10);

    const agreementText = 'By signing below, CARRIER agrees to the rates and terms specified in this confirmation.';
    this.currentY = this.addWrappedText(
      agreementText,
      this.margin,
      this.currentY,
      this.contentWidth,
      5
    );
    this.currentY += 10;

    // Two signature boxes side by side
    const sigBoxWidth = (this.contentWidth - 20) / 2;
    const leftSig = this.margin;
    const rightSig = this.margin + sigBoxWidth + 20;

    // Carrier signature box
    this.pdf.text('CARRIER:', leftSig, this.currentY);
    this.currentY += 8;
    this.pdf.line(leftSig, this.currentY, leftSig + sigBoxWidth, this.currentY);
    this.currentY += 5;
    this.pdf.setFontSize(8);
    this.pdf.text('Authorized Signature', leftSig, this.currentY);
    this.currentY += 8;
    this.pdf.line(leftSig, this.currentY, leftSig + sigBoxWidth, this.currentY);
    this.currentY += 5;
    this.pdf.text('Print Name & Title', leftSig, this.currentY);
    this.currentY += 8;
    this.pdf.line(leftSig, this.currentY, leftSig + sigBoxWidth, this.currentY);
    this.currentY += 5;
    this.pdf.text('Date', leftSig, this.currentY);

    // Reset Y for broker signature
    this.currentY -= 31;

    // Broker signature box
    this.pdf.setFontSize(10);
    this.pdf.text('BROKER:', rightSig, this.currentY);
    this.currentY += 8;
    if (generatedBy) {
      this.pdf.setFont('helvetica', 'italic');
      this.pdf.text(generatedBy, rightSig + 5, this.currentY - 2);
      this.pdf.setFont('helvetica', 'normal');
    }
    this.pdf.line(rightSig, this.currentY, rightSig + sigBoxWidth, this.currentY);
    this.currentY += 5;
    this.pdf.setFontSize(8);
    this.pdf.text('Authorized Representative', rightSig, this.currentY);
    this.currentY += 8;

    // Auto-fill date for broker
    const today = new Date().toLocaleDateString();
    this.pdf.text(today, rightSig + 5, this.currentY - 2);
    this.pdf.line(rightSig, this.currentY, rightSig + sigBoxWidth, this.currentY);
    this.currentY += 5;
    this.pdf.text('Date', rightSig, this.currentY);
  }

  // Format date helper
  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Format equipment type helper
  private formatEquipmentType(type: string): string {
    const formatted = type.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // Main generate method
  public generate(data: RateConfirmationData): Blob {
    const { load, carrier, organization, confirmationNumber, generatedBy, specialInstructions, paymentTerms } = data;

    // Generate confirmation number if not provided
    const confirmNum = confirmationNumber || `RC-${Date.now().toString().slice(-8)}`;

    // Add all sections
    this.addHeader(organization, confirmNum);
    this.addCarrierSection(carrier, load);
    this.addLoadDetailsSection(load);
    this.addRateSection(load, paymentTerms);
    this.addSpecialInstructions(specialInstructions, load.special_requirements);
    this.addTermsAndConditions();
    this.addSignatureSection(generatedBy);

    // Add page numbers
    const pageCount = this.pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.pdf.setPage(i);
      this.pdf.setFontSize(8);
      this.pdf.setTextColor(128, 128, 128);
      const pageText = `Page ${i} of ${pageCount}`;
      const textWidth = this.pdf.getTextWidth(pageText);
      this.pdf.text(
        pageText,
        this.pageWidth - this.margin - textWidth,
        this.pageHeight - 10
      );
    }

    return this.pdf.output('blob');
  }

  // Alternative method to get base64
  public generateBase64(data: RateConfirmationData): string {
    this.generate(data); // Build the PDF
    return this.pdf.output('datauristring');
  }

  // Method to save directly
  public save(data: RateConfirmationData, filename?: string): void {
    this.generate(data); // Build the PDF
    const fname = filename || `rate-confirmation-${data.load.reference_number || Date.now()}.pdf`;
    this.pdf.save(fname);
  }
}