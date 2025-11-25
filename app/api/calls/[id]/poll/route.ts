// =====================================================
// TRANSCRIPTION POLLING ENDPOINT (Development Only)
// Use this in development since webhooks don't work on localhost
// In production, webhooks handle this automatically
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import {
  getTranscriptionStatus,
  mapSpeakersToRoles,
  calculateSentimentScore,
  extractInsights,
} from '@/lib/assemblyai';
import { AppUrls } from '@/lib/utils/urls';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;

    // Authenticate user
    const user = await requireAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Get call
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Check if transcription is in progress
    if (!call.assemblyai_transcript_id) {
      return NextResponse.json({
        status: call.status,
        message: 'No transcription in progress',
      });
    }

    // Poll AssemblyAI for status
    const transcript = await getTranscriptionStatus(call.assemblyai_transcript_id);

    console.log('Polling transcription status:', {
      callId,
      transcriptId: call.assemblyai_transcript_id,
      status: transcript.status,
    });

    // If still processing, return status
    if (transcript.status === 'queued' || transcript.status === 'processing') {
      return NextResponse.json({
        status: transcript.status,
        message: 'Transcription in progress...',
      });
    }

    // If completed, process the transcript
    if (transcript.status === 'completed') {
      console.log('Transcription completed, processing...');

      if (!transcript.text || !transcript.utterances) {
        throw new Error('Incomplete transcript data');
      }

      // Map speakers
      const speakerMapping = mapSpeakersToRoles(transcript.utterances);

      // Calculate sentiment
      const sentiment = calculateSentimentScore(transcript.utterances);

      // Calculate average confidence
      const avgConfidence =
        transcript.utterances.reduce((sum, u) => sum + u.confidence, 0) /
        transcript.utterances.length;

      // Store transcript
      await supabase.from('transcripts').upsert({
        call_id: call.id,
        full_text: transcript.text,
        utterances: transcript.utterances,
        words: transcript.words || null,
        chapters: transcript.chapters || null,
        entities: transcript.entities || null,
        speaker_mapping: speakerMapping,
        speakers_count: Object.keys(speakerMapping).length,
        average_confidence: avgConfidence,
        audio_duration_ms: transcript.audio_duration,
      });

      // Extract and store insights
      const insights = extractInsights(transcript.utterances);

      if (insights.length > 0) {
        await supabase.from('call_insights').insert(
          insights.map((insight) => ({
            call_id: call.id,
            insight_type: insight.type,
            text: insight.text,
            confidence: insight.confidence,
            timestamp_start: insight.timestamp_start,
            timestamp_end: insight.timestamp_end,
          }))
        );
      }

      // Update call status
      await supabase
        .from('calls')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          duration: transcript.audio_duration
            ? Math.round(transcript.audio_duration / 1000)
            : null,
          sentiment_type: sentiment.type,
          sentiment_score: sentiment.score,
        })
        .eq('id', call.id);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        notification_type: 'call_completed',
        title: 'Call transcription complete',
        message: `Your call with ${call.customer_name || 'customer'} has been transcribed.`,
        link: `/calls/${call.id}`,
        call_id: call.id,
      });

      // Record usage metrics
      const minutes = transcript.audio_duration
        ? transcript.audio_duration / 1000 / 60
        : 0;
      const cost_cents = Math.round(minutes * 1.5);

      await supabase.from('usage_metrics').insert([
        {
          user_id: user.id,
          organization_id: call.organization_id,
          metric_type: 'call_processed',
          metric_value: 1,
          call_id: call.id,
          cost_cents,
          metadata: {
            provider: 'assemblyai',
            duration_seconds: Math.round(transcript.audio_duration! / 1000),
          },
        },
        {
          user_id: user.id,
          organization_id: call.organization_id,
          metric_type: 'minutes_transcribed',
          metric_value: minutes,
          call_id: call.id,
          cost_cents,
          metadata: {
            provider: 'assemblyai',
          },
        },
      ]);

      // Phase 4: Trigger GPT-4o extraction automatically
      try {
        console.log('Triggering CRM extraction...');

        const extractionUrl = AppUrls.api.callExtract(call.id);

        // Trigger extraction in background (don't wait for response)
        fetch(extractionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }).catch((err) => {
          console.error('Failed to trigger extraction:', err);
        });

        console.log('Extraction triggered successfully');
      } catch (extractionTriggerError) {
        console.error('Error triggering extraction:', extractionTriggerError);
        // Don't fail the poll - extraction can be manually triggered
      }

      return NextResponse.json({
        status: 'completed',
        message: 'Transcription complete',
        sentiment: sentiment,
        duration: transcript.audio_duration,
      });
    }

    // If error
    if (transcript.status === 'error') {
      console.error('Transcription failed:', transcript.error);

      await supabase
        .from('calls')
        .update({
          status: 'failed',
          assemblyai_error: transcript.error || 'Transcription failed',
        })
        .eq('id', call.id);

      await supabase.from('notifications').insert({
        user_id: user.id,
        notification_type: 'call_failed',
        title: 'Call transcription failed',
        message: `Failed to transcribe your call: ${transcript.error || 'Unknown error'}`,
        link: `/calls/${call.id}`,
        call_id: call.id,
      });

      return NextResponse.json({
        status: 'error',
        error: transcript.error || 'Transcription failed',
      });
    }

    return NextResponse.json({
      status: transcript.status,
    });

  } catch (error) {
    console.error('Polling error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
