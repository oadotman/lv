/**
 * GDPR Data Deletion Service
 *
 * Handles "Right to be Forgotten" requests in compliance with GDPR Article 17
 * Includes 30-day grace period before permanent deletion
 */

import { createAdminClient } from '../supabase/server';
import { DataDeletionRequest } from './types';

const GRACE_PERIOD_DAYS = 30;

/**
 * Request account and data deletion
 * Implements 30-day grace period before permanent deletion
 */
export async function requestDataDeletion(
  userId: string,
  reason?: string
): Promise<{ requestId: string; scheduledFor: string }> {
  const supabase = createAdminClient();

  const scheduledFor = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // Create deletion request record
  const { data: deletionRequest, error } = await supabase
    .from('data_deletion_requests')
    .insert({
      user_id: userId,
      status: 'pending',
      requested_at: new Date().toISOString(),
      scheduled_for: scheduledFor.toISOString(),
      reason,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create deletion request: ${error.message}`);
  }

  // Immediately disable user account (soft delete)
  await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      deletion_requested: true,
      deletion_scheduled_for: scheduledFor.toISOString(),
    },
  });

  // Log the deletion request for audit trail
  await logAuditEvent(userId, 'data_deletion_requested', 'user', userId);

  return {
    requestId: deletionRequest.id,
    scheduledFor: scheduledFor.toISOString(),
  };
}

/**
 * Cancel a pending deletion request (within grace period)
 */
export async function cancelDataDeletion(requestId: string): Promise<void> {
  const supabase = createAdminClient();

  // Get deletion request
  const { data: request, error: requestError } = await supabase
    .from('data_deletion_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error('Deletion request not found');
  }

  // Check if still within grace period
  const scheduledDate = new Date(request.scheduled_for);
  if (scheduledDate < new Date()) {
    throw new Error('Deletion has already been processed');
  }

  // Cancel the deletion request
  await supabase
    .from('data_deletion_requests')
    .delete({ count: 'exact' })
    .eq('id', requestId);

  // Re-enable user account
  await supabase.auth.admin.updateUserById(request.user_id, {
    user_metadata: {
      deletion_requested: false,
      deletion_scheduled_for: null,
    },
  });

  // Log the cancellation
  await logAuditEvent(request.user_id, 'data_deletion_cancelled', 'user', request.user_id);
}

/**
 * Process data deletion (called after grace period)
 * Permanently deletes all user data
 */
export async function processDataDeletion(requestId: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Update status to processing
    await supabase
      .from('data_deletion_requests')
      .update({ status: 'processing' })
      .eq('id', requestId);

    // Get request details
    const { data: request, error: requestError } = await supabase
      .from('data_deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error('Deletion request not found');
    }

    const userId = request.user_id;

    // Verify grace period has passed
    const scheduledDate = new Date(request.scheduled_for);
    if (scheduledDate > new Date()) {
      throw new Error('Grace period has not yet passed');
    }

    // Track deleted data for summary
    const deletedSummary: Record<string, number> = {};

    // 1. Delete calls and associated data
    const { data: calls } = await supabase
      .from('calls')
      .select('id, audio_url')
      .eq('user_id', userId);

    if (calls && calls.length > 0) {
      const callIds = calls.map(c => c.id);

      // Delete audio files from storage
      for (const call of calls) {
        if (call.audio_url) {
          const fileName = call.audio_url.split('/').pop();
          if (fileName) {
            await supabase.storage.from('call-recordings').remove([fileName]);
          }
        }
      }

      // Delete transcripts
      const { count: transcriptCount } = await supabase
        .from('transcripts')
        .delete({ count: 'exact' })
        .in('call_id', callIds);
      deletedSummary['transcripts'] = transcriptCount || 0;

      // Delete extractions
      const { count: extractionCount } = await supabase
        .from('extractions')
        .delete({ count: 'exact' })
        .in('call_id', callIds);
      deletedSummary['extractions'] = extractionCount || 0;

      // Delete calls
      const { count: callCount } = await supabase
        .from('calls')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
;
      deletedSummary['calls'] = callCount || 0;
    }

    // 2. Delete templates
    const { count: templateCount } = await supabase
      .from('templates')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletedSummary['templates'] = templateCount || 0;

    // 3. Delete team memberships
    const { count: teamMemberCount } = await supabase
      .from('team_members')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletedSummary['team_memberships'] = teamMemberCount || 0;

    // 4. Delete subscriptions (mark as cancelled, keep for billing records)
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'user_data_deletion'
      })
      .eq('user_id', userId);

    // 5. Delete consent records (but keep audit trail)
    const { count: consentCount } = await supabase
      .from('user_consents')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    deletedSummary['consents'] = consentCount || 0;

    // 6. Anonymize audit logs (keep for legal compliance, but remove PII)
    await supabase
      .from('audit_logs')
      .update({
        user_id: 'deleted_user',
        ip_address: 'redacted',
        user_agent: 'redacted',
      })
      .eq('user_id', userId);

    // 7. Delete data export requests
    await supabase
      .from('data_export_requests')
      .delete({ count: 'exact' })
      .eq('user_id', userId);

    // 8. Delete user auth account
    await supabase.auth.admin.deleteUser(userId);

    // 9. Update deletion request as completed
    await supabase
      .from('data_deletion_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        deleted_data_summary: deletedSummary,
      })
      .eq('id', requestId);

    // Final audit log entry (anonymized)
    await supabase.from('audit_logs').insert({
      user_id: 'deleted_user',
      action: 'data_deletion_completed',
      resource_type: 'user',
      resource_id: userId,
      timestamp: new Date().toISOString(),
      metadata: { deleted_summary: deletedSummary },
    });

  } catch (error) {
    // Update request status to failed
    await supabase
      .from('data_deletion_requests')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', requestId);

    throw error;
  }
}

/**
 * Get pending deletion requests that are ready to be processed
 */
export async function getPendingDeletions(): Promise<DataDeletionRequest[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('data_deletion_requests')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString());

  return data || [];
}

/**
 * Get deletion request status
 */
export async function getDeletionStatus(requestId: string): Promise<DataDeletionRequest | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('data_deletion_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Check if user has pending deletion
 */
export async function hasPendingDeletion(userId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('data_deletion_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .single();

  return !!data;
}

/**
 * Log audit event
 */
async function logAuditEvent(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    timestamp: new Date().toISOString(),
  });
}
