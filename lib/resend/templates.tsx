// =====================================================
// EMAIL TEMPLATES
// React components for transactional emails
// =====================================================

import * as React from 'react';

// Base email layout component
interface EmailLayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

const EmailLayout: React.FC<EmailLayoutProps> = ({ children, previewText }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {previewText && (
        <meta name="description" content={previewText} />
      )}
      <style>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f6f9fc;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .email-card {
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 30px;
          color: #333333;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white !important;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
        .button:hover {
          background: #5568d3;
        }
        .footer {
          color: #6b7280;
          font-size: 14px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        .code-block {
          background: #f3f4f6;
          padding: 12px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          word-break: break-all;
          margin: 10px 0;
        }
        .highlight {
          color: #667eea;
          font-weight: 600;
        }
      `}</style>
    </head>
    <body>
      <div className="container">
        <div className="email-card">
          {children}
        </div>
      </div>
    </body>
  </html>
);

// =====================================================
// TEAM INVITATION EMAIL
// =====================================================

export interface TeamInvitationEmailProps {
  inviterName: string;
  organizationName: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}

export const TeamInvitationEmail: React.FC<TeamInvitationEmailProps> = ({
  inviterName,
  organizationName,
  role,
  inviteLink,
  expiresAt,
}) => (
  <EmailLayout previewText={`You're invited to join ${organizationName} on CallSync AI`}>
    <div className="header">
      <h1>You're Invited! 🎉</h1>
    </div>
    <div className="content">
      <p>Hi there,</p>

      <p>
        <span className="highlight">{inviterName}</span> has invited you to join{' '}
        <span className="highlight">{organizationName}</span> on CallSync AI as a{' '}
        <span className="highlight">{role}</span>.
      </p>

      <p>
        CallSync AI helps sales teams automatically transcribe calls and extract CRM data using AI.
        With your team, you'll be able to:
      </p>

      <ul>
        <li>Share transcription minutes with your team</li>
        <li>Collaborate on call analysis</li>
        <li>Access shared templates and insights</li>
      </ul>

      <a href={inviteLink} className="button">
        Accept Invitation
      </a>

      <p style={{ fontSize: '14px', color: '#6b7280' }}>
        Or copy and paste this link into your browser:
      </p>
      <div className="code-block">{inviteLink}</div>

      <div className="footer">
        <p><strong>This invitation expires on {expiresAt}.</strong></p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        <p>
          Questions? Reply to this email or visit{' '}
          <a href="https://datalix.eu/help" style={{ color: '#667eea' }}>
            our help center
          </a>.
        </p>
      </div>
    </div>
  </EmailLayout>
);

// Generate plain text version
export const getTeamInvitationText = (props: TeamInvitationEmailProps): string => {
  return `
You're Invited to Join ${props.organizationName}!

Hi there,

${props.inviterName} has invited you to join ${props.organizationName} on CallSync AI as a ${props.role}.

CallSync AI helps sales teams automatically transcribe calls and extract CRM data using AI.

Accept your invitation by clicking this link:
${props.inviteLink}

This invitation expires on ${props.expiresAt}.

If you didn't expect this invitation, you can safely ignore this email.

---
CallSync AI
https://datalix.eu
  `.trim();
};

// =====================================================
// WELCOME EMAIL (after signup)
// =====================================================

export interface WelcomeEmailProps {
  userName: string;
  organizationName: string;
  dashboardLink: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  userName,
  organizationName,
  dashboardLink,
}) => (
  <EmailLayout previewText="Welcome to CallSync AI! Let's get started.">
    <div className="header">
      <h1>Welcome to CallSync AI! 👋</h1>
    </div>
    <div className="content">
      <p>Hi {userName},</p>

      <p>
        Thanks for signing up! We're excited to help you and {organizationName} automate
        your CRM data entry and save hours every week.
      </p>

      <h2 style={{ fontSize: '18px', marginTop: '30px' }}>Getting Started</h2>

      <p>Here's what you can do right now:</p>

      <ol>
        <li><strong>Upload your first call:</strong> Drag and drop an audio file to get started</li>
        <li><strong>Review the transcript:</strong> Our AI transcribes with speaker diarization</li>
        <li><strong>Copy CRM data:</strong> Get formatted outputs for any CRM system</li>
      </ol>

      <a href={dashboardLink} className="button">
        Go to Dashboard
      </a>

      <div className="footer">
        <p><strong>Need help?</strong></p>
        <p>
          Check out our{' '}
          <a href="https://datalix.eu/help" style={{ color: '#667eea' }}>
            help center
          </a>{' '}
          or reply to this email anytime.
        </p>
      </div>
    </div>
  </EmailLayout>
);

// =====================================================
// PASSWORD RESET EMAIL
// =====================================================

export interface PasswordResetEmailProps {
  userName?: string;
  resetLink: string;
  expiresAt: string;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
  userName,
  resetLink,
  expiresAt,
}) => (
  <EmailLayout previewText="Reset your CallSync AI password">
    <div className="header">
      <h1>Reset Your Password</h1>
    </div>
    <div className="content">
      <p>Hi{userName ? ` ${userName}` : ''},</p>

      <p>
        We received a request to reset your password for your CallSync AI account.
      </p>

      <a href={resetLink} className="button">
        Reset Password
      </a>

      <p style={{ fontSize: '14px', color: '#6b7280' }}>
        Or copy and paste this link into your browser:
      </p>
      <div className="code-block">{resetLink}</div>

      <div className="footer">
        <p><strong>This link expires on {expiresAt}.</strong></p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>Your password won't change until you create a new one via the link above.</p>
      </div>
    </div>
  </EmailLayout>
);

// =====================================================
// MEMBER REMOVED EMAIL
// =====================================================

export interface MemberRemovedEmailProps {
  userName: string;
  organizationName: string;
  removedBy: string;
}

export const MemberRemovedEmail: React.FC<MemberRemovedEmailProps> = ({
  userName,
  organizationName,
  removedBy,
}) => (
  <EmailLayout previewText={`You've been removed from ${organizationName}`}>
    <div className="header">
      <h1>Team Membership Update</h1>
    </div>
    <div className="content">
      <p>Hi {userName},</p>

      <p>
        {removedBy} has removed you from the <strong>{organizationName}</strong> team
        on CallSync AI.
      </p>

      <p>
        You no longer have access to this organization's calls, templates, and data.
      </p>

      <p>
        If you believe this was a mistake, please contact your team administrator.
      </p>

      <div className="footer">
        <p>
          Questions? Visit{' '}
          <a href="https://datalix.eu/help" style={{ color: '#667eea' }}>
            our help center
          </a>{' '}
          or reply to this email.
        </p>
      </div>
    </div>
  </EmailLayout>
);
