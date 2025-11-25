// =====================================================
// SEND TEAM INVITATION EMAIL
// Helper function to send invitation emails via Resend
// =====================================================

import { sendEmail } from './client';
import {
  renderTeamInvitationEmail,
  getTeamInvitationText,
  type TeamInvitationEmailProps
} from './email-templates';
import { AppUrls } from '../utils/urls';

interface SendInvitationParams {
  email: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteToken: string;
  expiresAt: Date;
}

export async function sendTeamInvitation(params: SendInvitationParams): Promise<string | undefined> {
  const inviteLink = AppUrls.invite(params.inviteToken);

  const emailProps: TeamInvitationEmailProps = {
    inviterName: params.inviterName,
    organizationName: params.organizationName,
    role: params.role,
    inviteLink,
    expiresAt: params.expiresAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  // Generate HTML and text versions (no React rendering, no jsdom)
  const html = renderTeamInvitationEmail(emailProps);
  const text = getTeamInvitationText(emailProps);

  // Send email
  try {
    const data = await sendEmail({
      to: params.email,
      subject: `You're invited to join ${params.organizationName} on SynQall`,
      html,
      text,
    });

    return data?.id; // Return Resend message ID
  } catch (error) {
    console.error('Failed to send team invitation:', error);
    throw new Error('Failed to send invitation email');
  }
}
