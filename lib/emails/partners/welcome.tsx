// =====================================================
// PARTNER WELCOME EMAIL TEMPLATE
// Welcome email for newly approved partners
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
  Hr,
} from '@react-email/components';

interface WelcomeEmailProps {
  partnerName: string;
  email: string;
  tempPassword: string;
  referralCode: string;
  referralLink: string;
  loginUrl: string;
  commissionRate: number;
}

export function PartnerWelcomeEmail({
  partnerName,
  email,
  tempPassword,
  referralCode,
  referralLink,
  loginUrl,
  commissionRate,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to the SynQall Partner Program - Start earning 25-30% commissions</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎉 Welcome to the SynQall Partner Program!</Heading>

          <Text style={text}>Hey {partnerName},</Text>

          <Text style={text}>
            Great news - you've been approved as a SynQall partner! You're now part of an exclusive
            group helping sales teams save 15-20 hours per week on CRM data entry.
          </Text>

          <Section style={highlightBox}>
            <Heading style={h2}>Your Partner Account Details</Heading>
            <Text style={detailText}>
              <strong>Email:</strong> {email}<br />
              <strong>Temporary Password:</strong> <code style={code}>{tempPassword}</code><br />
              <strong>Partner Code:</strong> <code style={code}>{referralCode}</code><br />
              <strong>Commission Rate:</strong> {commissionRate}% recurring
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={loginUrl}>
              Access Your Partner Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Heading style={h2}>🚀 Quick Start Guide</Heading>

          <Text style={text}>
            <strong>Step 1: Log In & Set Up</strong><br />
            Click the button above to log into your dashboard. You'll be prompted to:
          </Text>
          <ul style={list}>
            <li>Change your temporary password</li>
            <li>Add your payment information (PayPal, bank transfer, or Wise)</li>
            <li>Complete your profile</li>
          </ul>

          <Text style={text}>
            <strong>Step 2: Get Your Unique Link</strong><br />
            Your referral link is ready to use:
          </Text>
          <Section style={linkBox}>
            <Text style={linkText}>{referralLink}</Text>
          </Section>
          <Text style={smallText}>
            Anyone who clicks this link and signs up within 90 days will be attributed to you.
          </Text>

          <Text style={text}>
            <strong>Step 3: Access Marketing Resources</strong><br />
            In your dashboard, you'll find:
          </Text>
          <ul style={list}>
            <li>Email templates ready to send</li>
            <li>Social media posts</li>
            <li>Product demo videos</li>
            <li>One-pagers and sales materials</li>
          </ul>

          <Text style={text}>
            <strong>Step 4: Start Earning</strong><br />
            You'll earn {commissionRate}% commission on every payment for up to 12 months per customer.
            Track everything in real-time from your dashboard.
          </Text>

          <Hr style={hr} />

          <Heading style={h2}>💰 Commission Structure</Heading>

          <Section style={commissionBox}>
            <Text style={commissionText}>
              <strong>Standard Tier (You start here):</strong><br />
              • 25% recurring commission<br />
              • Up to 12 months per customer<br />
              • Monthly payouts (minimum $100)<br />
              <br />
              <strong>Premium Tier (10+ active referrals):</strong><br />
              • 30% recurring commission<br />
              • Priority support<br />
              • Custom marketing materials
            </Text>
          </Section>

          <Text style={text}>
            <strong>Example:</strong> Just 10 customers on our Pro plan ($149/month) = $372.50/month
            in recurring commissions. That's $4,470/year!
          </Text>

          <Hr style={hr} />

          <Heading style={h2}>📚 Important Information</Heading>

          <Text style={text}>
            <strong>Cookie Duration:</strong> 90 days - plenty of time for prospects to make a decision<br />
            <strong>Commission Hold:</strong> 30 days - protects against refunds<br />
            <strong>Payout Schedule:</strong> Monthly on the 15th<br />
            <strong>Minimum Payout:</strong> $100 (carries over if below)
          </Text>

          <Hr style={hr} />

          <Text style={text}>
            <strong>Need Help?</strong><br />
            I'm Tommy, your partner manager. Have questions? Just reply to this email or reach out at{' '}
            <Link href="mailto:partners@synqall.com" style={link}>
              partners@synqall.com
            </Link>
          </Text>

          <Text style={text}>
            Ready to start earning? Log in now and let's make this partnership successful together!
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={loginUrl}>
              Get Started Now →
            </Button>
          </Section>

          <Text style={footer}>
            Best regards,<br />
            Tommy Adeliyi<br />
            Partner Success Manager<br />
            SynQall
          </Text>

          <Hr style={hr} />

          <Text style={footerSmall}>
            SynQall Partner Program • Earn 25-30% Recurring Commissions<br />
            <Link href="https://synqall.com/partners" style={link}>
              synqall.com/partners
            </Link>{' '}
            •{' '}
            <Link href="mailto:partners@synqall.com" style={link}>
              partners@synqall.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
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
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '30px 0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
};

const text = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const detailText = {
  color: '#404040',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const smallText = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 28px',
};

const buttonContainer = {
  margin: '32px 0',
  textAlign: 'center' as const,
};

const highlightBox = {
  background: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e1e8ed',
  padding: '20px',
  margin: '24px 0',
};

const linkBox = {
  background: '#eff6ff',
  borderRadius: '6px',
  border: '1px solid #3b82f6',
  padding: '12px 16px',
  margin: '12px 0',
};

const linkText = {
  color: '#2563eb',
  fontSize: '14px',
  fontWeight: 'bold',
  wordBreak: 'break-all' as const,
  margin: '0',
};

const commissionBox = {
  background: '#f0fdf4',
  borderRadius: '8px',
  border: '1px solid #86efac',
  padding: '16px',
  margin: '16px 0',
};

const commissionText = {
  color: '#166534',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const code = {
  backgroundColor: '#f3f4f6',
  borderRadius: '4px',
  color: '#1f2937',
  fontFamily: 'monospace',
  fontSize: '14px',
  padding: '2px 6px',
};

const list = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '8px 0 16px 20px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '24px',
  marginTop: '32px',
};

const footerSmall = {
  color: '#999999',
  fontSize: '12px',
  lineHeight: '20px',
  marginTop: '16px',
  textAlign: 'center' as const,
};

export default PartnerWelcomeEmail;