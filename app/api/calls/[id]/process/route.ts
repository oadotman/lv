// =====================================================
// CALL PROCESSING API ROUTE (WITHOUT INNGEST)
// Handles transcription and extraction directly
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { canProcessCall, estimateMinutesFromFileSize, acquireProcessingLock, releaseProcessingLock } from '@/lib/usage-guard';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const callId = params.id;

  try {
    const supabase = createAdminClient();

    // Get call details including template
    const { data: call, error: fetchError } = await supabase
      .from('calls')
      .select('*, template:custom_templates(*)')
      .eq('id', callId)
      .single();

    if (fetchError || !call) {
      console.error('[Process] Call not found:', callId);
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    console.log('[Process] ========================================');
    console.log('[Process] Starting processing for call:', callId);
    console.log('[Process] File:', call.file_name);

    // Update status to processing
    await supabase
      .from('calls')
      .update({
        status: 'processing',
        processing_progress: 0,
        processing_message: 'Preparing audio file for transcription...',
      })
      .eq('id', callId);

    // Get audio URL from storage
    const audioUrl = call.file_url;

    if (!audioUrl) {
      console.error('[Process] ❌ No audio URL found');
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          assemblyai_error: 'No audio URL found',
        })
        .eq('id', callId);

      return NextResponse.json(
        { error: 'No audio URL found' },
        { status: 400 }
      );
    }

    console.log('[Process] Audio URL:', audioUrl);

    // =====================================================
    // CRITICAL: CHECK USAGE BEFORE TRANSCRIPTION
    // =====================================================

    if (call.organization_id) {
      // Estimate minutes from file size
      const estimatedMinutes = call.file_size
        ? estimateMinutesFromFileSize(call.file_size)
        : 10; // Conservative estimate if no file size

      console.log('[Process] 🔒 Checking usage guard...');
      const usageCheck = await canProcessCall(call.organization_id, estimatedMinutes, supabase as any);

      if (!usageCheck.allowed) {
        console.error('[Process] 🚫 BLOCKED by usage guard:', {
          callId,
          organizationId: call.organization_id,
          reason: usageCheck.reason,
          projectedCharge: usageCheck.projectedCharge,
        });

        // Mark call as failed due to usage limit
        await supabase
          .from('calls')
          .update({
            status: 'failed',
            assemblyai_error: `Usage limit exceeded: ${usageCheck.reason}`,
            processing_message: 'Processing blocked: Would exceed $20 overage cap',
          })
          .eq('id', callId);

        return NextResponse.json(
          {
            error: 'Usage limit exceeded',
            details: {
              reason: usageCheck.reason,
              currentUsage: usageCheck.currentUsage,
              projectedOverageCharge: usageCheck.projectedCharge,
              message: 'This transcription would exceed your $20 overage cap. Please upgrade your plan.',
            },
          },
          { status: 402 }
        );
      }

      // Try to acquire processing lock to prevent concurrent abuse
      console.log('[Process] 🔐 Acquiring processing lock...');
      const lockAcquired = await acquireProcessingLock(
        call.organization_id,
        callId,
        estimatedMinutes,
        supabase as any
      );

      if (!lockAcquired) {
        console.warn('[Process] ⚠️ Failed to acquire lock, but continuing...');
        // Continue anyway - lock is advisory
      }
    }

    // =====================================================
    // STEP 1: TRANSCRIBE AUDIO (NOW SAFE TO PROCEED)
    // =====================================================

    await supabase
      .from('calls')
      .update({
        status: 'transcribing',
        assemblyai_audio_url: audioUrl,
        processing_progress: 0,
        processing_message: 'Submitting audio to AssemblyAI...',
      })
      .eq('id', callId);

    const { submitTranscriptionJob } = await import('@/lib/assemblyai');

    // Get participant count from metadata if available
    const participantCount = call.metadata?.participants?.length || 2;
    const speakersExpected = Math.max(2, participantCount); // At least 2 speakers

    console.log('[Process] Participants detected:', participantCount);
    console.log('[Process] Speakers expected for transcription:', speakersExpected);

    const transcriptionResult = await submitTranscriptionJob(
      {
        audioUrl,
        speakersExpected: speakersExpected,
        trimStart: call.trim_start || undefined,
        trimEnd: call.trim_end || undefined,
      },
      async (progress) => {
        // Update call record with real-time progress
        await supabase
          .from('calls')
          .update({
            processing_progress: progress.percent || 0,
            processing_message: progress.message,
          })
          .eq('id', callId);

        console.log(`[Process] 📊 Progress: ${progress.percent}% - ${progress.message}`);
      }
    );

    console.log('[Process] ✅ Transcription completed');
    console.log('[Process] 🕐 Audio duration from AssemblyAI:', transcriptionResult.audio_duration, 'seconds');
    console.log('[Process] 🕐 Duration in seconds:', transcriptionResult.audio_duration ? Math.round(transcriptionResult.audio_duration) : 'N/A');
    console.log('[Process] 🕐 Duration in minutes:', transcriptionResult.audio_duration ? Math.ceil(transcriptionResult.audio_duration / 60) : 'N/A');

    // =====================================================
    // STEP 2: SAVE TRANSCRIPT
    // =====================================================

    // Calculate average confidence from utterances
    const avgConfidence = transcriptionResult.utterances && transcriptionResult.utterances.length > 0
      ? transcriptionResult.utterances.reduce((sum, u) => sum + u.confidence, 0) / transcriptionResult.utterances.length
      : 0;

    // Map speakers to roles
    const { mapSpeakersToRoles } = await import('@/lib/assemblyai');
    const speakerMapping = transcriptionResult.utterances
      ? mapSpeakersToRoles(transcriptionResult.utterances as any)
      : {};

    const { data: transcript } = await supabase
      .from('transcripts')
      .insert({
        call_id: callId,
        assemblyai_id: transcriptionResult.id,
        text: transcriptionResult.text,
        full_text: transcriptionResult.text, // Add full_text for compatibility
        utterances: transcriptionResult.utterances,
        words: transcriptionResult.words,
        speaker_mapping: speakerMapping,
        speakers_count: Object.keys(speakerMapping).length,
        confidence_score: avgConfidence,
        audio_duration: transcriptionResult.audio_duration,
        word_count: transcriptionResult.words?.length || 0,
      })
      .select()
      .single();

    console.log('[Process] ✅ Transcript saved');

    // Save utterances to the normalized table
    if (transcript && transcriptionResult.utterances && transcriptionResult.utterances.length > 0) {
      const utterancesToInsert = transcriptionResult.utterances.map((utterance: any) => ({
        transcript_id: transcript.id,
        speaker: utterance.speaker || 'Unknown',
        text: utterance.text,
        start_time: utterance.start / 1000, // Convert ms to seconds
        end_time: utterance.end / 1000, // Convert ms to seconds
        confidence: utterance.confidence,
        sentiment: utterance.sentiment || 'neutral',
      }));

      const { error: utteranceError } = await supabase
        .from('transcript_utterances')
        .insert(utterancesToInsert);

      if (utteranceError) {
        console.error('[Process] ⚠️ Failed to save utterances:', utteranceError);
      } else {
        console.log(`[Process] ✅ Saved ${utterancesToInsert.length} utterances`);
      }
    }

    // =====================================================
    // STEP 3: EXTRACT CRM DATA
    // =====================================================

    await supabase
      .from('calls')
      .update({
        status: 'extracting',
        processing_progress: 50,
        processing_message: 'Analyzing conversation with AI to extract insights...',
      })
      .eq('id', callId);

    // Use the negotiation-aware extraction for LoadVoice
    const { extractFreightData } = await import('@/lib/openai-loadvoice');

    // Determine call type for extraction
    let extractionCallType: 'shipper' | 'carrier' | 'check' | undefined;
    if (call.call_type === 'carrier') {
      extractionCallType = 'carrier';
    } else if (call.call_type === 'shipper') {
      extractionCallType = 'shipper';
    } else if (call.call_type === 'check_call') {
      extractionCallType = 'check';
    }

    const extraction = await extractFreightData(
      transcriptionResult.text || '',
      extractionCallType,
      call.template_id || undefined
    );

    console.log('[Process] ✅ CRM data extracted');

    // Update progress
    await supabase
      .from('calls')
      .update({
        processing_progress: 75,
        processing_message: 'Saving extracted data to database...',
      })
      .eq('id', callId);

    // =====================================================
    // STEP 4: SAVE EXTRACTED FIELDS
    // =====================================================

    // Store extracted fields including negotiation data
    const coreFields = [
      // Universal fields (kept)
      { name: 'summary', value: extraction.summary || '', type: 'text' },
      { name: 'sentiment', value: extraction.sentiment || 'neutral', type: 'text' },
      { name: 'action_items', value: JSON.stringify(extraction.action_items || []), type: 'json' },
      { name: 'next_steps', value: JSON.stringify(extraction.next_steps || []), type: 'json' },

      // Call type and key info
      { name: 'call_type', value: extraction.call_type || extraction.extraction_type || 'unknown', type: 'text' },

      // Negotiation outcome if present (for carrier calls)
      ...(extraction.negotiation_outcome ? [
        { name: 'negotiation_status', value: extraction.negotiation_outcome.status, type: 'text' },
        ...(extraction.negotiation_outcome.agreed_rate ? [
          { name: 'agreed_rate', value: extraction.negotiation_outcome.agreed_rate.toString(), type: 'number' },
          { name: 'rate_type', value: extraction.negotiation_outcome.rate_type || 'flat', type: 'text' },
          { name: 'rate_includes_fuel', value: String(extraction.negotiation_outcome.rate_includes_fuel), type: 'boolean' },
        ] : []),
        ...(extraction.negotiation_outcome.broker_final_position ? [
          { name: 'broker_final_position', value: extraction.negotiation_outcome.broker_final_position.toString(), type: 'number' },
        ] : []),
        ...(extraction.negotiation_outcome.carrier_final_position ? [
          { name: 'carrier_final_position', value: extraction.negotiation_outcome.carrier_final_position.toString(), type: 'number' },
        ] : []),
        ...(extraction.negotiation_outcome.pending_reason ? [
          { name: 'pending_reason', value: extraction.negotiation_outcome.pending_reason, type: 'text' },
        ] : []),
        ...(extraction.negotiation_outcome.rejection_reason ? [
          { name: 'rejection_reason', value: extraction.negotiation_outcome.rejection_reason, type: 'text' },
        ] : []),
        ...(extraction.negotiation_outcome.callback_conditions ? [
          { name: 'callback_conditions', value: extraction.negotiation_outcome.callback_conditions, type: 'text' },
        ] : []),
        ...(extraction.negotiation_outcome.accessorials_discussed ? [
          { name: 'accessorials_discussed', value: JSON.stringify(extraction.negotiation_outcome.accessorials_discussed), type: 'json' },
        ] : []),
        ...(extraction.negotiation_outcome.contingencies ? [
          { name: 'contingencies', value: JSON.stringify(extraction.negotiation_outcome.contingencies), type: 'json' },
        ] : []),
        { name: 'negotiation_confidence', value: JSON.stringify(extraction.negotiation_outcome.confidence), type: 'json' },
        ...(extraction.negotiation_outcome.negotiation_summary ? [
          { name: 'negotiation_summary', value: extraction.negotiation_outcome.negotiation_summary, type: 'text' },
        ] : []),
        ...(extraction.negotiation_outcome.rate_history ? [
          { name: 'rate_history', value: JSON.stringify(extraction.negotiation_outcome.rate_history), type: 'json' },
        ] : []),
      ] : []),

      // Should generate rate confirmation flag
      ...(extraction.should_generate_rate_con !== undefined ? [
        { name: 'should_generate_rate_con', value: String(extraction.should_generate_rate_con), type: 'boolean' },
      ] : []),

      // Rate analysis if available
      ...(extraction.rate_analysis ? [
        { name: 'rate_analysis', value: JSON.stringify(extraction.rate_analysis), type: 'json' },
      ] : []),

      // Lane information if present
      ...(extraction.lane ? [
        { name: 'lane_origin', value: extraction.lane.origin, type: 'text' },
        { name: 'lane_destination', value: extraction.lane.destination, type: 'text' },
      ] : []),

      // Rate and equipment if discussed (fallback for non-negotiation extractions)
      ...(extraction.rate_discussed && !extraction.negotiation_outcome ? [
        { name: 'rate_discussed', value: extraction.rate_discussed.toString(), type: 'number' },
      ] : []),
      ...(extraction.equipment_discussed ? [
        { name: 'equipment_discussed', value: extraction.equipment_discussed, type: 'text' },
      ] : []),

      // Carrier details if extracted
      ...(extraction.carrier_details ? Object.entries(extraction.carrier_details).map(([key, value]) => ({
        name: `carrier_${key}`,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value || ''),
        type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text',
      })) : []),

      // Freight-specific data based on call type (for non-negotiation extractions)
      ...(extraction.shipper_data ? Object.entries(extraction.shipper_data).map(([key, value]) => ({
        name: `shipper_${key}`,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value || ''),
        type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text',
      })) : []),

      ...(extraction.carrier_data && !extraction.negotiation_outcome ? Object.entries(extraction.carrier_data).map(([key, value]) => ({
        name: `carrier_${key}`,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value || ''),
        type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text',
      })) : []),

      ...(extraction.check_call_data ? Object.entries(extraction.check_call_data).map(([key, value]) => ({
        name: `check_${key}`,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value || ''),
        type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text',
      })) : []),

      // Validation warnings if present
      ...(extraction.validation_warnings && extraction.validation_warnings.length > 0 ? [
        { name: 'validation_warnings', value: JSON.stringify(extraction.validation_warnings), type: 'json' },
      ] : []),
    ].filter(field => field.value !== null && field.value !== undefined && field.value !== '');

    await supabase.from('call_fields').insert(
      coreFields.map((field) => ({
        call_id: callId,
        field_name: field.name,
        field_value: field.value,
        field_type: field.type,
        confidence_score: 0.9,
        source: 'gpt-4o',
      }))
    );

    console.log('[Process] ✅ Saved', coreFields.length, 'core fields');

    // =====================================================
    // STEP 4A: AUTO-VERIFY CARRIER IF MC/DOT EXTRACTED
    // =====================================================

    // Check if we have carrier info with MC or DOT number
    const carrierMC = extraction.carrier_data?.mc_number || extraction.rate_data?.mc_number;
    const carrierDOT = extraction.carrier_data?.dot_number || extraction.rate_data?.dot_number;
    const carrierName = extraction.carrier_data?.carrier_name || extraction.rate_data?.carrier_name;

    if (carrierMC || carrierDOT) {
      console.log('[Process] 🔍 Carrier detected, initiating FMCSA verification...');

      try {
        const { verifyCarrier } = await import('@/lib/services/fmcsa-verification');

        // Clean up the numbers
        const mc = carrierMC?.replace(/^MC-?/i, '').replace(/\D/g, '');
        const dot = carrierDOT?.replace(/^DOT-?/i, '').replace(/\D/g, '');

        // Perform verification (async, non-blocking)
        const verificationPromise = verifyCarrier(mc, dot, false).then(async (verification) => {
          if (verification.verified) {
            console.log('[Process] ✅ Carrier verified:', verification.riskLevel, 'risk');

            // Store verification in database
            const { data: userOrg } = await supabase
              .from('user_organizations')
              .select('organization_id')
              .eq('user_id', call.user_id)
              .single();

            if (userOrg) {
              // Check if carrier exists
              let carrierId = null;

              if (mc) {
                const { data: existingCarrier } = await supabase
                  .from('carriers')
                  .select('id')
                  .eq('organization_id', userOrg.organization_id)
                  .eq('mc_number', `MC-${mc}`)
                  .single();

                carrierId = existingCarrier?.id;
              }

              if (!carrierId && dot) {
                const { data: existingCarrier } = await supabase
                  .from('carriers')
                  .select('id')
                  .eq('organization_id', userOrg.organization_id)
                  .eq('dot_number', dot)
                  .single();

                carrierId = existingCarrier?.id;
              }

              // Create carrier if doesn't exist
              if (!carrierId && (mc || dot)) {
                const { data: newCarrier } = await supabase
                  .from('carriers')
                  .insert({
                    organization_id: userOrg.organization_id,
                    carrier_name: verification.data?.legalName || carrierName || 'Unknown Carrier',
                    mc_number: mc ? `MC-${mc}` : null,
                    dot_number: dot || null,
                    legal_name: verification.data?.legalName,
                    phone: verification.data?.phone,
                    address: verification.data?.physicalAddress,
                    city: verification.data?.physicalCity,
                    state: verification.data?.physicalState,
                    zip_code: verification.data?.physicalZip,
                    verification_status:
                      verification.riskLevel === 'LOW' ? 'VERIFIED_LOW_RISK' :
                      verification.riskLevel === 'MEDIUM' ? 'VERIFIED_MEDIUM_RISK' :
                      'VERIFIED_HIGH_RISK',
                    verification_warnings: verification.warnings,
                    last_verification_date: new Date().toISOString(),
                    auto_created: true,
                  })
                  .select()
                  .single();

                carrierId = newCarrier?.id;
              } else if (carrierId) {
                // Update existing carrier with verification
                await supabase
                  .from('carriers')
                  .update({
                    verification_status:
                      verification.riskLevel === 'LOW' ? 'VERIFIED_LOW_RISK' :
                      verification.riskLevel === 'MEDIUM' ? 'VERIFIED_MEDIUM_RISK' :
                      'VERIFIED_HIGH_RISK',
                    verification_warnings: verification.warnings,
                    last_verification_date: new Date().toISOString(),
                  })
                  .eq('id', carrierId);
              }

              // Store verification record
              if (carrierId) {
                await supabase
                  .from('carrier_verifications')
                  .insert({
                    carrier_id: carrierId,
                    mc_number: mc,
                    dot_number: dot,
                    legal_name: verification.data?.legalName,
                    operating_status: verification.data?.operatingStatus,
                    safety_rating: verification.data?.safetyRating,
                    bipd_insurance_on_file: verification.data?.bipdInsuranceOnFile,
                    cargo_insurance_on_file: verification.data?.cargoInsuranceOnFile,
                    risk_level: verification.riskLevel,
                    risk_score: verification.riskScore,
                    warnings: verification.warnings,
                    raw_response: verification.data,
                  });

                // Link carrier to call via carrier_interactions
                await supabase
                  .from('carrier_interactions')
                  .insert({
                    call_id: callId,
                    carrier_id: carrierId,
                    interaction_type: 'extracted',
                    mc_number: mc ? `MC-${mc}` : null,
                    dot_number: dot,
                    carrier_name: verification.data?.legalName || carrierName,
                    verification_status: verification.riskLevel,
                  });
              }
            }
          } else {
            console.log('[Process] ⚠️ Carrier verification failed:', verification.warnings);
          }
        }).catch(error => {
          console.error('[Process] ❌ Carrier verification error:', error);
        });

        // Don't wait for verification to complete - let it run in background
        console.log('[Process] 🔄 Carrier verification running in background...');

      } catch (error) {
        console.error('[Process] ❌ Failed to initiate carrier verification:', error);
      }
    }

    // =====================================================
    // STEP 4B: EXTRACT TEMPLATE-SPECIFIC FIELDS (IF TEMPLATE SELECTED)
    // =====================================================

    if (call.template_id && call.template) {
      console.log('[Process] 🎯 Template selected:', call.template.name);

      // Validate template ownership
      const { data: templateValidation } = await supabase
        .from('custom_templates')
        .select('id, user_id, organization_id')
        .eq('id', call.template_id)
        .single();

      if (!templateValidation) {
        console.error('[Process] ⚠️ Template not found:', call.template_id);
        // Continue with core fields only
      } else {
        // Check if template belongs to user or their organization
        const isUserTemplate = templateValidation.user_id === call.user_id;

        let isOrgTemplate = false;
        if (templateValidation.organization_id) {
          const { data: userOrg } = await supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('user_id', call.user_id)
            .eq('organization_id', templateValidation.organization_id)
            .single();

          isOrgTemplate = !!userOrg;
        }

        if (!isUserTemplate && !isOrgTemplate) {
          console.error('[Process] ⚠️ User does not have access to template:', call.template_id);
          // Continue with core fields only, don't use unauthorized template
        } else {
          // Template is valid and user has access
          console.log('[Process] ✅ Template validated, user has access');

          // Update progress
          await supabase
            .from('calls')
            .update({
              processing_progress: 85,
              processing_message: `Extracting ${call.template.name} template fields...`,
            })
            .eq('id', callId);

          // Fetch template fields
          const { data: templateFields } = await supabase
            .from('template_fields')
            .select('*')
            .eq('template_id', call.template_id)
            .order('sort_order', { ascending: true });

      if (templateFields && templateFields.length > 0) {
        console.log('[Process] 📋 Template has', templateFields.length, 'custom fields');

        // Extract template-specific fields using AI
        const { extractTemplateFields } = await import('@/lib/openai');

        const templateExtraction = await extractTemplateFields(
          transcriptionResult.text || '',
          transcriptionResult.utterances || [],
          speakerMapping,
          templateFields
        );

        console.log('[Process] ✅ Template fields extracted');

        // Save template-specific fields
        const templateFieldsToSave = templateExtraction.map((extractedField: any) => ({
          call_id: callId,
          template_id: call.template_id,
          field_name: extractedField.field_name || extractedField.name,
          field_value: extractedField.value || extractedField.field_value || '',
          field_type: templateFields.find((f: any) => f.field_name === (extractedField.field_name || extractedField.name))?.field_type || 'text',
          confidence_score: extractedField.confidence || 0.85,
          source: 'gpt-4o-template',
        }));

        if (templateFieldsToSave.length > 0) {
          await supabase.from('call_fields').insert(templateFieldsToSave);
          console.log('[Process] ✅ Saved', templateFieldsToSave.length, 'template fields');
        }
      }
        }
      }
    } else {
      console.log('[Process] ℹ️ No template selected - using default extraction only');
    }

    // Update progress
    await supabase
      .from('calls')
      .update({
        processing_progress: 95,
        processing_message: 'Finalizing call record...',
      })
      .eq('id', callId);

    // =====================================================
    // STEP 5: UPDATE CALL WITH FINAL DATA
    // =====================================================

    // IMPORTANT: AssemblyAI returns audio_duration in SECONDS, not milliseconds!
    const durationSeconds = transcriptionResult.audio_duration
      ? Math.round(transcriptionResult.audio_duration) // Already in seconds from AssemblyAI
      : call.duration || null;

    const durationMinutes = durationSeconds
      ? Math.ceil(durationSeconds / 60) // Convert seconds to minutes
      : null;

    await supabase
      .from('calls')
      .update({
        status: 'completed',
        processing_progress: 100,
        processing_message: 'All done! Your call is ready to review.',
        duration: durationSeconds,
        duration_minutes: durationMinutes,
        customer_company: extraction.shipper_data?.shipper_company || extraction.carrier_data?.carrier_name || call.customer_company,
        next_steps: extraction.next_steps?.join('\n') || null,
        sentiment_type: extraction.sentiment || null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', callId);

    console.log('[Process] ✅ Call updated - COMPLETE');

    // =====================================================
    // STEP 6: RECORD USAGE FOR BILLING (SIMPLE USAGE TRACKING)
    // =====================================================

    console.log('[Process] 💰 Recording usage:');
    console.log('[Process] 💰 Duration seconds:', durationSeconds);
    console.log('[Process] 💰 Duration minutes to bill:', durationMinutes);

    if (durationMinutes && durationMinutes > 0) {
      // Get organization_id if not present
      let organizationId = call.organization_id;

      if (!organizationId) {
        // Try to get organization from user
        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', call.user_id)
          .single();

        organizationId = userOrg?.organization_id;

        // Update call with organization_id
        if (organizationId) {
          await supabase
            .from('calls')
            .update({ organization_id: organizationId })
            .eq('id', callId);
        }
      }

      // Use the simple usage tracking function (log_call_usage)
      // This function handles everything: logging to usage_logs table and updating organization usage
      const { error: usageError } = await supabase.rpc('log_call_usage', {
        p_call_id: callId,
        p_duration_minutes: durationMinutes
      });

      if (usageError) {
        console.error('[Process] ⚠️ Failed to record usage:', usageError);
        console.error('[Process] Usage error details:', usageError);
      } else {
        console.log(`[Process] ✅ Recorded ${durationMinutes} minutes usage for call ${callId}`);

        // Log the organization if we have it for debugging
        if (organizationId) {
          console.log(`[Process] ✅ Organization: ${organizationId}`);
        }
      }

      // Note: The log_call_usage function automatically:
      // - Gets the organization from the call
      // - Logs to usage_logs table
      // - Updates organization's usage_minutes_current
      // - Marks as overage if needed
    }
    console.log('[Process] ========================================');

    // Create notification
    await supabase.from('notifications').insert({
      user_id: call.user_id,
      notification_type: 'call_completed',
      title: 'Call processed successfully',
      message: `Your call with ${extraction.shipper_data?.shipper_company || extraction.carrier_data?.carrier_name || call.customer_name || 'customer'} is ready to review.`,
      link: `/calls/${callId}`,
    });

    // Release processing lock on success
    if (call.organization_id) {
      await releaseProcessingLock(callId, supabase as any);
      console.log('[Process] 🔓 Released processing lock');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Call processed successfully',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Process] ❌ ERROR:', error);

    const supabase = createAdminClient();

    // Release processing lock on failure
    try {
      const { data: call } = await supabase
        .from('calls')
        .select('organization_id')
        .eq('id', callId)
        .single();

      if (call?.organization_id) {
        await releaseProcessingLock(callId, supabase as any);
        console.log('[Process] 🔓 Released processing lock (on error)');
      }
    } catch (lockError) {
      console.error('[Process] Failed to release lock:', lockError);
    }

    // Check current status before marking as failed
    const { data: currentCall } = await supabase
      .from('calls')
      .select('status, user_id')
      .eq('id', callId)
      .single();

    // Only mark as failed if not already completed
    // This prevents completed transcriptions from being marked as failed
    if (currentCall?.status !== 'completed') {
      await supabase
        .from('calls')
        .update({
          status: 'failed',
          assemblyai_error: error instanceof Error ? error.message : 'Unknown error',
          processing_message: 'Processing failed. Please try again or contact support.',
        })
        .eq('id', callId);

      // Send appropriate alert based on failure type
      try {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const {
          alertTranscriptionFailed,
          alertExtractionFailed,
          alertProcessingTimeout
        } = await import('@/lib/monitoring/alert-service');

        if (errorMessage.includes('AssemblyAI') || errorMessage.includes('transcript')) {
          await alertTranscriptionFailed(
            callId,
            currentCall?.user_id || '',
            error,
            (await supabase.from('calls').select('audio_url').eq('id', callId).single()).data?.audio_url
          );
        } else if (errorMessage.includes('extraction') || errorMessage.includes('OpenAI')) {
          await alertExtractionFailed(callId, currentCall?.user_id || '', error);
        } else if (errorMessage.includes('timeout')) {
          await alertProcessingTimeout(callId, currentCall?.user_id || '', 5);
        }
      } catch (alertError) {
        console.error('[Process] Failed to send alert:', alertError);
      }

      // Send email notification about failure AND create in-app notification
      if (currentCall?.user_id) {
        // Get full call details for email
        const { data: fullCall } = await supabase
          .from('calls')
          .select('*')
          .eq('id', callId)
          .single();

        if (fullCall) {
          // Import and send failure email
          const { sendFailedProcessingEmail } = await import('@/lib/emails/failed-processing');

          // Determine error type
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          let errorType: 'transcription' | 'extraction' | 'timeout' | 'unknown' = 'unknown';

          if (errorMessage.includes('AssemblyAI') || errorMessage.includes('transcript')) {
            errorType = 'transcription';
          } else if (errorMessage.includes('extraction') || errorMessage.includes('OpenAI')) {
            errorType = 'extraction';
          } else if (errorMessage.includes('timeout')) {
            errorType = 'timeout';
          }

          // Send the email
          await sendFailedProcessingEmail({
            callId,
            userId: currentCall.user_id,
            customerName: fullCall.customer_name,
            customerPhone: fullCall.customer_phone,
            salesRep: fullCall.sales_rep,
            fileName: fullCall.file_name,
            uploadedAt: fullCall.created_at,
            errorMessage,
            errorType,
          });
        }

        // Also create in-app notification (keeping existing)
        await supabase.from('notifications').insert({
          user_id: currentCall.user_id,
          notification_type: 'call_failed',
          title: 'Call processing failed',
          message: `Your call with ${fullCall?.customer_phone || 'unknown number'} couldn't be processed. Please document it manually.`,
          link: `/calls/${callId}`,
        });
      }
    } else {
      console.log('[Process] ⚠️ Error occurred but transcription was already completed, not marking as failed');
    }

    return NextResponse.json(
      {
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
