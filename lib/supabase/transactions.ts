// =====================================================
// SUPABASE TRANSACTION HELPERS
// Provides atomic operation patterns for critical workflows
// =====================================================

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Atomic call processing state update
 * Ensures all related records are updated together
 */
export async function atomicCallProcessingUpdate(
  supabase: SupabaseClient,
  callId: string,
  updates: {
    transcript?: any;
    fields?: Array<{ field_name: string; field_value: any; field_type?: string }>;
    callUpdate?: any;
  }
): Promise<{ success: boolean; error?: string }> {
  const results = {
    transcriptSaved: false,
    fieldsSaved: false,
    callUpdated: false,
  };

  try {
    // Step 1: Save transcript if provided
    if (updates.transcript) {
      const { error: transcriptError } = await supabase
        .from('transcripts')
        .upsert({
          call_id: callId,
          ...updates.transcript,
        });

      if (transcriptError) {
        throw new Error(`Failed to save transcript: ${transcriptError.message}`);
      }
      results.transcriptSaved = true;
    }

    // Step 2: Save fields if provided
    if (updates.fields && updates.fields.length > 0) {
      // Batch insert fields
      const fieldsToInsert = updates.fields.map(field => ({
        call_id: callId,
        ...field,
        created_at: new Date().toISOString(),
      }));

      const { error: fieldsError } = await supabase
        .from('call_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        // Rollback transcript if fields fail
        if (results.transcriptSaved) {
          await supabase
            .from('transcripts')
            .delete()
            .eq('call_id', callId);
        }
        throw new Error(`Failed to save fields: ${fieldsError.message}`);
      }
      results.fieldsSaved = true;
    }

    // Step 3: Update call status
    if (updates.callUpdate) {
      const { error: callError } = await supabase
        .from('calls')
        .update({
          ...updates.callUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', callId);

      if (callError) {
        // Rollback everything
        if (results.fieldsSaved) {
          await supabase
            .from('call_fields')
            .delete()
            .eq('call_id', callId);
        }
        if (results.transcriptSaved) {
          await supabase
            .from('transcripts')
            .delete()
            .eq('call_id', callId);
        }
        throw new Error(`Failed to update call: ${callError.message}`);
      }
      results.callUpdated = true;
    }

    return { success: true };

  } catch (error: any) {
    console.error('[Transaction] Atomic update failed:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Atomic invitation acceptance
 * Ensures invitation is marked accepted and user is added to org atomically
 */
export async function atomicInvitationAcceptance(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string,
  organizationId: string,
  role: string,
  invitedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Try to mark invitation as accepted with conditional update
    const { data: updatedInvite, error: updateError } = await supabase
      .from('team_invitations')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq('id', invitationId)
      .is('accepted_at', null) // Only update if not already accepted
      .select()
      .single();

    if (updateError || !updatedInvite) {
      return {
        success: false,
        error: 'Invitation already accepted or invalid',
      };
    }

    // Step 2: Add user to organization
    const { error: memberError } = await supabase
      .from('user_organizations')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role: role,
        invited_by: invitedBy,
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      // Rollback invitation acceptance
      await supabase
        .from('team_invitations')
        .update({
          accepted_at: null,
          accepted_by: null,
        })
        .eq('id', invitationId);

      if (memberError.code === '23505') {
        return {
          success: false,
          error: 'User already a member of organization',
        };
      }

      return {
        success: false,
        error: `Failed to add user to organization: ${memberError.message}`,
      };
    }

    return { success: true };

  } catch (error: any) {
    console.error('[Transaction] Invitation acceptance failed:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Atomic template creation
 * Ensures template and fields are created together
 */
export async function atomicTemplateCreation(
  supabase: SupabaseClient,
  template: {
    user_id: string;
    organization_id?: string;
    name: string;
    description?: string;
    field_count: number;
  },
  fields: Array<{
    field_name: string;
    field_type: string;
    description?: string;
    is_required?: boolean;
    sort_order: number;
  }>
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    // Step 1: Create template
    const { data: newTemplate, error: templateError } = await supabase
      .from('custom_templates')
      .insert({
        ...template,
        category: 'custom',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (templateError || !newTemplate) {
      return {
        success: false,
        error: `Failed to create template: ${templateError?.message}`,
      };
    }

    // Step 2: Create fields
    if (fields.length > 0) {
      const fieldsToInsert = fields.map(field => ({
        template_id: newTemplate.id,
        ...field,
        created_at: new Date().toISOString(),
      }));

      const { error: fieldsError } = await supabase
        .from('template_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        // Rollback template creation
        await supabase
          .from('custom_templates')
          .delete()
          .eq('id', newTemplate.id);

        return {
          success: false,
          error: `Failed to create template fields: ${fieldsError.message}`,
        };
      }
    }

    return {
      success: true,
      templateId: newTemplate.id,
    };

  } catch (error: any) {
    console.error('[Transaction] Template creation failed:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Atomic call deletion
 * Ensures all related records are deleted together
 */
export async function atomicCallDeletion(
  supabase: SupabaseClient,
  callId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get file URL for cleanup
    const { data: call } = await supabase
      .from('calls')
      .select('file_url')
      .eq('id', callId)
      .single();

    // Delete in reverse dependency order
    // 1. Delete call_fields
    await supabase
      .from('call_fields')
      .delete()
      .eq('call_id', callId);

    // 2. Delete call_insights
    await supabase
      .from('call_insights')
      .delete()
      .eq('call_id', callId);

    // 3. Delete transcript_utterances via transcript
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('id')
      .eq('call_id', callId)
      .single();

    if (transcript) {
      await supabase
        .from('transcript_utterances')
        .delete()
        .eq('transcript_id', transcript.id);

      await supabase
        .from('transcripts')
        .delete()
        .eq('call_id', callId);
    }

    // 4. Delete the call itself
    const { error: callError } = await supabase
      .from('calls')
      .delete()
      .eq('id', callId);

    if (callError) {
      throw new Error(`Failed to delete call: ${callError.message}`);
    }

    // 5. Clean up storage file if exists
    if (call?.file_url) {
      // Extract file path from URL
      const urlParts = call.file_url.split('/');
      const fileName = urlParts.slice(-2).join('/'); // user_id/filename

      await supabase.storage
        .from('call-audio')
        .remove([fileName]);
    }

    return { success: true };

  } catch (error: any) {
    console.error('[Transaction] Call deletion failed:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}