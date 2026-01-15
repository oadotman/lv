/**
 * Action Items Agent - Extracts follow-up tasks and next steps
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput, SummaryOutput } from '../types';

export interface ActionItemsOutput extends BaseAgentOutput {
  actionItems: Array<{
    id: string;
    description: string;
    owner: 'broker' | 'carrier' | 'shipper' | 'driver';
    priority: 'high' | 'medium' | 'low';
    category: 'follow_up' | 'documentation' | 'confirmation' | 'coordination' | 'payment' | 'operational';

    deadline?: {
      date?: Date;
      relative?: string; // "in 30 minutes", "by EOD", "tomorrow morning"
      urgent: boolean;
    };

    dependencies?: string[]; // Other action items that must complete first
    contactMethod?: 'call' | 'email' | 'text' | 'fax';
    contactInfo?: string; // Phone/email to use

    relatedTo?: {
      type: 'load' | 'carrier' | 'shipper' | 'rate' | 'document';
      id?: string;
      description?: string;
    };

    status: 'pending' | 'mentioned' | 'committed' | 'conditional';
    confidence: number;
  }>;

  nextSteps: string[]; // Simple list of next steps

  callbacks: Array<{
    who: string; // "broker will call carrier"
    when: string; // "in 30 minutes", "tomorrow"
    about: string; // "to confirm rate"
    phone?: string;
  }>;

  documentsNeeded: Array<{
    type: string; // "rate confirmation", "POD", "insurance cert"
    from: string; // Who needs to provide it
    to: string; // Who needs to receive it
    method: string; // "email", "fax", "upload to portal"
    deadline?: string;
  }>;

  pendingDecisions: Array<{
    decision: string;
    decisionMaker: string;
    deadline?: string;
    blocksWhat?: string;
  }>;
}

export class ActionItemsAgent extends BaseAgent<void, ActionItemsOutput> {
  name = 'action_items';
  version = '1.0.0';
  description = 'Action items and follow-up tasks extraction';
  dependencies = ['classification'];

  constructor() {
    super({
      timeout: 12000,
      critical: false,
      parallel: false,
      retryOnFailure: true
    });
  }

  async execute(context: AgentContextData): Promise<ActionItemsOutput> {
    this.log('Starting action items extraction');

    const classification = context.getAgentOutput<any>('classification');
    const negotiation = context.getAgentOutput<any>('rate_negotiation');
    const loads = context.getAgentOutput<any>('load_extraction');

    // Build context-aware prompt
    const prompt = this.getPrompt(context, classification?.primaryType);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.3,
      'gpt-4o-mini'
    );

    // Parse and validate
    const output = this.parseResponse(response, context);

    this.log(`Extracted ${output.actionItems.length} action items`);

    return output;
  }

  getPrompt(context: AgentContextData, callType?: string): string {
    const transcript = context.transcript;

    return `Extract all action items, follow-up tasks, and next steps from this freight broker call.

CALL TYPE: ${callType || 'unknown'}

TRANSCRIPT:
${transcript}

EXTRACTION TASK:

1. ACTION ITEMS - Extract specific tasks mentioned:
   - What needs to be done
   - Who needs to do it (broker, carrier, shipper, driver)
   - When it needs to be done
   - Priority level
   - Category (follow-up call, send document, confirm something, etc.)
   - Any dependencies on other tasks

2. CALLBACKS PROMISED:
   - Who will call whom
   - When they will call
   - What they'll discuss
   - Phone numbers if mentioned

3. DOCUMENTS NEEDED:
   - Rate confirmations to be sent
   - Insurance certificates needed
   - PODs to be submitted
   - Any other paperwork mentioned

4. PENDING DECISIONS:
   - Decisions waiting to be made
   - Who needs to make them
   - What they're blocking

COMMON ACTION ITEMS TO LOOK FOR:
- "I'll call you back"
- "Send me the rate confirmation"
- "I need to check with..."
- "Let me confirm with the shipper"
- "I'll text you the details"
- "Send your insurance"
- "I'll dispatch the driver"
- "Call me if..."
- "Follow up on..."

Extract as JSON:
{
  "actionItems": [
    {
      "id": "action_1",
      "description": "specific task description",
      "owner": "broker|carrier|shipper|driver",
      "priority": "high|medium|low",
      "category": "follow_up|documentation|confirmation|coordination|payment|operational",
      "deadline": {
        "relative": "in 30 minutes|by EOD|tomorrow morning",
        "urgent": boolean
      },
      "contactMethod": "call|email|text",
      "contactInfo": "phone or email if mentioned",
      "status": "pending|mentioned|committed|conditional",
      "confidence": 0.0-1.0
    }
  ],
  "nextSteps": [
    "Simple bulleted list of what happens next"
  ],
  "callbacks": [
    {
      "who": "broker will call carrier",
      "when": "in 30 minutes",
      "about": "to confirm rate",
      "phone": "if mentioned"
    }
  ],
  "documentsNeeded": [
    {
      "type": "rate confirmation|insurance|POD|etc",
      "from": "broker",
      "to": "carrier",
      "method": "email|fax",
      "deadline": "ASAP|today|etc"
    }
  ],
  "pendingDecisions": [
    {
      "decision": "whether to accept the rate",
      "decisionMaker": "carrier",
      "deadline": "in 30 minutes",
      "blocksWhat": "booking the load"
    }
  ],
  "extractionConfidence": 0.0-1.0
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert action item extraction system for LoadVoice.
Extract all follow-up tasks, callbacks, and next steps from freight broker calls.
Be specific about who needs to do what and when.
Prioritize tasks based on urgency and importance.
Return valid JSON without any markdown formatting.`;
  }

  private parseResponse(response: any, context: AgentContextData): ActionItemsOutput {
    const actionItems: ActionItemsOutput['actionItems'] = [];

    // Parse action items
    if (response.actionItems && Array.isArray(response.actionItems)) {
      for (const [index, item] of response.actionItems.entries()) {
        actionItems.push(this.parseActionItem(item, index));
      }
    }

    // Add negotiation-based action items
    const negotiation = context.getAgentOutput<any>('rate_negotiation');
    if (negotiation) {
      const negotiationActions = this.extractNegotiationActions(negotiation);
      actionItems.push(...negotiationActions);
    }

    // Parse other fields
    const nextSteps = response.nextSteps || [];
    const callbacks = response.callbacks || [];
    const documentsNeeded = response.documentsNeeded || [];
    const pendingDecisions = response.pendingDecisions || [];

    // Calculate confidence
    const confidence = this.calculateConfidence({
      extraction: response.extractionConfidence || 0.5,
      itemCount: actionItems.length > 0 ? 0.9 : 0.3,
      clarity: this.assessClarity(actionItems)
    });

    return {
      actionItems,
      nextSteps,
      callbacks,
      documentsNeeded,
      pendingDecisions,
      confidence
    };
  }

  private parseActionItem(item: any, index: number): ActionItemsOutput['actionItems'][0] {
    const deadline = item.deadline ? {
      date: item.deadline.date ? new Date(item.deadline.date) : undefined,
      relative: item.deadline.relative,
      urgent: item.deadline.urgent === true
    } : undefined;

    return {
      id: item.id || `action_${index + 1}`,
      description: item.description || 'Unknown action',
      owner: item.owner || 'broker',
      priority: item.priority || 'medium',
      category: item.category || 'follow_up',
      deadline,
      dependencies: item.dependencies,
      contactMethod: item.contactMethod,
      contactInfo: item.contactInfo,
      relatedTo: item.relatedTo,
      status: item.status || 'mentioned',
      confidence: item.confidence || 0.5
    };
  }

  private extractNegotiationActions(negotiation: any): ActionItemsOutput['actionItems'] {
    const actions: ActionItemsOutput['actionItems'] = [];

    if (!negotiation.negotiations) return actions;

    for (const neg of negotiation.negotiations) {
      switch (neg.status) {
        case 'agreed':
          actions.push({
            id: `neg_action_${actions.length + 1}`,
            description: 'Send rate confirmation for agreed rate',
            owner: 'broker',
            priority: 'high',
            category: 'documentation',
            deadline: { relative: 'immediately', urgent: true },
            status: 'pending',
            confidence: 0.9
          });
          break;

        case 'pending':
          if (neg.conditions && neg.conditions.length > 0) {
            actions.push({
              id: `neg_action_${actions.length + 1}`,
              description: `Follow up on: ${neg.conditions.join(', ')}`,
              owner: 'broker',
              priority: 'high',
              category: 'follow_up',
              deadline: { relative: 'within 1 hour', urgent: true },
              status: 'pending',
              confidence: 0.8
            });
          }
          break;

        case 'callback_requested':
          actions.push({
            id: `neg_action_${actions.length + 1}`,
            description: 'Call back if rate improves or situation changes',
            owner: 'broker',
            priority: 'low',
            category: 'follow_up',
            status: 'conditional',
            confidence: 0.7
          });
          break;
      }
    }

    return actions;
  }

  private assessClarity(items: ActionItemsOutput['actionItems']): number {
    if (items.length === 0) return 0;

    const scores = items.map(item => {
      let score = 0;
      if (item.description && item.description !== 'Unknown action') score += 0.4;
      if (item.owner) score += 0.3;
      if (item.deadline) score += 0.3;
      return score;
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  getDefaultOutput(): ActionItemsOutput {
    return {
      actionItems: [],
      nextSteps: [],
      callbacks: [],
      documentsNeeded: [],
      pendingDecisions: [],
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No action items extracted']
      },
      processingNotes: ['No clear action items identified']
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      Array.isArray(output.actionItems) &&
      Array.isArray(output.nextSteps) &&
      output.confidence !== undefined
    );
  }
}