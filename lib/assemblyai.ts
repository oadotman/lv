// =====================================================
// ASSEMBLYAI CLIENT UTILITY
// Handles audio transcription with speaker diarization
// =====================================================

import { AssemblyAI } from 'assemblyai';

// Lazy-loaded client to avoid build-time initialization
let assemblyAIClientInstance: AssemblyAI | null = null;

function getAssemblyAIClient(): AssemblyAI {
  if (!assemblyAIClientInstance) {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      throw new Error('ASSEMBLYAI_API_KEY environment variable is required');
    }
    assemblyAIClientInstance = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY,
    });
  }
  return assemblyAIClientInstance;
}

// Export for backward compatibility
export const assemblyAIClient = new Proxy({} as AssemblyAI, {
  get: (target, prop) => {
    const client = getAssemblyAIClient();
    return (client as any)[prop];
  }
});

// =====================================================
// TYPES
// =====================================================

export interface TranscriptionConfig {
  audioUrl: string;
  speakersExpected?: number;
  wordBoost?: string[];
  webhookUrl?: string;
}

export interface TranscriptionResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  utterances?: AssemblyAIUtterance[];
  words?: AssemblyAIWord[];
  chapters?: AssemblyAIChapter[];
  entities?: AssemblyAIEntity[];
  audio_duration?: number;
  error?: string;
}

export interface AssemblyAIUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sentiment_confidence?: number;
}

export interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  speaker: string;
  confidence: number;
}

export interface AssemblyAIChapter {
  gist: string;
  headline: string;
  summary: string;
  start: number;
  end: number;
}

export interface AssemblyAIEntity {
  text: string;
  entity_type: string;
  start: number;
  end: number;
}

// =====================================================
// FUNCTIONS
// =====================================================

/**
 * Submit audio file for transcription
 * Returns transcript ID for polling/webhook
 */
export async function submitTranscriptionJob(
  config: TranscriptionConfig
): Promise<{ transcriptId: string; status: string }> {
  try {
    console.log('Submitting transcription job:', {
      audioUrl: config.audioUrl,
      speakersExpected: config.speakersExpected || 2,
    });

    const params = {
      audio: config.audioUrl,

      // Use best speech model
      speech_model: 'best' as const,

      // Enable speaker diarization
      speaker_labels: true,
      speakers_expected: config.speakersExpected || 2,

      // Enable sentiment analysis
      sentiment_analysis: true,

      // Enable auto chapters
      auto_chapters: true,

      // Enable entity detection
      entity_detection: true,

      // Formatting
      punctuate: true,
      format_text: true,

      // Language
      language_code: 'en' as const,

      // Boost CRM/sales terms for better accuracy
      word_boost: config.wordBoost || [
        'CRM',
        'pipeline',
        'discovery',
        'HubSpot',
        'Salesforce',
        'quota',
        'ROI',
        'implementation',
        'onboarding',
        'integration',
        'qualified',
        'prospect',
        'demo',
      ],
      boost_param: 'high' as const,

      // Webhook (if provided)
      webhook_url: config.webhookUrl,
    };

    const transcript = await assemblyAIClient.transcripts.transcribe(params);

    console.log('Transcription job submitted:', {
      id: transcript.id,
      status: transcript.status,
    });

    return {
      transcriptId: transcript.id,
      status: transcript.status,
    };
  } catch (error) {
    console.error('AssemblyAI transcription error:', error);
    throw error;
  }
}

/**
 * Get transcription status and results
 * Poll this endpoint until status is 'completed' or 'error'
 */
export async function getTranscriptionStatus(
  transcriptId: string
): Promise<TranscriptionResult> {
  try {
    const transcript = await assemblyAIClient.transcripts.get(transcriptId);

    return {
      id: transcript.id,
      status: transcript.status as any,
      text: transcript.text || undefined,
      utterances: transcript.utterances as any,
      words: transcript.words as any,
      chapters: transcript.chapters as any,
      entities: transcript.entities as any,
      audio_duration: transcript.audio_duration ?? undefined,
      error: transcript.error || undefined,
    };
  } catch (error) {
    console.error('AssemblyAI get status error:', error);
    throw error;
  }
}

/**
 * Delete transcript from AssemblyAI
 * Use this to clean up after processing
 */
export async function deleteTranscript(transcriptId: string): Promise<void> {
  try {
    await assemblyAIClient.transcripts.delete(transcriptId);
    console.log('Transcript deleted from AssemblyAI:', transcriptId);
  } catch (error) {
    console.error('Error deleting transcript:', error);
    // Don't throw - deletion is not critical
  }
}

/**
 * Helper: Map AssemblyAI speakers to roles
 * Assumes Speaker A = Sales Rep, Speaker B = Prospect
 */
export function mapSpeakersToRoles(
  utterances: AssemblyAIUtterance[]
): Record<string, string> {
  const speakers = [...new Set(utterances.map((u) => u.speaker))];

  const mapping: Record<string, string> = {};

  if (speakers.length >= 1) {
    mapping[speakers[0]] = 'rep';
  }

  if (speakers.length >= 2) {
    mapping[speakers[1]] = 'prospect';
  }

  if (speakers.length >= 3) {
    speakers.slice(2).forEach((speaker, idx) => {
      mapping[speaker] = `participant_${idx + 1}`;
    });
  }

  return mapping;
}

/**
 * Helper: Calculate overall sentiment score (0-100)
 */
export function calculateSentimentScore(
  utterances: AssemblyAIUtterance[]
): { score: number; type: 'positive' | 'neutral' | 'negative' } {
  if (!utterances || utterances.length === 0) {
    return { score: 50, type: 'neutral' };
  }

  const sentiments = utterances.map((u) => u.sentiment || 'NEUTRAL');

  const positiveCount = sentiments.filter((s) => s === 'POSITIVE').length;
  const neutralCount = sentiments.filter((s) => s === 'NEUTRAL').length;
  const negativeCount = sentiments.filter((s) => s === 'NEGATIVE').length;
  const total = sentiments.length;

  // Weight: positive = 100, neutral = 50, negative = 0
  const score = Math.round(
    (positiveCount * 100 + neutralCount * 50 + negativeCount * 0) / total
  );

  let type: 'positive' | 'neutral' | 'negative';
  if (score >= 70) {
    type = 'positive';
  } else if (score >= 40) {
    type = 'neutral';
  } else {
    type = 'negative';
  }

  return { score, type };
}

/**
 * Helper: Extract insights from transcript
 * Returns pain points, action items, etc.
 */
export function extractInsights(utterances: AssemblyAIUtterance[]): {
  type: 'pain_point' | 'action_item';
  text: string;
  confidence: number;
  timestamp_start: number;
  timestamp_end: number;
}[] {
  const insights: {
    type: 'pain_point' | 'action_item';
    text: string;
    confidence: number;
    timestamp_start: number;
    timestamp_end: number;
  }[] = [];

  utterances.forEach((utterance) => {
    // Extract pain points from negative sentiment
    if (
      utterance.sentiment === 'NEGATIVE' &&
      utterance.confidence > 0.7
    ) {
      insights.push({
        type: 'pain_point',
        text: utterance.text,
        confidence: utterance.confidence,
        timestamp_start: utterance.start,
        timestamp_end: utterance.end,
      });
    }

    // Extract action items from phrases with future tense
    const actionPhrases = [
      "i'll",
      'will',
      'going to',
      'plan to',
      'next step',
      'follow up',
      'send you',
    ];

    const lowerText = utterance.text.toLowerCase();
    const hasActionPhrase = actionPhrases.some((phrase) =>
      lowerText.includes(phrase)
    );

    if (hasActionPhrase && utterance.confidence > 0.7) {
      insights.push({
        type: 'action_item',
        text: utterance.text,
        confidence: utterance.confidence,
        timestamp_start: utterance.start,
        timestamp_end: utterance.end,
      });
    }
  });

  return insights;
}

/**
 * Helper: Format duration from milliseconds to MM:SS
 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
