// =====================================================
// INNGEST FUNCTION: Process Transcription
// Handles complete transcription workflow with retries
// =====================================================

import { inngest } from '../client';
import { createAdminClient } from '@/lib/supabase/server';
import {
  getTranscriptionStatus,
  mapSpeakersToRoles,
  calculateSentimentScore,
  extractInsights,
} from '@/lib/assemblyai';
import { checkCallQuality, formatTriggerReason, calculateQualityScore } from '@/lib/quality/review-triggers';
import type { CallStatus } from '@/lib/types/approval';

export const processTranscription = inngest.createFunction(
  {
    id: 'process-transcription',
    name: 'Process Call Transcription',
    retries: 3, // Retry up to 3 times on failure
  },
  { event: 'call/uploaded' },
  async ({ event, step }) => {
    const { callId, audioUrl, trimStart, trimEnd } = event.data;

    console.log('[Inngest] Starting transcription job for call:', callId);

    // Step 1: Get call record
    const call = await step.run('get-call-record', async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (error || !data) {
        throw new Error(`Call ${callId} not found: ${error?.message}`);
      }

      return data;
    });

    // Step 2: Submit to AssemblyAI and wait for completion
    // The SDK automatically handles polling until the transcript is ready
    const transcript = await step.run('transcribe-audio', async () => {
      const { submitTranscriptionJob } = await import('@/lib/assemblyai');

      // Update call status to transcribing
      const supabase = createAdminClient();
      await supabase
        .from('calls')
        .update({
          status: 'transcribing',
          assemblyai_audio_url: audioUrl,
          processing_progress: 0,
          processing_message: 'Starting transcription...',
        })
        .eq('id', callId);

      console.log('[Inngest] Starting transcription (SDK will poll automatically)...');

      // The SDK's method waits until completion with progress tracking
      const result = await submitTranscriptionJob({
        audioUrl,
        speakersExpected: 2,
        webhookUrl: undefined,
        trimStart: trimStart,
        trimEnd: trimEnd,
      }, async (progress) => {
        // Update call record with real-time progress
        await supabase
          .from('calls')
          .update({
            processing_progress: progress.percent || 0,
            processing_message: progress.message,
          })
          .eq('id', callId);

        console.log(`[Inngest] 📊 Transcription progress: ${progress.percent}% - ${progress.message}`);
      });

      console.log('[Inngest] Transcription complete:', {
        id: result.id,
        duration: result.audio_duration,
        textLength: result.text?.length || 0,
        utterancesCount: result.utterances?.length || 0,
      });

      // Store the transcript ID and clear progress indicators
      await supabase
        .from('calls')
        .update({
          assemblyai_transcript_id: result.id,
          processing_progress: 100,
          processing_message: 'Transcription complete',
        })
        .eq('id', callId);

      return result;
    });

    // Step 3: Store transcript in database
    const transcriptData = await step.run('store-transcript', async () => {
      const supabase = createAdminClient();

      // Map speakers to roles
      const utterances = transcript.utterances || [];
      const speakerMapping = mapSpeakersToRoles(utterances as any);

      // Calculate sentiment
      const sentiment = calculateSentimentScore(utterances as any);

      // Calculate average confidence
      const avgConfidence = utterances.length > 0
        ? utterances.reduce((sum, u) => sum + u.confidence, 0) / utterances.length
        : 0;

      // Store transcript
      const { data: storedTranscript, error: transcriptError } = await supabase
        .from('transcripts')
        .upsert({
          call_id: callId,
          full_text: transcript.text,
          utterances: utterances,
          words: transcript.words || null,
          chapters: transcript.chapters || null,
          entities: transcript.entities || null,
          speaker_mapping: speakerMapping,
          speakers_count: Object.keys(speakerMapping).length,
          confidence_score: avgConfidence,
          sentiment_overall: sentiment.type,
          word_count: transcript.words?.length || 0,
          audio_duration_ms: transcript.audio_duration,
        })
        .select()
        .single();

      if (transcriptError) {
        console.error('Error storing transcript:', transcriptError);
        throw transcriptError;
      }

      // Extract and store insights
      const insights = extractInsights(utterances as any);

      if (insights.length > 0) {
        await supabase.from('call_insights').insert(
          insights.map((insight) => ({
            call_id: callId,
            insight_type: insight.type,
            text: insight.text,
            confidence_score: insight.confidence,
            timestamp_start: insight.timestamp_start,
            timestamp_end: insight.timestamp_end,
          }))
        );
      }

      // Update call status to 'transcribed' (NOT completed - needs review first)
      // Store duration in MINUTES for usage tracking
      const durationMinutes = transcript.audio_duration
        ? Math.round(transcript.audio_duration / 1000 / 60)
        : null;

      await supabase
        .from('calls')
        .update({
          status: 'transcribed' as CallStatus,
          processed_at: new Date().toISOString(),
          duration: durationMinutes, // Store as minutes for usage tracking
          sentiment_type: sentiment.type,
          sentiment_score: sentiment.score,
          transcription_quality_score: Math.round(avgConfidence * 100),
        })
        .eq('id', callId);

      // Record usage metrics
      const minutes = transcript.audio_duration
        ? transcript.audio_duration / 1000 / 60
        : 0;
      const cost_cents = Math.round(minutes * 1.5);

      await supabase.from('usage_metrics').insert([
        {
          user_id: call.user_id,
          organization_id: call.organization_id,
          metric_type: 'call_processed',
          metric_value: 1,
          call_id: callId,
          cost_cents,
          metadata: {
            provider: 'assemblyai',
            duration_seconds: Math.round(transcript.audio_duration! / 1000),
          },
        },
        {
          user_id: call.user_id,
          organization_id: call.organization_id,
          metric_type: 'minutes_transcribed',
          metric_value: minutes,
          call_id: callId,
          cost_cents,
          metadata: {
            provider: 'assemblyai',
          },
        },
      ]);

      console.log('[Inngest] Transcription stored successfully');

      return {
        sentiment,
        insightsCount: insights.length,
        avgConfidence,
        storedTranscript,
      };
    });

    // Step 4: Perform quality check to determine if review is needed
    const qualityCheck = await step.run('quality-check', async () => {
      console.log('[Inngest] Performing quality check');

      // Run quality check (always returns a result, doesn't need transcript fields yet)
      const checkResult = checkCallQuality({
        transcript: {
          confidence_score: transcriptData.avgConfidence,
          sentiment_overall: transcriptData.sentiment.type,
        },
        fields: [], // No fields yet - transcription only
        extraction: {}, // No extraction yet
        requiredFields: [], // No required fields for transcription stage
      });

      const supabase = createAdminClient();

      // Determine if review is required based on transcription quality
      const requiresReview = checkResult.requiresReview;
      const triggerReason = formatTriggerReason(checkResult.triggerReasons);

      // Update call with quality check results
      await supabase
        .from('calls')
        .update({
          requires_review: requiresReview,
          review_trigger_reason: requiresReview ? triggerReason : null,
          approval_status: requiresReview ? 'pending' : null,
          auto_approved: !requiresReview,
        })
        .eq('id', callId);

      console.log(`[Inngest] Quality check complete - Requires review: ${requiresReview}`);
      if (requiresReview) {
        console.log(`[Inngest] Review trigger reason: ${triggerReason}`);
      }

      return {
        requiresReview,
        triggerReason,
        qualityScore: calculateQualityScore(checkResult),
      };
    });

    // Step 5: Send notification
    await step.run('send-notification', async () => {
      const supabase = createAdminClient();

      // Different notification based on whether review is required
      if (qualityCheck.requiresReview) {
        await supabase.from('notifications').insert({
          user_id: call.user_id,
          notification_type: 'call_needs_review',
          title: 'Call ready for review',
          message: `Your call is ready for review. ${qualityCheck.triggerReason}`,
          link: `/calls/${callId}`,
          call_id: callId,
        });

        console.log('[Inngest] Review notification sent');
      } else {
        await supabase.from('notifications').insert({
          user_id: call.user_id,
          notification_type: 'call_transcribed',
          title: 'Call transcription complete',
          message: `Your call has been transcribed and is ready for extraction.`,
          link: `/calls/${callId}`,
          call_id: callId,
        });

        console.log('[Inngest] Transcription notification sent');
      }
    });

    // Step 6: Auto-trigger extraction if no review needed
    const extractionTriggered = await step.run('maybe-trigger-extraction', async () => {
      if (!qualityCheck.requiresReview) {
        // Auto-approve and trigger extraction
        const supabase = createAdminClient();

        await supabase
          .from('calls')
          .update({
            approval_status: 'approved',
            auto_approved: true,
          })
          .eq('id', callId);

        await inngest.send({
          name: 'call/approved',
          data: {
            callId,
            userId: call.user_id,
            transcriptId: transcript.id,
            autoApproved: true,
          },
        });

        console.log('[Inngest] Auto-approved and extraction triggered');
        return true;
      } else {
        console.log('[Inngest] Awaiting manual approval before extraction');
        return false;
      }
    });

    console.log('[Inngest] Transcription job completed successfully');

    return {
      success: true,
      callId,
      transcriptId: transcript.id,
      duration: transcript.audio_duration,
      requiresReview: qualityCheck.requiresReview,
      triggerReason: qualityCheck.triggerReason,
      qualityScore: qualityCheck.qualityScore,
      extractionTriggered,
    };
  }
);
