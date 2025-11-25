// =====================================================
// INNGEST FUNCTION: Process Approval
// Triggers extraction after call is approved
// =====================================================

import { inngest } from '../client';

export const processApproval = inngest.createFunction(
  {
    id: 'process-approval',
    name: 'Process Call Approval',
    retries: 2,
  },
  { event: 'call/approved' },
  async ({ event, step }) => {
    const { callId, userId, transcriptId, autoApproved } = event.data;

    console.log(`[Inngest] Processing approval for call: ${callId} (auto: ${autoApproved})`);

    // Trigger extraction
    await step.run('trigger-extraction', async () => {
      await inngest.send({
        name: 'call/transcribed',
        data: {
          callId,
          userId,
          transcriptId,
          duration: 0, // Duration not available from approval event
        },
      });

      console.log(`[Inngest] Extraction job triggered for call ${callId}`);
    });

    return {
      success: true,
      callId,
      autoApproved,
    };
  }
);
