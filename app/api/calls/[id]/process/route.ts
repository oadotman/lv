// =====================================================
// CALL PROCESSING API ROUTE (WITHOUT INNGEST)
// Handles transcription and extraction directly
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

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
    // STEP 1: TRANSCRIBE AUDIO
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

    const transcriptionResult = await submitTranscriptionJob(
      {
        audioUrl,
        speakersExpected: 2,
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

    const { extractCRMData } = await import('@/lib/openai');

    const extraction = await extractCRMData({
      transcript: transcriptionResult.text || '',
      utterances: transcriptionResult.utterances || [],
      speakerMapping: speakerMapping,
      customerName: call.customer_name || undefined,
      callType: call.call_type || undefined,
    });

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

    // Store core fields from extraction
    const coreFields = [
      { name: 'summary', value: extraction.summary, type: 'text' },
      { name: 'key_points', value: JSON.stringify(extraction.keyPoints), type: 'json' },
      { name: 'next_steps', value: JSON.stringify(extraction.nextSteps), type: 'json' },
      { name: 'pain_points', value: JSON.stringify(extraction.painPoints), type: 'json' },
      { name: 'requirements', value: JSON.stringify(extraction.requirements), type: 'json' },
      { name: 'budget', value: extraction.budget || null, type: 'text' },
      { name: 'timeline', value: extraction.timeline || null, type: 'text' },
      { name: 'decision_maker', value: extraction.decisionMaker || null, type: 'text' },
      { name: 'product_interest', value: JSON.stringify(extraction.productInterest), type: 'json' },
      { name: 'competitors_mentioned', value: JSON.stringify(extraction.competitorsMentioned), type: 'json' },
      { name: 'objections', value: JSON.stringify(extraction.objections), type: 'json' },
      { name: 'buying_signals', value: JSON.stringify(extraction.buyingSignals), type: 'json' },
      { name: 'call_outcome', value: extraction.callOutcome, type: 'select' },
      { name: 'qualification_score', value: extraction.qualificationScore.toString(), type: 'number' },
      { name: 'urgency', value: extraction.urgency, type: 'select' },
      { name: 'customer_company', value: (extraction.raw as any).customerCompany || null, type: 'text' },
      { name: 'industry', value: (extraction.raw as any).industry || null, type: 'text' },
      { name: 'company_size', value: (extraction.raw as any).companySize || null, type: 'text' },
      { name: 'current_solution', value: (extraction.raw as any).currentSolution || null, type: 'text' },
      { name: 'decision_process', value: (extraction.raw as any).decisionProcess || null, type: 'text' },
      { name: 'technical_requirements', value: JSON.stringify((extraction.raw as any).technicalRequirements || []), type: 'json' },
    ];

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

    await supabase
      .from('calls')
      .update({
        status: 'completed',
        processing_progress: 100,
        processing_message: 'All done! Your call is ready to review.',
        duration: transcriptionResult.audio_duration
          ? Math.round(transcriptionResult.audio_duration / 1000) // Convert ms to seconds
          : call.duration || null,
        duration_minutes: transcriptionResult.audio_duration
          ? Math.ceil(transcriptionResult.audio_duration / 1000 / 60) // Convert ms to minutes
          : null,
        customer_company: (extraction.raw as any).customerCompany || call.customer_company,
        next_steps: extraction.nextSteps?.join('\n') || null,
        sentiment_type: extraction.sentiment || null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', callId);

    console.log('[Process] ✅ Call updated - COMPLETE');
    console.log('[Process] ========================================');

    // Create notification
    await supabase.from('notifications').insert({
      user_id: call.user_id,
      notification_type: 'call_completed',
      title: 'Call processed successfully',
      message: `Your call with ${(extraction.raw as any).customerCompany || call.customer_name || 'customer'} is ready to review.`,
      link: `/calls/${callId}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Call processed successfully',
      },
      {
        headers: {
          'Connection': 'close', // Prevent chunked encoding issues
        },
      }
    );

  } catch (error) {
    console.error('[Process] ❌ ERROR:', error);

    const supabase = createAdminClient();

    await supabase
      .from('calls')
      .update({
        status: 'failed',
        assemblyai_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', callId);

    return NextResponse.json(
      {
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
