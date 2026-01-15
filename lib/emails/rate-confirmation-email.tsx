import React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from '@react-email/components';

interface RateConfirmationEmailProps {
  carrierName: string;
  dispatcherName?: string;
  loadNumber: string;
  rateConNumber: string;
  pickupLocation: {
    city: string;
    state: string;
    date: string;
  };
  deliveryLocation: {
    city: string;
    state: string;
    date: string;
  };
  equipment: string;
  commodity: string;
  rate: number;
  pdfUrl: string;
  brokerName: string;
  brokerPhone?: string;
  brokerEmail?: string;
  acceptanceUrl?: string;
  trackingUrl?: string;
}

export function RateConfirmationEmail({
  carrierName,
  dispatcherName,
  loadNumber,
  rateConNumber,
  pickupLocation,
  deliveryLocation,
  equipment,
  commodity,
  rate,
  pdfUrl,
  brokerName,
  brokerPhone,
  brokerEmail,
  acceptanceUrl,
  trackingUrl,
}: RateConfirmationEmailProps) {
  const previewText = `Rate Confirmation ${rateConNumber} - ${pickupLocation.city}, ${pickupLocation.state} to ${deliveryLocation.city}, ${deliveryLocation.state}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>{brokerName}</Heading>
            <Text style={tagline}>Rate Confirmation</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h2}>
              Rate Confirmation #{rateConNumber}
            </Heading>

            <Text style={paragraph}>
              Dear {dispatcherName || carrierName},
            </Text>

            <Text style={paragraph}>
              Please find attached the rate confirmation for the following load. Review the details carefully and confirm acceptance by signing the attached PDF.
            </Text>

            {/* Load Details Box */}
            <Section style={loadDetailsBox}>
              <Heading style={h3}>Load Details</Heading>

              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Load Number:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={value}>{loadNumber}</Text>
                </Column>
              </Row>

              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Equipment:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={value}>{equipment}</Text>
                </Column>
              </Row>

              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Commodity:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={value}>{commodity}</Text>
                </Column>
              </Row>

              <Hr style={divider} />

              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Pickup:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={value}>
                    {pickupLocation.city}, {pickupLocation.state}
                  </Text>
                  <Text style={subValue}>
                    {pickupLocation.date}
                  </Text>
                </Column>
              </Row>

              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Delivery:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={value}>
                    {deliveryLocation.city}, {deliveryLocation.state}
                  </Text>
                  <Text style={subValue}>
                    {deliveryLocation.date}
                  </Text>
                </Column>
              </Row>

              <Hr style={divider} />

              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>Total Rate:</Text>
                </Column>
                <Column style={valueColumn}>
                  <Text style={rateValue}>
                    ${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Action Buttons */}
            <Section style={buttonContainer}>
              <Button
                href={pdfUrl}
                style={primaryButton}
              >
                Download Rate Confirmation PDF
              </Button>
            </Section>

            {acceptanceUrl && (
              <Section style={buttonContainer}>
                <Button
                  href={acceptanceUrl}
                  style={secondaryButton}
                >
                  Accept & Sign Online
                </Button>
              </Section>
            )}

            {trackingUrl && (
              <Text style={paragraph}>
                You can track the status of this rate confirmation at any time by visiting:{' '}
                <Link href={trackingUrl} style={link}>
                  View Status
                </Link>
              </Text>
            )}

            {/* Important Notes */}
            <Section style={notesBox}>
              <Heading style={h4}>Important Information</Heading>
              <Text style={noteText}>
                • Please review all details carefully before accepting
              </Text>
              <Text style={noteText}>
                • Driver must have a copy of the signed rate confirmation
              </Text>
              <Text style={noteText}>
                • Detention and layover rates apply as specified in the rate confirmation
              </Text>
              <Text style={noteText}>
                • Payment terms: Net 30 days from receipt of signed BOL and POD
              </Text>
            </Section>

            {/* Contact Information */}
            <Text style={paragraph}>
              If you have any questions or need to make changes, please contact us immediately:
            </Text>

            <Section style={contactBox}>
              {brokerPhone && (
                <Text style={contactInfo}>
                  📞 Phone: {brokerPhone}
                </Text>
              )}
              {brokerEmail && (
                <Text style={contactInfo}>
                  ✉️ Email: <Link href={`mailto:${brokerEmail}`} style={link}>{brokerEmail}</Link>
                </Text>
              )}
            </Section>

            {/* Footer */}
            <Hr style={footerDivider} />
            <Text style={footer}>
              This rate confirmation is subject to the terms and conditions of the broker-carrier agreement.
              By accepting this load, you agree to all terms specified in the attached rate confirmation document.
            </Text>

            <Text style={footer}>
              © {new Date().getFullYear()} {brokerName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 48px',
  backgroundColor: '#3b82f6',
  color: '#ffffff',
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 8px',
};

const tagline = {
  color: '#e0e7ff',
  fontSize: '14px',
  margin: '0',
};

const content = {
  padding: '0 48px',
};

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '32px 0 16px',
};

const h3 = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const h4 = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '20px',
  margin: '0 0 12px',
};

const paragraph = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
};

const loadDetailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const detailRow = {
  marginBottom: '12px',
};

const labelColumn = {
  width: '140px',
  paddingRight: '16px',
};

const valueColumn = {
  width: 'auto',
};

const label = {
  color: '#6b7280',
  fontSize: '13px',
  fontWeight: '500',
  margin: '0',
};

const value = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
};

const subValue = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '2px 0 0',
};

const rateValue = {
  color: '#059669',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0',
};

const divider = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
};

const buttonContainer = {
  margin: '24px 0',
  textAlign: 'center' as const,
};

const primaryButton = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const secondaryButton = {
  backgroundColor: '#10b981',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const notesBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const noteText = {
  color: '#78350f',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '4px 0',
};

const contactBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
};

const contactInfo = {
  color: '#4b5563',
  fontSize: '13px',
  margin: '4px 0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

const footerDivider = {
  borderColor: '#e5e7eb',
  margin: '32px 0 16px',
};

const footer = {
  color: '#9ca3af',
  fontSize: '11px',
  lineHeight: '16px',
  margin: '8px 0',
  textAlign: 'center' as const,
};

export default RateConfirmationEmail;