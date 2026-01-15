// =====================================================
// PARTNER APPLICATION EMAIL TEMPLATES
// Email templates for partner application process
// =====================================================

import React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface ApplicationEmailProps {
  recipientName: string;
  type: 'received' | 'approved' | 'rejected' | 'new_application';
  data?: {
    tempPassword?: string;
    loginUrl?: string;
    referralCode?: string;
    rejectionReason?: string;
    applicant_name?: string;
    applicant_email?: string;
    partner_type?: string;
    company?: string;
  };
}

export function PartnerApplicationEmail({
  recipientName,
  type,
  data = {},
}: ApplicationEmailProps) {
  const getSubject = () => {
    switch (type) {
      case 'received':
        return 'Loadvoice Partner Application Received';
      case 'approved':
        return 'Welcome to the Loadvoice Partner Program!';
      case 'rejected':
        return 'Loadvoice Partner Application Update';
      case 'new_application':
        return 'New Partner Application Received';
      default:
        return 'Loadvoice Partner Program';
    }
  };

  const getPreviewText = () => {
    switch (type) {
      case 'received':
        return 'Thank you for applying to the Loadvoice Partner Program';
      case 'approved':
        return 'Your application has been approved! Get started now.';
      case 'rejected':
        return 'Update on your Loadvoice Partner Program application';
      case 'new_application':
        return `New application from ${data.applicant_name}`;
      default:
        return 'Loadvoice Partner Program Update';
    }
  };

  return (
    <Html>
      <Head />
      <Preview>{getPreviewText()}</Preview>
      <Body style={main}>
        <Container style={container}>
          {type === 'received' && (
            <>
              <Heading style={h1}>Application Received!</Heading>
              <Text style={text}>Hi {recipientName},</Text>
              <Text style={text}>
                Thank you for applying to the Loadvoice Partner Program. We have received your
                application and will review it within 2 business days.
              </Text>
              <Text style={text}>
                We're looking for partners who share our passion for helping sales teams save time
                and improve their CRM data quality. Your application is important to us, and we'll
                carefully review your qualifications.
              </Text>
              <Text style={text}>
                In the meantime, feel free to explore our{' '}
                <Link href="https://loadvoice.com" style={link}>
                  website
                </Link>{' '}
                to learn more about our platform.
              </Text>
            </>
          )}

          {type === 'approved' && (
            <>
              <Heading style={h1}>Welcome to the Loadvoice Partner Program!</Heading>
              <Text style={text}>Hi {recipientName},</Text>
              <Text style={text}>
                Great news! Your application to the Loadvoice Partner Program has been approved.
              </Text>
              <Text style={text}>
                Here are your partner account details:
              </Text>
              <Section style={codeBox}>
                <Text style={codeText}>
                  <strong>Your Referral Code:</strong> {data.referralCode}
                  <br />
                  <strong>Temporary Password:</strong> {data.tempPassword}
                </Text>
              </Section>
              <Text style={text}>
                <strong>Next Steps:</strong>
              </Text>
              <Text style={text}>
                1. Log in to your partner dashboard<br />
                2. Change your temporary password<br />
                3. Set up your payment information<br />
                4. Get your unique referral link<br />
                5. Access marketing materials
              </Text>
              <Section style={buttonContainer}>
                <Button style={button} href={data.loginUrl}>
                  Log In to Partner Dashboard
                </Button>
              </Section>
              <Text style={text}>
                Your commission rate: <strong>25%</strong> of every payment, for up to 12 months
                per customer you refer.
              </Text>
              <Text style={text}>
                Questions? Reply to this email - I'm here to help you succeed!
              </Text>
            </>
          )}

          {type === 'rejected' && (
            <>
              <Heading style={h1}>Application Update</Heading>
              <Text style={text}>Hi {recipientName},</Text>
              <Text style={text}>
                Thank you for your interest in the Loadvoice Partner Program. After careful review,
                we've decided not to move forward with your application at this time.
              </Text>
              {data.rejectionReason && (
                <Text style={text}>
                  <strong>Reason:</strong> {data.rejectionReason}
                </Text>
              )}
              <Text style={text}>
                We encourage you to reapply in the future if your circumstances change. In the
                meantime, you're welcome to use Loadvoice as a customer and experience the benefits
                firsthand.
              </Text>
              <Text style={text}>
                If you have questions about this decision, please don't hesitate to reach out.
              </Text>
            </>
          )}

          {type === 'new_application' && (
            <>
              <Heading style={h1}>New Partner Application</Heading>
              <Text style={text}>Hi Admin,</Text>
              <Text style={text}>
                A new partner application has been submitted and requires review.
              </Text>
              <Section style={codeBox}>
                <Text style={codeText}>
                  <strong>Applicant:</strong> {data.applicant_name}
                  <br />
                  <strong>Email:</strong> {data.applicant_email}
                  <br />
                  <strong>Type:</strong> {data.partner_type}
                  <br />
                  {data.company && (
                    <>
                      <strong>Company:</strong> {data.company}
                      <br />
                    </>
                  )}
                </Text>
              </Section>
              <Section style={buttonContainer}>
                <Button style={button} href="https://loadvoice.com/admin/partners/applications">
                  Review Application
                </Button>
              </Section>
            </>
          )}

          <Text style={footer}>
            Best regards,
            <br />
            The Loadvoice Team
          </Text>
          <Text style={footerSmall}>
            Loadvoice - AI-Powered CRM Data Capture
            <br />
            <Link href="mailto:partners@loadvoice.com" style={link}>
              partners@loadvoice.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Email sending function
export async function sendPartnerApplicationEmail(
  to: string,
  recipientName: string,
  type: 'received' | 'approved' | 'rejected' | 'new_application',
  data?: any
) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const subject = (() => {
    switch (type) {
      case 'received':
        return 'Loadvoice Partner Application Received';
      case 'approved':
        return 'Welcome to the Loadvoice Partner Program!';
      case 'rejected':
        return 'Loadvoice Partner Application Update';
      case 'new_application':
        return 'New Partner Application Received';
      default:
        return 'Loadvoice Partner Program';
    }
  })();

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: 'Loadvoice Partners <partners@loadvoice.com>',
      to: [to],
      subject,
      react: PartnerApplicationEmail({ recipientName, type, data }),
    });

    if (error) {
      console.error('Failed to send partner application email:', error);
      throw error;
    }

    return emailData;
  } catch (error) {
    console.error('Error sending partner application email:', error);
    throw error;
  }
}

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  padding: '0',
  margin: '30px 0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
};

const buttonContainer = {
  margin: '32px 0',
};

const codeBox = {
  background: '#f4f4f5',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const codeText = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#333',
  margin: '0',
};

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  marginTop: '32px',
};

const footerSmall = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '20px',
  marginTop: '16px',
};

export default PartnerApplicationEmail;