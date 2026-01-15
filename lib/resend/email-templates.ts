// =====================================================
// EMAIL TEMPLATES (SIMPLE HTML GENERATION)
// No dependencies on React rendering or jsdom
// =====================================================

export interface TeamInvitationEmailProps {
  inviterName: string;
  organizationName: string;
  role: string;
  inviteLink: string;
  expiresAt: string;
}

// Base email styles
export const emailStyles = `
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
  ul, ol {
    padding-left: 20px;
  }
  li {
    margin-bottom: 8px;
  }
  a {
    color: #667eea;
    text-decoration: none;
  }
`;

// =====================================================
// TEAM INVITATION EMAIL
// =====================================================

export function renderTeamInvitationEmail(props: TeamInvitationEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="You're invited to join ${props.organizationName} on LoadVoice" />
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <h1>You're Invited! 🎉</h1>
      </div>
      <div class="content">
        <p>Hi there,</p>

        <p>
          <span class="highlight">${props.inviterName}</span> has invited you to join
          <span class="highlight">${props.organizationName}</span> on LoadVoice as a
          <span class="highlight">${props.role}</span>.
        </p>

        <p>
          LoadVoice helps sales teams automatically transcribe calls and extract CRM data using AI.
          With your team, you'll be able to:
        </p>

        <ul>
          <li>Share transcription minutes with your team</li>
          <li>Collaborate on call analysis</li>
          <li>Access shared templates and insights</li>
        </ul>

        <a href="${props.inviteLink}" class="button">
          Accept Invitation
        </a>

        <p style="font-size: 14px; color: #6b7280;">
          Or copy and paste this link into your browser:
        </p>
        <div class="code-block">${props.inviteLink}</div>

        <div class="footer">
          <p><strong>This invitation expires on ${props.expiresAt}.</strong></p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          <p>
            Questions? Reply to this email or visit
            <a href="https://loadvoice.com/help">our help center</a>.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getTeamInvitationText(props: TeamInvitationEmailProps): string {
  return `
You're Invited to Join ${props.organizationName}!

Hi there,

${props.inviterName} has invited you to join ${props.organizationName} on LoadVoice as a ${props.role}.

LoadVoice helps sales teams automatically transcribe calls and extract CRM data using AI.

Accept your invitation by clicking this link:
${props.inviteLink}

This invitation expires on ${props.expiresAt}.

If you didn't expect this invitation, you can safely ignore this email.

---
LoadVoice
https://loadvoice.com
  `.trim();
}

// =====================================================
// WELCOME EMAIL
// =====================================================

export interface WelcomeEmailProps {
  userName: string;
  organizationName: string;
  dashboardLink: string;
}

export function renderWelcomeEmail(props: WelcomeEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Welcome to LoadVoice! Let's get started." />
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <h1>Welcome to LoadVoice! 👋</h1>
      </div>
      <div class="content">
        <p>Hi ${props.userName},</p>

        <p>
          Thanks for signing up! We're excited to help you and ${props.organizationName} automate
          your CRM data entry and save hours every week.
        </p>

        <h2 style="font-size: 18px; margin-top: 30px;">Getting Started</h2>

        <p>Here's what you can do right now:</p>

        <ol>
          <li><strong>Upload your first call:</strong> Drag and drop an audio file to get started</li>
          <li><strong>Review the transcript:</strong> Our AI transcribes with speaker diarization</li>
          <li><strong>Copy CRM data:</strong> Get formatted outputs for any CRM system</li>
        </ol>

        <a href="${props.dashboardLink}" class="button">
          Go to Dashboard
        </a>

        <div class="footer">
          <p><strong>Need help?</strong></p>
          <p>
            Check out our <a href="https://loadvoice.com/help">help center</a> or reply to this email anytime.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// =====================================================
// PASSWORD RESET EMAIL
// =====================================================

export interface PasswordResetEmailProps {
  userName?: string;
  resetLink: string;
  expiresAt: string;
}

export function renderPasswordResetEmail(props: PasswordResetEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Reset your LoadVoice password" />
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <h1>Reset Your Password</h1>
      </div>
      <div class="content">
        <p>Hi${props.userName ? ` ${props.userName}` : ''},</p>

        <p>
          We received a request to reset your password for your LoadVoice account.
        </p>

        <a href="${props.resetLink}" class="button">
          Reset Password
        </a>

        <p style="font-size: 14px; color: #6b7280;">
          Or copy and paste this link into your browser:
        </p>
        <div class="code-block">${props.resetLink}</div>

        <div class="footer">
          <p><strong>This link expires on ${props.expiresAt}.</strong></p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>Your password won't change until you create a new one via the link above.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// =====================================================
// MEMBER REMOVED EMAIL
// =====================================================

export interface MemberRemovedEmailProps {
  userName: string;
  organizationName: string;
  removedBy: string;
}

export function renderMemberRemovedEmail(props: MemberRemovedEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="You've been removed from ${props.organizationName}" />
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="email-card">
      <div class="header">
        <h1>Team Membership Update</h1>
      </div>
      <div class="content">
        <p>Hi ${props.userName},</p>

        <p>
          ${props.removedBy} has removed you from the <strong>${props.organizationName}</strong> team
          on LoadVoice.
        </p>

        <p>
          You no longer have access to this organization's calls, templates, and data.
        </p>

        <p>
          If you believe this was a mistake, please contact your team administrator.
        </p>

        <div class="footer">
          <p>
            Questions? Visit <a href="https://loadvoice.com/help">our help center</a> or reply to this email.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
