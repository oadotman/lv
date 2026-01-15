/**
 * Rate Confirmation PDF Generator
 * Creates professional rate confirmations for carriers
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image,
  Font,
} from '@react-pdf/renderer';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #000',
    paddingBottom: 10,
  },
  logo: {
    width: 120,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 9,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #ddd',
    paddingVertical: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2 solid #000',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
  },
  importantBox: {
    border: '1 solid #000',
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#fffef0',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    color: '#666',
    borderTop: '1 solid #ddd',
    paddingTop: 10,
  },
  signature: {
    marginTop: 30,
    borderTop: '1 solid #000',
    paddingTop: 5,
    width: 200,
  },
  terms: {
    marginTop: 20,
    fontSize: 8,
    color: '#666',
    lineHeight: 1.3,
  },
});

interface LoadData {
  load_number: string;
  confirmation_number?: string;
  // Shipper info
  shipper_name: string;
  shipper_contact?: string;
  shipper_phone?: string;
  shipper_email?: string;
  // Carrier info
  carrier_name: string;
  carrier_mc_number: string;
  driver_name?: string;
  driver_phone?: string;
  truck_number?: string;
  trailer_number?: string;
  // Origin
  origin_address?: string;
  origin_city: string;
  origin_state: string;
  origin_zip?: string;
  // Destination
  destination_address?: string;
  destination_city: string;
  destination_state: string;
  destination_zip?: string;
  // Dates
  pickup_date: string;
  pickup_time?: string;
  delivery_date: string;
  delivery_time?: string;
  // Commodity
  commodity: string;
  weight?: number;
  pieces?: number;
  equipment_type?: string;
  temperature?: string;
  // Financial
  carrier_rate: number;
  payment_terms?: string;
  // Instructions
  special_instructions?: string;
}

interface RateConfirmationProps {
  load: LoadData;
  organizationName?: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  logoUrl?: string;
}

// Rate Confirmation PDF Document
export const RateConfirmationDocument: React.FC<RateConfirmationProps> = ({
  load,
  organizationName = 'LoadVoice Logistics',
  organizationAddress = '123 Main St, City, ST 12345',
  organizationPhone = '(555) 123-4567',
  organizationEmail = 'dispatch@loadvoice.com',
  logoUrl,
}) => {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {logoUrl && <Image style={styles.logo} src={logoUrl} />}
          <Text style={styles.title}>RATE CONFIRMATION</Text>
          <Text style={styles.subtitle}>
            Confirmation #: {load.confirmation_number || load.load_number}
          </Text>
          <Text style={styles.subtitle}>
            Date: {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Broker Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BROKER INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{organizationName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{organizationAddress}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{organizationPhone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{organizationEmail}</Text>
          </View>
        </View>

        {/* Carrier Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CARRIER INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Carrier:</Text>
            <Text style={styles.value}>{load.carrier_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MC Number:</Text>
            <Text style={styles.value}>{load.carrier_mc_number}</Text>
          </View>
          {load.driver_name && (
            <View style={styles.row}>
              <Text style={styles.label}>Driver:</Text>
              <Text style={styles.value}>{load.driver_name}</Text>
            </View>
          )}
          {load.driver_phone && (
            <View style={styles.row}>
              <Text style={styles.label}>Driver Phone:</Text>
              <Text style={styles.value}>{load.driver_phone}</Text>
            </View>
          )}
          {load.truck_number && (
            <View style={styles.row}>
              <Text style={styles.label}>Truck #:</Text>
              <Text style={styles.value}>{load.truck_number}</Text>
            </View>
          )}
          {load.trailer_number && (
            <View style={styles.row}>
              <Text style={styles.label}>Trailer #:</Text>
              <Text style={styles.value}>{load.trailer_number}</Text>
            </View>
          )}
        </View>

        {/* Shipment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SHIPMENT DETAILS</Text>

          {/* Origin */}
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>PICKUP:</Text>
            <Text>{load.origin_address || 'Address TBD'}</Text>
            <Text>{`${load.origin_city}, ${load.origin_state} ${load.origin_zip || ''}`}</Text>
            <Text>Date: {formatDate(load.pickup_date)}</Text>
            {load.pickup_time && <Text>Time: {load.pickup_time}</Text>}
          </View>

          {/* Destination */}
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>DELIVERY:</Text>
            <Text>{load.destination_address || 'Address TBD'}</Text>
            <Text>{`${load.destination_city}, ${load.destination_state} ${load.destination_zip || ''}`}</Text>
            <Text>Date: {formatDate(load.delivery_date)}</Text>
            {load.delivery_time && <Text>Time: {load.delivery_time}</Text>}
          </View>

          {/* Commodity */}
          <View>
            <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>COMMODITY:</Text>
            <Text>{load.commodity}</Text>
            {load.weight && <Text>Weight: {load.weight.toLocaleString()} lbs</Text>}
            {load.pieces && <Text>Pieces: {load.pieces}</Text>}
            {load.equipment_type && <Text>Equipment: {load.equipment_type}</Text>}
            {load.temperature && <Text>Temperature: {load.temperature}</Text>}
          </View>
        </View>

        {/* Rate Information */}
        <View style={styles.importantBox}>
          <Text style={styles.sectionTitle}>RATE AGREEMENT</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Rate:</Text>
            <Text style={[styles.value, { fontSize: 12, fontWeight: 'bold' }]}>
              {formatCurrency(load.carrier_rate)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Terms:</Text>
            <Text style={styles.value}>{load.payment_terms || 'NET 30'}</Text>
          </View>
        </View>

        {/* Special Instructions */}
        {load.special_instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPECIAL INSTRUCTIONS</Text>
            <Text>{load.special_instructions}</Text>
          </View>
        )}

        {/* Terms and Conditions */}
        <View style={styles.terms}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>TERMS AND CONDITIONS:</Text>
          <Text>
            1. Carrier agrees to transport the above described commodity at the rate specified.
          </Text>
          <Text>
            2. Carrier must provide proof of delivery (POD) within 24 hours of delivery.
          </Text>
          <Text>
            3. Carrier maintains valid insurance and operating authority.
          </Text>
          <Text>
            4. This rate confirmation constitutes a contract for transportation services.
          </Text>
          <Text>
            5. Payment will be processed according to the terms specified above upon receipt of all required documentation.
          </Text>
        </View>

        {/* Signature Line */}
        <View style={{ marginTop: 40 }}>
          <Text style={{ marginBottom: 30 }}>
            By signing below, carrier agrees to all terms and conditions stated above:
          </Text>
          <View style={styles.signature}>
            <Text>Carrier Signature</Text>
          </View>
          <View style={[styles.signature, { marginTop: 10 }]}>
            <Text>Print Name / Date</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>LoadVoice - Rate Confirmation #{load.confirmation_number || load.load_number}</Text>
          <Text>Generated on {new Date().toLocaleString()}</Text>
        </View>
      </Page>
    </Document>
  );
};

// Helper component for generating download link
export const RateConfirmationDownloadLink: React.FC<{
  load: LoadData;
  organizationData?: Partial<RateConfirmationProps>;
  children: React.ReactNode;
}> = ({ load, organizationData = {}, children }) => {
  const fileName = `rate-confirmation-${load.load_number}.pdf`;

  return (
    <PDFDownloadLink
      document={<RateConfirmationDocument load={load} {...organizationData} />}
      fileName={fileName}
    >
      {({ loading }) => (loading ? 'Generating PDF...' : children)}
    </PDFDownloadLink>
  );
};