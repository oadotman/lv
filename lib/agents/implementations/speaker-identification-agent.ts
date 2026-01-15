/**
 * Speaker Identification Agent - Identifies and maps speakers to their roles
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, SpeakerOutput, SpeakerRole } from '../types';

export class SpeakerIdentificationAgent extends BaseAgent<void, SpeakerOutput> {
  name = 'speaker_identification';
  version = '1.0.0';
  description = 'Speaker role identification and mapping';
  dependencies = ['classification']; // Needs classification to determine context

  constructor() {
    super({
      timeout: 10000, // 10 seconds
      critical: false, // Can use defaults if fails
      parallel: true,  // Can run in parallel with other foundation agents
      retryOnFailure: true
    });
  }

  async execute(context: AgentContextData): Promise<SpeakerOutput> {
    this.log('Starting speaker identification');

    const classification = context.getAgentOutput<any>('classification');
    const callType = classification?.primaryType || 'unknown';

    // Build prompt
    const prompt = this.getPrompt(context);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.3,
      'gpt-4o-mini'
    );

    // Parse and validate
    const output = this.parseResponse(response, context);

    this.log(`Identified ${output.speakers.size} speakers, broker: ${output.brokerSpeakerId}`);

    return output;
  }

  getPrompt(context: AgentContextData): string {
    const utterances = context.utterances.slice(0, 30); // First 30 for speaker ID
    const classification = context.getAgentOutput<any>('classification');

    const utteranceText = utterances.map((u, idx) =>
      `[${u.speaker}] ${u.text.substring(0, 200)}`
    ).join('\n');

    return `Identify the role of each speaker in this freight broker call.

CALL TYPE: ${classification?.primaryType || 'unknown'}

UTTERANCES:
${utteranceText}

SPEAKER IDENTIFICATION TASK:
Analyze the conversation and determine who is the broker vs the customer/carrier.

ROLE INDICATORS:

BROKER indicators:
- "What's your MC number?"
- "I can offer..."
- "Let me check our board"
- "I have a load..."
- "What's your rate?"
- Company/dispatcher language

CARRIER indicators:
- Provides MC/DOT number
- "I have trucks available"
- "My rate is..."
- "I can pick up..."
- Driver/equipment details

SHIPPER indicators:
- "I need to ship..."
- "Our facility..."
- "Pickup is at our warehouse"
- Product/commodity owner language

DRIVER indicators:
- "I'm driving..."
- "I'm at the pickup"
- First-person operational language
- References to their truck directly

Extract:
{
  "speakers": {
    "A": {
      "role": "broker|carrier|shipper|driver|dispatcher|unknown",
      "confidence": 0.0-1.0,
      "name": "Name if mentioned",
      "company": "Company if mentioned",
      "indicators": ["key phrases that indicate role"]
    },
    "B": {
      "role": "...",
      "confidence": 0.0-1.0,
      "name": "...",
      "company": "...",
      "indicators": [...]
    }
    // ... for each speaker
  },
  "brokerSpeakerId": "A|B|etc",
  "primaryCustomerId": "A|B|etc",
  "conversationDynamics": "Description of who's calling whom and why"
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert speaker identification system for LoadVoice, specializing in freight broker calls.
Your job is to accurately identify who is the broker vs the customer (carrier/shipper) in the conversation.
When analyzing the conversation, consider the context of the call to make accurate determinations.
For carrier calls, the customer is the carrier. For shipper calls, the customer is the shipper.
Return valid JSON without any markdown formatting.`;
  }

  private parseResponse(response: any, context: AgentContextData): SpeakerOutput {
    const speakers = new Map<string, SpeakerRole>();

    // Parse speaker data
    if (response.speakers && typeof response.speakers === 'object') {
      for (const [speakerId, speakerData] of Object.entries(response.speakers)) {
        const data = speakerData as any;

        // Validate and clean role
        const validRoles = ['broker', 'carrier', 'shipper', 'driver', 'dispatcher', 'unknown'];
        let role = data.role || 'unknown';
        if (!validRoles.includes(role)) {
          role = 'unknown';
        }

        speakers.set(speakerId, {
          role: role as SpeakerRole['role'],
          confidence: this.normalizeConfidence(data.confidence),
          name: data.name || undefined,
          company: data.company || undefined
        });
      }
    }

    // Ensure we have at least basic speaker mapping
    if (speakers.size === 0) {
      // Default to two speakers if none identified
      speakers.set('A', {
        role: 'broker',
        confidence: 0.3
      });
      speakers.set('B', {
        role: 'unknown',
        confidence: 0.3
      });
    }

    // Determine broker speaker
    let brokerSpeakerId = response.brokerSpeakerId;
    if (!brokerSpeakerId) {
      // Find speaker with broker role
      for (const [id, role] of speakers.entries()) {
        if (role.role === 'broker') {
          brokerSpeakerId = id;
          break;
        }
      }
      // Default to first speaker if no broker found
      if (!brokerSpeakerId) {
        brokerSpeakerId = speakers.keys().next().value;
      }
    }

    // Calculate overall confidence
    const avgConfidence = Array.from(speakers.values())
      .reduce((sum, s) => sum + s.confidence, 0) / speakers.size;

    const output: SpeakerOutput = {
      speakers,
      primarySpeaker: response.primaryCustomerId || brokerSpeakerId,
      brokerSpeakerId,
      confidence: this.calculateConfidence({
        speakerIdentification: avgConfidence,
        roleClarity: this.assessRoleClarity(speakers),
        contextAlignment: this.assessContextAlignment(context, speakers)
      })
    };

    // Add processing notes for low confidence
    if (output.confidence.value < 0.5) {
      output.processingNotes = ['Low confidence in speaker identification'];
    }

    return output;
  }

  private normalizeConfidence(value: any): number {
    const conf = parseFloat(value) || 0.5;
    return Math.max(0, Math.min(1, conf));
  }

  private assessRoleClarity(speakers: Map<string, SpeakerRole>): number {
    // Check if roles are clearly differentiated
    const roles = Array.from(speakers.values()).map(s => s.role);
    const hasBroker = roles.includes('broker');
    const hasCustomer = roles.some(r => ['carrier', 'shipper', 'driver'].includes(r));

    if (hasBroker && hasCustomer) return 0.9;
    if (hasBroker || hasCustomer) return 0.6;
    return 0.3;
  }

  private assessContextAlignment(
    context: AgentContextData,
    speakers: Map<string, SpeakerRole>
  ): number {
    const classification = context.getAgentOutput<any>('classification');
    if (!classification) return 0.5;

    const roles = Array.from(speakers.values()).map(s => s.role);

    // Check if speaker roles align with call type
    switch (classification.primaryType) {
      case 'carrier_quote':
        return roles.includes('carrier') ? 0.9 : 0.5;
      case 'new_booking':
        return roles.includes('shipper') ? 0.9 : 0.5;
      case 'check_call':
        return roles.includes('driver') || roles.includes('dispatcher') ? 0.8 : 0.6;
      default:
        return 0.5;
    }
  }

  getDefaultOutput(): SpeakerOutput {
    const speakers = new Map<string, SpeakerRole>();

    // Basic two-speaker default
    speakers.set('A', {
      role: 'broker',
      confidence: 0.3
    });
    speakers.set('B', {
      role: 'unknown',
      confidence: 0.3
    });

    return {
      speakers,
      primarySpeaker: 'A',
      brokerSpeakerId: 'A',
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['Using default speaker mapping']
      },
      processingNotes: ['Speaker identification failed - using defaults']
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      output.speakers &&
      output.primarySpeaker &&
      output.confidence
    );
  }
}