import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { LoadDataComplete, OrganizationData, formatDate, formatTime, formatCurrency } from './generator';

// Register fonts for better typography
Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2',
      fontWeight: 700,
    },
  ],
});

// Define comprehensive styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Inter',
    color: '#1a1a1a',
  },

  // Header styles
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  logoSection: {
    flex: 1,
  },
  logo: {
    width: 120,
    height: 50,
    objectFit: 'contain',
  },
  brokerInfo: {
    flex: 2,
    alignItems: 'flex-end',
  },
  brokerName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 2,
  },
  brokerDetail: {
    fontSize: 9,
    color: '#666',
    marginBottom: 1,
  },

  // Title section
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderTop: '2pt solid #000',
    borderBottom: '2pt solid #000',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 5,
  },
  rateConNumber: {
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 2,
  },
  date: {
    fontSize: 10,
    color: '#666',
  },

  // Section styles
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#f3f4f6',
    borderLeft: '3pt solid #3b82f6',
  },

  // Content rows
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 100,
    fontWeight: 600,
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 9,
  },

  // Two column layout
  twoColumns: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
  },

  // Location box style
  locationBox: {
    border: '1pt solid #d1d5db',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  locationTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 6,
    color: '#1f2937',
  },
  locationDetail: {
    fontSize: 9,
    marginBottom: 2,
    color: '#4b5563',
  },

  // Rate section
  rateSection: {
    backgroundColor: '#f9fafb',
    border: '1pt solid #e5e7eb',
    borderRadius: 4,
    padding: 10,
    marginTop: 10,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rateLabel: {
    fontSize: 10,
    fontWeight: 600,
  },
  rateValue: {
    fontSize: 10,
    fontWeight: 600,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTop: '1pt solid #9ca3af',
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#059669',
  },

  // Terms section
  termsSection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fef3c7',
    border: '1pt solid #fbbf24',
    borderRadius: 4,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 6,
  },
  termsText: {
    fontSize: 8,
    lineHeight: 1.4,
    color: '#78350f',
  },

  // Signature section
  signatureSection: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: '1pt solid #d1d5db',
  },
  signatureTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 15,
  },
  signatureGrid: {
    flexDirection: 'row',
    gap: 30,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 8,
    marginBottom: 20,
    color: '#6b7280',
  },
  signatureLine: {
    borderBottom: '1pt solid #9ca3af',
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 8,
    color: '#6b7280',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#9ca3af',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  pageNumber: {
    fontSize: 8,
    color: '#9ca3af',
  },

  // Address styles
  addressSection: {
    marginBottom: 10,
  },
  addressText: {
    fontSize: 9,
    marginBottom: 2,
    color: '#4b5563',
  },

  // Contact styles
  contactInfo: {
    marginTop: 5,
  },
  contactText: {
    fontSize: 9,
    marginBottom: 2,
  },

  // Rate styles
  rateAmount: {
    fontSize: 11,
    fontWeight: 700,
    color: '#059669',
  },
  rateBox: {
    backgroundColor: '#f9fafb',
    border: '1pt solid #e5e7eb',
    borderRadius: 4,
    padding: 10,
  },

  // Terms section title
  termsSectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
  },

  // Utility styles
  bold: {
    fontWeight: 700,
  },
  highlight: {
    backgroundColor: '#fef3c7',
    padding: 2,
  },
  error: {
    color: '#dc2626',
  },
  success: {
    color: '#059669',
  },
});

interface RateConfirmationPDFProps {
  load: LoadDataComplete;
  organization: OrganizationData;
  rateConNumber: string;
}

export const RateConfirmationPDF: React.FC<RateConfirmationPDFProps> = ({
  load,
  organization,
  rateConNumber,
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });


  // Use organization's default payment terms or load-specific terms
  const paymentTerms = load.payment_terms || organization.default_payment_terms || 'Net 30';

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header with Logo and Broker Info */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoSection}>
              {organization.logo_url ? (
                <Image src={organization.logo_url} style={styles.logo} />
              ) : (
                <Text style={styles.brokerName}>{organization.name}</Text>
              )}
            </View>
            <View style={styles.brokerInfo}>
              <Text style={styles.brokerName}>{organization.name}</Text>
              {organization.company_address && (
                <Text style={styles.brokerDetail}>{organization.company_address}</Text>
              )}
              {(organization.company_city || organization.company_state || organization.company_zip) && (
                <Text style={styles.brokerDetail}>
                  {organization.company_city}, {organization.company_state} {organization.company_zip}
                </Text>
              )}
              {organization.mc_number && (
                <Text style={styles.brokerDetail}>MC# {organization.mc_number}</Text>
              )}
              {organization.dot_number && (
                <Text style={styles.brokerDetail}>DOT# {organization.dot_number}</Text>
              )}
              {organization.billing_email && (
                <Text style={styles.brokerDetail}>{organization.billing_email}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>RATE CONFIRMATION</Text>
          <Text style={styles.rateConNumber}>RC# {rateConNumber}</Text>
          <Text style={styles.date}>Date: {currentDate}</Text>
        </View>

        {/* Carrier Information */}
        {load.carrier && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CARRIER INFORMATION</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{load.carrier.carrier_name}</Text>
            </View>
            {load.carrier.mc_number && (
              <View style={styles.row}>
                <Text style={styles.label}>MC#:</Text>
                <Text style={styles.value}>{load.carrier.mc_number}</Text>
              </View>
            )}
            {load.carrier.dot_number && (
              <View style={styles.row}>
                <Text style={styles.label}>DOT#:</Text>
                <Text style={styles.value}>{load.carrier.dot_number}</Text>
              </View>
            )}
            {load.carrier.primary_contact && (
              <View style={styles.row}>
                <Text style={styles.label}>Contact:</Text>
                <Text style={styles.value}>{load.carrier.primary_contact}</Text>
              </View>
            )}
            {load.carrier.dispatch_phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{load.carrier.dispatch_phone}</Text>
              </View>
            )}
            {load.carrier.dispatch_email && (
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{load.carrier.dispatch_email}</Text>
              </View>
            )}
          </View>
        )}

        {/* Load Details in Two Columns */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOAD DETAILS</Text>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <View style={styles.locationBox}>
                <Text style={styles.locationTitle}>PICKUP</Text>
                {load.origin_address && (
                  <Text style={styles.locationDetail}>{load.origin_address}</Text>
                )}
                <Text style={styles.locationDetail}>
                  {load.origin_city}, {load.origin_state} {load.origin_zip}
                </Text>
                <Text style={styles.locationDetail}>
                  Date: {formatDate(load.pickup_date)}
                </Text>
                <Text style={styles.locationDetail}>
                  Time: {load.pickup_window_start && load.pickup_window_end
                    ? `${formatTime(load.pickup_window_start)} - ${formatTime(load.pickup_window_end)}`
                    : 'By appointment'}
                </Text>
              </View>
            </View>
            <View style={styles.column}>
              <View style={styles.locationBox}>
                <Text style={styles.locationTitle}>DELIVERY</Text>
                {load.destination_address && (
                  <Text style={styles.locationDetail}>{load.destination_address}</Text>
                )}
                <Text style={styles.locationDetail}>
                  {load.destination_city}, {load.destination_state} {load.destination_zip}
                </Text>
                <Text style={styles.locationDetail}>
                  Date: {formatDate(load.delivery_date)}
                </Text>
                <Text style={styles.locationDetail}>
                  Time: {load.delivery_window_start && load.delivery_window_end
                    ? `${formatTime(load.delivery_window_start)} - ${formatTime(load.delivery_window_end)}`
                    : 'By appointment'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shipment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SHIPMENT</Text>
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <View style={styles.row}>
                <Text style={styles.label}>Equipment:</Text>
                <Text style={styles.value}>{load.equipment_type || 'Dry Van'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Commodity:</Text>
                <Text style={styles.value}>{load.commodity}</Text>
              </View>
            </View>
            <View style={styles.column}>
              {load.weight_lbs && (
                <View style={styles.row}>
                  <Text style={styles.label}>Weight:</Text>
                  <Text style={styles.value}>{load.weight_lbs.toLocaleString()} lbs</Text>
                </View>
              )}
              {load.reference_number && (
                <View style={styles.row}>
                  <Text style={styles.label}>Reference#:</Text>
                  <Text style={styles.value}>{load.reference_number}</Text>
                </View>
              )}
              {load.po_number && (
                <View style={styles.row}>
                  <Text style={styles.label}>PO#:</Text>
                  <Text style={styles.value}>{load.po_number}</Text>
                </View>
              )}
            </View>
          </View>
          {load.notes && (
            <View style={[styles.row, { marginTop: 5 }]}>
              <Text style={styles.label}>Notes:</Text>
              <Text style={styles.value}>{load.notes}</Text>
            </View>
          )}
        </View>

        {/* Rate Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RATE</Text>
          <View style={styles.rateSection}>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Line Haul Rate:</Text>
              <Text style={styles.rateValue}>{formatCurrency(load.carrier_rate)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValue}>{formatCurrency(load.carrier_rate)}</Text>
            </View>
            <View style={[styles.rateRow, { marginTop: 8 }]}>
              <Text style={styles.label}>Payment Terms:</Text>
              <Text style={styles.value}>{paymentTerms}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        {organization.rate_con_terms && (
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>TERMS AND CONDITIONS</Text>
            <Text style={styles.termsText}>{organization.rate_con_terms}</Text>
          </View>
        )}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureTitle}>ACCEPTANCE</Text>
          <View style={styles.signatureGrid}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Carrier Signature:</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureText}>Signature</Text>

              <Text style={[styles.signatureLabel, { marginTop: 15 }]}>Printed Name:</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureText}>Name</Text>

              <Text style={[styles.signatureLabel, { marginTop: 15 }]}>Date:</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureText}>Date</Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={[styles.signatureLabel, { textAlign: 'center', marginBottom: 10 }]}>
                By signing, carrier agrees to all terms above.
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated on {currentDate}</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
};

export default RateConfirmationPDF;

// Export a function that returns the Document element directly for server-side rendering
export const createRateConfirmationPDFDocument = (props: RateConfirmationPDFProps) => {
  const { load, organization, rateConNumber } = props;
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoSection}>
              {organization.logo_url && (
                <Image style={styles.logo} src={organization.logo_url} />
              )}
              {!organization.logo_url && (
                <Text style={styles.brokerName}>{organization.name}</Text>
              )}
            </View>
            <View style={styles.brokerInfo}>
              <Text style={styles.mainTitle}>RATE CONFIRMATION</Text>
              <Text style={styles.rateConNumber}>Confirmation #: {rateConNumber}</Text>
              <Text style={styles.date}>Date: {currentDate}</Text>
            </View>
          </View>
        </View>

        {/* Broker Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BROKER INFORMATION</Text>
          <View>
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{organization.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>MC Number:</Text>
              <Text style={styles.value}>{organization.mc_number || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DOT Number:</Text>
              <Text style={styles.value}>{organization.dot_number || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{organization.billing_email || 'N/A'}</Text>
            </View>
            {organization.company_address && (
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>
                  {organization.company_address}
                  {organization.company_city && `, ${organization.company_city}`}
                  {organization.company_state && `, ${organization.company_state}`}
                  {organization.company_zip && ` ${organization.company_zip}`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Carrier Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CARRIER INFORMATION</Text>
          <View>
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{load.carrier?.carrier_name || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>MC Number:</Text>
              <Text style={styles.value}>{load.carrier?.mc_number || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DOT Number:</Text>
              <Text style={styles.value}>{load.carrier?.dot_number || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{load.carrier?.primary_contact || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{load.carrier?.dispatch_phone || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{load.carrier?.dispatch_email || 'N/A'}</Text>
            </View>
            {load.carrier?.address && (
              <View style={styles.row}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{load.carrier.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Load Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOAD INFORMATION</Text>
          <View>
            <View style={styles.row}>
              <Text style={styles.label}>Load Number:</Text>
              <Text style={styles.value}>{load.load_number}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Equipment Type:</Text>
              <Text style={styles.value}>{load.equipment_type || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Commodity:</Text>
              <Text style={styles.value}>{load.commodity || 'General Freight'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Weight:</Text>
              <Text style={styles.value}>{load.weight_lbs ? `${load.weight_lbs} lbs` : 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pallets:</Text>
              <Text style={styles.value}>{load.pallet_count || 'N/A'}</Text>
            </View>
          </View>
          {load.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>Special Instructions:</Text>
              <Text style={styles.value}>{load.notes}</Text>
            </View>
          )}
        </View>

        {/* Pickup Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PICKUP INFORMATION</Text>
          <View style={styles.locationBox}>
            <View>
              <View style={styles.row}>
                <Text style={styles.label}>Date:</Text>
                <Text style={styles.value}>{formatDate(load.pickup_date)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Time:</Text>
                <Text style={styles.value}>
                  {load.pickup_window_start && load.pickup_window_end
                    ? `${formatTime(load.pickup_window_start)} - ${formatTime(load.pickup_window_end)}`
                    : 'By appointment'}
                </Text>
              </View>
            </View>
            <View style={styles.addressSection}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{load.shipper?.shipper_name || 'N/A'}</Text>
              <Text style={styles.addressText}>
                {load.origin_address || ''}
                {load.origin_city && load.origin_state && load.origin_zip
                  ? `\n${load.origin_city}, ${load.origin_state} ${load.origin_zip}`
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DELIVERY INFORMATION</Text>
          <View style={styles.locationBox}>
            <View>
              <View style={styles.row}>
                <Text style={styles.label}>Date:</Text>
                <Text style={styles.value}>{formatDate(load.delivery_date)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Time:</Text>
                <Text style={styles.value}>
                  {load.delivery_window_start && load.delivery_window_end
                    ? `${formatTime(load.delivery_window_start)} - ${formatTime(load.delivery_window_end)}`
                    : 'By appointment'}
                </Text>
              </View>
            </View>
            <View style={styles.addressSection}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{load.destination_city || 'N/A'}</Text>
              <Text style={styles.addressText}>
                {load.destination_address || ''}
                {load.destination_city && load.destination_state && load.destination_zip
                  ? `\n${load.destination_city}, ${load.destination_state} ${load.destination_zip}`
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Rate Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RATE AGREEMENT</Text>
          <View style={styles.rateBox}>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Line Haul Rate:</Text>
              <Text style={styles.rateAmount}>{formatCurrency(load.carrier_rate || 0)}</Text>
            </View>
            <View style={[styles.rateRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL CARRIER PAY:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(load.carrier_rate || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsSectionTitle}>TERMS & CONDITIONS</Text>
          <Text style={styles.termsText}>
            1. Carrier agrees to transport the shipment described above in accordance with the terms and conditions of this rate confirmation.
          </Text>
          <Text style={styles.termsText}>
            2. Payment terms: Net {organization.default_payment_terms || '30'} days upon receipt of signed BOL, POD, and clear invoice.
          </Text>
          <Text style={styles.termsText}>
            3. Carrier must maintain minimum cargo insurance of $100,000 and liability insurance of $1,000,000.
          </Text>
          <Text style={styles.termsText}>
            4. This rate confirmation supersedes all previous quotes and constitutes the entire agreement between parties.
          </Text>
          <Text style={styles.termsText}>
            5. Carrier agrees not to re-broker this load without written consent from the broker.
          </Text>
          <Text style={styles.termsText}>
            6. Any detention, layover, or additional charges must be pre-approved by the broker.
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureGrid}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Carrier Signature & Date</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Broker Representative & Date</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing above, carrier agrees to the terms and conditions stated in this rate confirmation.
          </Text>
          <Text style={styles.pageNumber}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
};