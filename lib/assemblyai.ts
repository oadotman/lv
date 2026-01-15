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
  trimStart?: number; // Start time in seconds
  trimEnd?: number; // End time in seconds
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
 * Submit audio file for transcription with progress tracking
 * Provides callback for progress updates and comprehensive error logging
 */
export async function submitTranscriptionJob(
  config: TranscriptionConfig,
  onProgress?: (progress: { status: string; percent?: number; message: string }) => Promise<void>
): Promise<TranscriptionResult> {
  const startTime = Date.now();

  try {
    console.log('[AssemblyAI] ========================================');
    console.log('[AssemblyAI] Starting transcription job');
    console.log('[AssemblyAI] Audio URL:', config.audioUrl);
    console.log('[AssemblyAI] Speakers expected:', config.speakersExpected || 2);
    console.log('[AssemblyAI] Trim start:', config.trimStart || 'none');
    console.log('[AssemblyAI] Trim end:', config.trimEnd || 'none');
    console.log('[AssemblyAI] ========================================');

    const params: any = {
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

      // Boost freight broker terms for better accuracy
      word_boost: config.wordBoost || [
        // Core freight broker terminology
        'load',
        'lane',
        'rate',
        'haul',
        'deadhead',
        'backhaul',
        'linehaul',
        'spot rate',
        'contract rate',
        'load board',
        'freight',

        // Equipment types
        'dry van',
        'reefer',
        'flatbed',
        'step deck',
        'lowboy',
        'conestoga',
        'tanker',
        'hopper',
        'RGN',
        'power only',
        'hotshot',
        'box truck',

        // Locations and directions
        'shipper',
        'consignee',
        'origin',
        'destination',
        'pickup',
        'delivery',
        'dock',
        'warehouse',

        // Documentation
        'BOL',
        'bill of lading',
        'rate con',
        'rate confirmation',
        'POD',
        'proof of delivery',
        'setup packet',
        'carrier packet',

        // Industry terms
        'MC number',
        'DOT number',
        'FMCSA',
        'broker',
        'carrier',
        'dispatcher',
        'driver',
        'owner operator',
        'detention',
        'layover',
        'lumper',
        'TONU',
        'accessorials',

        // Common phrases
        "what's your rate",
        'when can you pick up',
        'ETA',
        'check call',
        'all in',
        'fuel surcharge',
        'miles out',
        'empty now',
        'can you cover',
      ],
      boost_param: 'high' as const,

      // Webhook (if provided)
      webhook_url: config.webhookUrl,
    };

    // Add trim parameters if provided (convert seconds to milliseconds)
    if (config.trimStart !== undefined && config.trimStart > 0) {
      params.audio_start_from = Math.floor(config.trimStart * 1000);
      console.log(`[AssemblyAI] ✂️  Trimming audio from ${config.trimStart}s (${params.audio_start_from}ms)`);
    }

    if (config.trimEnd !== undefined && config.trimEnd > 0) {
      params.audio_end_at = Math.floor(config.trimEnd * 1000);
      console.log(`[AssemblyAI] ✂️  Trimming audio to ${config.trimEnd}s (${params.audio_end_at}ms)`);
    }

    // Report initial progress
    if (onProgress) {
      await onProgress({
        status: 'queued',
        percent: 0,
        message: 'Submitting audio to AssemblyAI...'
      });
    }

    console.log('[AssemblyAI] 📤 Submitting to AssemblyAI API...');

    // Submit and wait for completion with manual polling to track progress
    const client = getAssemblyAIClient();

    // First, submit the transcription
    const submittedTranscript = await client.transcripts.submit(params);

    console.log('[AssemblyAI] ✅ Submitted successfully');
    console.log('[AssemblyAI] Transcript ID:', submittedTranscript.id);
    console.log('[AssemblyAI] Initial status:', submittedTranscript.status);

    if (onProgress) {
      await onProgress({
        status: 'queued',
        percent: 10,
        message: 'Queued for transcription...'
      });
    }

    // Now poll for completion with progress tracking
    console.log('[AssemblyAI] 🔄 Polling for completion...');
    let pollCount = 0;
    let lastStatus = '';
    const maxPolls = 300; // 300 * 3 seconds = 15 minutes max
    const pollingInterval = 3000; // 3 seconds

    // Custom polling with progress updates
    let transcript: any;
    while (pollCount < maxPolls) {
      pollCount++;

      // Get current status
      transcript = await client.transcripts.get(submittedTranscript.id);

      // Calculate estimated progress based on time and status
      let estimatedPercent = 10;
      const elapsedSeconds = (pollCount * pollingInterval) / 1000;

      if (transcript.status === 'processing') {
        // Estimate progress based on elapsed time
        // Typical transcription takes 20-30% of audio duration
        // Assume average 3 minute audio takes ~45 seconds to process
        if (elapsedSeconds < 10) {
          estimatedPercent = 15 + (elapsedSeconds * 2); // 15-35%
        } else if (elapsedSeconds < 20) {
          estimatedPercent = 35 + ((elapsedSeconds - 10) * 3); // 35-65%
        } else if (elapsedSeconds < 30) {
          estimatedPercent = 65 + ((elapsedSeconds - 20) * 2); // 65-85%
        } else {
          estimatedPercent = Math.min(85 + ((elapsedSeconds - 30) * 0.5), 95); // 85-95%
        }
      } else if (transcript.status === 'queued') {
        estimatedPercent = Math.min(10 + (elapsedSeconds * 0.5), 15); // 10-15%
      }

      // Report progress if status changed or every 3rd poll
      if (transcript.status !== lastStatus || pollCount % 3 === 0) {
        console.log(`[AssemblyAI] Status: ${transcript.status}, Poll #${pollCount}, Progress: ${estimatedPercent}%`);

        if (onProgress) {
          const messages: Record<string, string> = {
            'queued': 'Waiting in queue...',
            'processing': pollCount < 5 ? 'Analyzing audio quality...' :
                         pollCount < 10 ? 'Detecting speakers...' :
                         pollCount < 15 ? 'Transcribing conversation...' :
                         pollCount < 20 ? 'Processing speech patterns...' :
                         'Finalizing transcript...'
          };

          await onProgress({
            status: transcript.status,
            percent: Math.round(estimatedPercent),
            message: messages[transcript.status] || 'Processing...'
          });
        }

        lastStatus = transcript.status;
      }

      // Check if completed
      if (transcript.status === 'completed' || transcript.status === 'error') {
        break;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }

    if (pollCount >= maxPolls) {
      throw new Error('Transcription timed out after 15 minutes');
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('[AssemblyAI] ========================================');
    console.log('[AssemblyAI] ✅ Transcription completed!');
    console.log('[AssemblyAI] Status:', transcript.status);
    console.log('[AssemblyAI] Duration:', transcript.audio_duration, 'seconds');
    console.log('[AssemblyAI] Text length:', transcript.text?.length || 0, 'characters');
    console.log('[AssemblyAI] Utterances:', transcript.utterances?.length || 0);
    console.log('[AssemblyAI] Words:', transcript.words?.length || 0);
    console.log('[AssemblyAI] Elapsed time:', elapsedTime, 'seconds');
    console.log('[AssemblyAI] ========================================');

    // Report completion
    if (onProgress) {
      await onProgress({
        status: 'completed',
        percent: 100,
        message: 'Transcription complete!'
      });
    }

    // Check for errors
    if (transcript.status === 'error') {
      console.error('[AssemblyAI] ❌ ERROR: Transcription failed');
      console.error('[AssemblyAI] Error message:', transcript.error);
      throw new Error(`AssemblyAI transcription failed: ${transcript.error || 'Unknown error'}`);
    }

    // Validate we have the data we need
    if (!transcript.text) {
      console.error('[AssemblyAI] ❌ ERROR: No text returned');
      console.error('[AssemblyAI] Transcript object:', JSON.stringify(transcript, null, 2));
      throw new Error('Transcription completed but no text was returned');
    }

    if (!transcript.utterances || transcript.utterances.length === 0) {
      console.warn('[AssemblyAI] ⚠️  WARNING: No utterances returned (speaker diarization may have failed)');
    }

    console.log('[AssemblyAI] ✅ Validation passed - returning transcript data');

    // Return the complete transcript in our expected format
    return {
      id: transcript.id,
      status: transcript.status as any,
      text: transcript.text,
      utterances: transcript.utterances as any,
      words: transcript.words as any,
      chapters: transcript.chapters as any,
      entities: transcript.entities as any,
      audio_duration: transcript.audio_duration ?? undefined,
      error: transcript.error || undefined,
    };
  } catch (error) {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.error('[AssemblyAI] ========================================');
    console.error('[AssemblyAI] ❌ TRANSCRIPTION ERROR');
    console.error('[AssemblyAI] Elapsed time:', elapsedTime, 'seconds');
    console.error('[AssemblyAI] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[AssemblyAI] Error message:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('[AssemblyAI] Stack trace:', error.stack);
    }

    console.error('[AssemblyAI] Full error object:', JSON.stringify(error, null, 2));
    console.error('[AssemblyAI] Config used:', JSON.stringify({
      audioUrl: config.audioUrl,
      speakersExpected: config.speakersExpected,
      trimStart: config.trimStart,
      trimEnd: config.trimEnd,
    }, null, 2));
    console.error('[AssemblyAI] ========================================');

    // Report error to progress callback
    if (onProgress) {
      await onProgress({
        status: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

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
 * Wrapper function for compatibility - transcribes audio with AssemblyAI
 */
export async function transcribeWithAssemblyAI(audioUrl: string) {
  return submitTranscriptionJob({
    audioUrl,
    speakersExpected: 2
  });
}

/**
 * Helper: Map AssemblyAI speakers to roles using intelligent detection
 * Analyzes language patterns to identify: Broker, Shipper, Carrier/Dispatcher, Driver
 */
export function mapSpeakersToRoles(
  utterances: AssemblyAIUtterance[]
): Record<string, string> {
  const speakers = [...new Set(utterances.map((u) => u.speaker))];
  const mapping: Record<string, string> = {};

  // If only one speaker, assume it's the broker (user)
  if (speakers.length === 1) {
    mapping[speakers[0]] = 'Broker';
    return mapping;
  }

  // Analyze speaking patterns to identify roles
  const speakerScores: Record<string, {
    brokerScore: number;
    shipperScore: number;
    carrierScore: number;
    driverScore: number;
    wordCount: number
  }> = {};

  // Broker indicators (the user/customer - typically asking about rates and availability)
  const brokerIndicators = [
    'what\'s your rate',
    'i can offer',
    'i have a load',
    'we have a load',
    'our customer',
    'our shipper',
    'rate confirmation',
    'rate con',
    'i\'ll send you',
    'what equipment',
    'when can you pick up',
    'can you cover',
    'are you empty',
    'where are you now',
    'check call',
    'need you to',
    'bol number',
    'reference number',
    'detention',
    'layover',
    'fuel surcharge',
    'all in rate',
    'linehaul',
    'accessorials',
    'setup packet',
    'carrier packet',
    'insurance certificate',
    'w9',
    'authority',
    'let me check',
    'i\'ll confirm',
    'my customer',
    'the shipper',
    'the consignee',
    'i\'ll book',
    'let me book'
  ];

  // Shipper indicators (shipping company representatives)
  const shipperIndicators = [
    'i need to ship',
    'we need to move',
    'our facility',
    'our warehouse',
    'our dock',
    'pickup appointment',
    'delivery appointment',
    'loading time',
    'unloading',
    'commodity',
    'product',
    'pallets',
    'weight',
    'our receiver',
    'ship date',
    'ready to load',
    'needs to deliver',
    'our plant',
    'our distribution',
    'bill to',
    'purchase order',
    'vendor',
    'supplier'
  ];

  // Carrier/Dispatcher indicators (trucking company representatives)
  const carrierDispatcherIndicators = [
    'i\'m empty',
    'i\'m available',
    'my trucks',
    'our trucks',
    'my drivers',
    'our drivers',
    'my rate is',
    'i charge',
    'we charge',
    'our rate',
    'mc number is',
    'my mc',
    'our mc',
    'dot number',
    'my company',
    'our fleet',
    'we run',
    'our lanes',
    'our equipment',
    'i can cover',
    'we can cover',
    'i\'ll dispatch',
    'send driver'
  ];

  // Driver indicators (truck drivers, usually on check calls)
  const driverIndicators = [
    'i\'m at',
    'miles out',
    'eta',
    'just loaded',
    'just delivered',
    'breakdown',
    'traffic',
    'weather delay',
    'dot inspection',
    'weigh station',
    'truck stop',
    'i\'m driving',
    'my truck',
    'fuel stop',
    'rest break',
    'hours of service',
    'eld',
    'i\'m rolling',
    'i\'m empty now',
    'heading to',
    'on my way',
    'should be there'
  ];

  // Analyze each speaker's utterances
  speakers.forEach(speaker => {
    const speakerUtterances = utterances.filter(u => u.speaker === speaker);
    const allText = speakerUtterances.map(u => u.text.toLowerCase()).join(' ');
    const wordCount = allText.split(' ').length;

    let brokerScore = 0;
    let shipperScore = 0;
    let carrierScore = 0;
    let driverScore = 0;

    // Count broker indicators
    brokerIndicators.forEach(phrase => {
      if (allText.includes(phrase)) {
        brokerScore += 2;
      }
    });

    // Count shipper indicators
    shipperIndicators.forEach(phrase => {
      if (allText.includes(phrase)) {
        shipperScore += 2;
      }
    });

    // Count carrier/dispatcher indicators
    carrierDispatcherIndicators.forEach(phrase => {
      if (allText.includes(phrase)) {
        carrierScore += 2;
      }
    });

    // Count driver indicators
    driverIndicators.forEach(phrase => {
      if (allText.includes(phrase)) {
        driverScore += 3; // Higher weight for driver phrases as they're more specific
      }
    });

    // Check who speaks first (often the broker initiates)
    if (utterances[0]?.speaker === speaker) {
      brokerScore += 1;
    }

    // Check who speaks more (brokers often dominate conversation)
    const speakerUtteranceRatio = speakerUtterances.length / utterances.length;
    if (speakerUtteranceRatio > 0.55) {
      brokerScore += 1;
    }

    // Store scores
    speakerScores[speaker] = {
      brokerScore,
      shipperScore,
      carrierScore,
      driverScore,
      wordCount
    };
  });

  // Assign roles based on highest score for each speaker
  Object.entries(speakerScores).forEach(([speaker, scores]) => {
    const roleScores = [
      { role: 'Broker', score: scores.brokerScore },
      { role: 'Shipper', score: scores.shipperScore },
      { role: 'Carrier', score: scores.carrierScore },
      { role: 'Driver', score: scores.driverScore }
    ];

    // Sort by score to find the most likely role
    roleScores.sort((a, b) => b.score - a.score);

    // Assign the highest scoring role
    let assignedRole = roleScores[0].role;

    // Special case: if carrier and driver scores are close, prefer Driver for check calls
    if (roleScores[0].role === 'Carrier' && scores.driverScore > scores.carrierScore * 0.8) {
      // Check if this looks more like a driver (shorter utterances, status updates)
      const avgUtteranceLength = scores.wordCount / utterances.filter(u => u.speaker === speaker).length;
      if (avgUtteranceLength < 20) {
        assignedRole = 'Driver';
      }
    }

    // If scores are all very low, default based on position
    if (roleScores[0].score < 3) {
      const speakerIndex = speakers.indexOf(speaker);
      if (speakerIndex === 0) {
        assignedRole = 'Broker'; // First speaker often the broker
      } else {
        assignedRole = 'Customer'; // Generic fallback
      }
    }

    mapping[speaker] = assignedRole;
  });

  // Ensure we have at least one broker (the user)
  const hasBroker = Object.values(mapping).includes('Broker');
  if (!hasBroker && speakers.length > 0) {
    // Find the speaker who speaks most (likely the broker)
    const speakerCounts = speakers.map(s => ({
      speaker: s,
      count: utterances.filter(u => u.speaker === s).length
    })).sort((a, b) => b.count - a.count);

    mapping[speakerCounts[0].speaker] = 'Broker';
  }

  // Log the detection for debugging
  console.log('[Speaker Detection] Mapping:', mapping);
  console.log('[Speaker Detection] Scores:', speakerScores);

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
