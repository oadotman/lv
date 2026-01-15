/**
 * Conditional Agreement Agent - Identifies and tracks conditional agreements
 * Handles "if-then" scenarios, contingencies, and approval requirements
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface Condition {
  id: string;
  type: 'if_then' | 'contingent' | 'approval_required' | 'equipment_dependent' |
        'time_dependent' | 'volume_dependent' | 'rate_dependent' | 'route_dependent';

  // The condition itself
  ifClause: {
    description: string;
    category: 'rate' | 'timing' | 'equipment' | 'volume' | 'approval' | 'availability' | 'other';
    specificRequirement?: string;
    rawText: string;
  };

  // The consequence
  thenClause: {
    description: string;
    outcome: 'agreement' | 'rate_change' | 'timing_change' | 'cancellation' | 'alternative';
    specificAction?: string;
    rawText: string;
  };

  // Optional else clause
  elseClause?: {
    description: string;
    alternativeAction: string;
    rawText: string;
  };

  // Condition status
  status: 'pending' | 'met' | 'not_met' | 'expired' | 'waived';

  // Who needs to fulfill the condition
  responsibleParty: 'broker' | 'carrier' | 'shipper' | 'customer' | 'driver';

  // Deadline for condition
  deadline?: {
    date?: Date;
    description?: string; // "by end of day", "within 2 hours"
    isStrict: boolean;
  };

  // Impact assessment
  impact: {
    affectsRate: boolean;
    affectsSchedule: boolean;
    affectsEquipment: boolean;
    affectsRoute: boolean;
    criticalToAgreement: boolean;
  };

  confidence: number;
}

export interface ConditionalAgreementOutput extends BaseAgentOutput {
  conditions: Condition[];

  // Overall agreement status considering conditions
  agreementStatus: {
    type: 'firm' | 'conditional' | 'tentative' | 'contingent' | 'pending_approval';
    firmness: number; // 0-1, how firm is the agreement
    allConditionsMet: boolean;
    criticalConditionsPending: boolean;
  };

  // Approval requirements detected
  approvals: Array<{
    requiredFrom: 'manager' | 'customer' | 'dispatcher' | 'owner' | 'shipper';
    forWhat: string;
    status: 'pending' | 'obtained' | 'denied';
    deadline?: string;
    alternativeIfDenied?: string;
  }>;

  // Dependencies between conditions
  dependencies: Array<{
    condition1Id: string;
    condition2Id: string;
    relationship: 'requires' | 'conflicts' | 'alternative';
    description: string;
  }>;

  // Fallback options identified
  fallbackOptions: Array<{
    trigger: string; // What triggers this fallback
    option: string; // The fallback option
    preference: 'primary' | 'secondary' | 'last_resort';
  }>;

  // Risk assessment
  risks: Array<{
    type: 'condition_not_met' | 'approval_denied' | 'timing_conflict' | 'availability_issue';
    description: string;
    likelihood: 'high' | 'medium' | 'low';
    impact: 'critical' | 'major' | 'minor';
    mitigation?: string;
  }>;

  // Action items related to conditions
  requiredActions: Array<{
    action: string;
    owner: string;
    deadline?: string;
    conditionId: string; // Links to specific condition
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }>;

  // Summary insights
  insights: {
    totalConditions: number;
    pendingConditions: number;
    criticalConditions: number;
    estimatedCertainty: number; // 0-1, likelihood all conditions will be met
    mainContingency?: string;
  };
}

export class ConditionalAgreementAgent extends BaseAgent<void, ConditionalAgreementOutput> {
  name = 'conditional_agreement';
  version = '1.0.0';
  description = 'Conditional agreement and contingency identification';
  dependencies = ['classification', 'rate_negotiation'];

  constructor() {
    super({
      timeout: 15000,
      critical: false, // Important but not critical
      parallel: false, // Should run after negotiation
      retryOnFailure: true
    });
  }

  getPrompt(context: AgentContextData): string {
    const negotiation = context.getAgentOutput<any>('rate_negotiation');
    return this.buildConditionalPrompt(context, negotiation);
  }

  async execute(context: AgentContextData): Promise<ConditionalAgreementOutput> {
    this.log('Analyzing conditional agreements and contingencies');

    const classification = context.getAgentOutput<any>('classification');
    const negotiation = context.getAgentOutput<any>('rate_negotiation');

    // Skip if no negotiation or not relevant call type
    if (!this.isRelevant(classification?.primaryType)) {
      return this.getDefaultOutput();
    }

    // Build comprehensive prompt
    const prompt = this.buildConditionalPrompt(context, negotiation);

    // Call OpenAI
    const response = await this.callOpenAI(
      prompt,
      this.getSystemPrompt(),
      0.3,
      'gpt-4o'
    );

    // Parse and validate response
    const output = this.parseConditionalResponse(response, context);

    this.log(`Found ${output.conditions.length} conditions, agreement status: ${output.agreementStatus.type}`);

    return output;
  }

  private isRelevant(callType?: string): boolean {
    const relevantTypes = ['carrier_quote', 'new_booking', 'renegotiation', 'callback_acceptance'];
    return relevantTypes.includes(callType || '');
  }

  private buildConditionalPrompt(context: AgentContextData, negotiation: any): string {
    const hasNegotiation = negotiation?.negotiations?.length > 0;
    const negotiationStatus = negotiation?.negotiations?.[0]?.status || 'unknown';

    return `Identify all conditional agreements, contingencies, and if-then scenarios in this freight call.

TRANSCRIPT:
${context.transcript}

CONTEXT:
${hasNegotiation ? `- Negotiation status: ${negotiationStatus}` : ''}
- Look for conditional language: "if", "when", "provided that", "assuming", "depending on"
- Look for approval requirements: "need to check with", "let me confirm", "pending approval"
- Look for contingencies: "backup plan", "otherwise", "if that doesn't work"

EXTRACTION REQUIREMENTS:

1. IDENTIFY CONDITIONS:
   For each conditional statement, extract:
   - The IF clause (condition to be met)
   - The THEN clause (what happens if condition is met)
   - The ELSE clause if any (what happens if condition is not met)
   - Who needs to fulfill the condition
   - Deadline or timeframe
   - Impact on the agreement

2. TYPES OF CONDITIONS TO FIND:
   - Rate conditions: "If you can do $X, then we have a deal"
   - Timing conditions: "If you can pick up by noon..."
   - Equipment conditions: "If you have a reefer available..."
   - Volume conditions: "If you can take all 3 loads..."
   - Approval conditions: "If my manager approves..."
   - Availability conditions: "If my driver is available..."

3. APPROVAL REQUIREMENTS:
   - Who needs to approve (manager, customer, etc.)
   - What needs approval
   - Current status
   - Alternative if not approved

4. DEPENDENCIES:
   - Conditions that depend on each other
   - Conflicting conditions
   - Alternative options

5. FALLBACK OPTIONS:
   - Backup plans mentioned
   - Alternative proposals
   - Plan B scenarios

6. RISK ASSESSMENT:
   - Likelihood conditions will be met
   - Impact if conditions fail
   - Critical vs nice-to-have conditions

Return as JSON:
{
  "conditions": [
    {
      "id": "cond_1",
      "type": "if_then|contingent|approval_required|equipment_dependent|etc",

      "ifClause": {
        "description": "Clear description of the condition",
        "category": "rate|timing|equipment|volume|approval|availability|other",
        "specificRequirement": "e.g., $2,500 rate",
        "rawText": "exact quote from transcript"
      },

      "thenClause": {
        "description": "What happens if condition is met",
        "outcome": "agreement|rate_change|timing_change|cancellation|alternative",
        "specificAction": "e.g., book the load",
        "rawText": "exact quote"
      },

      "elseClause": {
        "description": "What happens if condition is NOT met (if mentioned)",
        "alternativeAction": "e.g., look for another carrier",
        "rawText": "exact quote"
      },

      "status": "pending|met|not_met|expired|waived",
      "responsibleParty": "broker|carrier|shipper|customer|driver",

      "deadline": {
        "date": "ISO date if specific",
        "description": "by end of day, within 2 hours, etc.",
        "isStrict": boolean
      },

      "impact": {
        "affectsRate": boolean,
        "affectsSchedule": boolean,
        "affectsEquipment": boolean,
        "affectsRoute": boolean,
        "criticalToAgreement": boolean
      },

      "confidence": 0.0-1.0
    }
  ],

  "agreementStatus": {
    "type": "firm|conditional|tentative|contingent|pending_approval",
    "firmness": 0.0-1.0,
    "allConditionsMet": boolean,
    "criticalConditionsPending": boolean
  },

  "approvals": [
    {
      "requiredFrom": "manager|customer|dispatcher|owner|shipper",
      "forWhat": "description of what needs approval",
      "status": "pending|obtained|denied",
      "deadline": "when approval is needed by",
      "alternativeIfDenied": "backup plan if not approved"
    }
  ],

  "dependencies": [
    {
      "condition1Id": "cond_1",
      "condition2Id": "cond_2",
      "relationship": "requires|conflicts|alternative",
      "description": "how they relate"
    }
  ],

  "fallbackOptions": [
    {
      "trigger": "what triggers this fallback",
      "option": "the fallback plan",
      "preference": "primary|secondary|last_resort"
    }
  ],

  "risks": [
    {
      "type": "condition_not_met|approval_denied|timing_conflict|availability_issue",
      "description": "description of risk",
      "likelihood": "high|medium|low",
      "impact": "critical|major|minor",
      "mitigation": "how to mitigate if mentioned"
    }
  ],

  "requiredActions": [
    {
      "action": "specific action needed",
      "owner": "who needs to do it",
      "deadline": "by when",
      "conditionId": "cond_1",
      "priority": "urgent|high|medium|low"
    }
  ],

  "insights": {
    "totalConditions": number,
    "pendingConditions": number,
    "criticalConditions": number,
    "estimatedCertainty": 0.0-1.0,
    "mainContingency": "primary contingency if any"
  }
}`;
  }

  protected getSystemPrompt(): string {
    return `You are an expert at identifying conditional agreements in freight broker calls.
Look for all if-then scenarios, contingencies, and approval requirements.
Understand the difference between firm agreements and conditional ones.
Identify who is responsible for meeting each condition.
Assess the risk and impact of conditions not being met.
Return valid JSON without markdown formatting.`;
  }

  private parseConditionalResponse(response: any, context: AgentContextData): ConditionalAgreementOutput {
    const conditions = this.parseConditions(response.conditions);

    // Calculate insights
    const insights = this.calculateInsights(conditions, response.insights);

    // Calculate overall confidence
    const avgConfidence = conditions.length > 0
      ? conditions.reduce((sum, c) => sum + c.confidence, 0) / conditions.length
      : 0.5;

    return {
      conditions,
      agreementStatus: response.agreementStatus || this.getDefaultAgreementStatus(),
      approvals: response.approvals || [],
      dependencies: response.dependencies || [],
      fallbackOptions: response.fallbackOptions || [],
      risks: response.risks || [],
      requiredActions: response.requiredActions || [],
      insights,
      confidence: this.calculateConfidence({
        conditionDetection: avgConfidence,
        completeness: this.assessCompleteness(conditions),
        complexity: conditions.length / 10 // More conditions = lower confidence
      })
    };
  }

  private parseConditions(data: any): Condition[] {
    if (!Array.isArray(data)) return [];

    return data.map((cond, index) => ({
      id: cond.id || `cond_${index + 1}`,
      type: cond.type || 'if_then',

      ifClause: {
        description: cond.ifClause?.description || '',
        category: cond.ifClause?.category || 'other',
        specificRequirement: cond.ifClause?.specificRequirement,
        rawText: cond.ifClause?.rawText || ''
      },

      thenClause: {
        description: cond.thenClause?.description || '',
        outcome: cond.thenClause?.outcome || 'agreement',
        specificAction: cond.thenClause?.specificAction,
        rawText: cond.thenClause?.rawText || ''
      },

      elseClause: cond.elseClause ? {
        description: cond.elseClause.description || '',
        alternativeAction: cond.elseClause.alternativeAction || '',
        rawText: cond.elseClause.rawText || ''
      } : undefined,

      status: cond.status || 'pending',
      responsibleParty: cond.responsibleParty || 'broker',

      deadline: cond.deadline ? {
        date: this.parseDate(cond.deadline.date),
        description: cond.deadline.description,
        isStrict: cond.deadline.isStrict !== false
      } : undefined,

      impact: {
        affectsRate: cond.impact?.affectsRate || false,
        affectsSchedule: cond.impact?.affectsSchedule || false,
        affectsEquipment: cond.impact?.affectsEquipment || false,
        affectsRoute: cond.impact?.affectsRoute || false,
        criticalToAgreement: cond.impact?.criticalToAgreement || false
      },

      confidence: cond.confidence || 0.5
    }));
  }

  private calculateInsights(conditions: Condition[], rawInsights: any): ConditionalAgreementOutput['insights'] {
    const pendingConditions = conditions.filter(c => c.status === 'pending').length;
    const criticalConditions = conditions.filter(c => c.impact.criticalToAgreement).length;

    return {
      totalConditions: conditions.length,
      pendingConditions,
      criticalConditions,
      estimatedCertainty: rawInsights?.estimatedCertainty || this.estimateCertainty(conditions),
      mainContingency: rawInsights?.mainContingency
    };
  }

  private estimateCertainty(conditions: Condition[]): number {
    if (conditions.length === 0) return 1.0;

    const weights = conditions.map(c => {
      let weight = c.confidence;
      if (c.status === 'met') weight = 1.0;
      if (c.status === 'not_met') weight = 0;
      if (c.impact.criticalToAgreement) weight *= 0.5; // Critical conditions reduce certainty
      return weight;
    });

    return weights.reduce((sum, w) => sum + w, 0) / conditions.length;
  }

  private assessCompleteness(conditions: Condition[]): number {
    if (conditions.length === 0) return 1.0; // No conditions = complete

    const scores = conditions.map(c => {
      let score = 0;
      let checks = 0;

      if (c.ifClause.description) { score++; checks++; }
      if (c.thenClause.description) { score++; checks++; }
      if (c.status) { score++; checks++; }
      if (c.responsibleParty) { score++; checks++; }

      return checks > 0 ? score / checks : 0;
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private parseDate(dateStr: any): Date | undefined {
    if (!dateStr || dateStr === 'null') return undefined;

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      return date;
    } catch {
      return undefined;
    }
  }

  private getDefaultAgreementStatus(): ConditionalAgreementOutput['agreementStatus'] {
    return {
      type: 'firm',
      firmness: 1.0,
      allConditionsMet: true,
      criticalConditionsPending: false
    };
  }

  getDefaultOutput(): ConditionalAgreementOutput {
    return {
      conditions: [],
      agreementStatus: this.getDefaultAgreementStatus(),
      approvals: [],
      dependencies: [],
      fallbackOptions: [],
      risks: [],
      requiredActions: [],
      insights: {
        totalConditions: 0,
        pendingConditions: 0,
        criticalConditions: 0,
        estimatedCertainty: 1.0
      },
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No conditions detected or agent not applicable']
      }
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      Array.isArray(output.conditions) &&
      output.agreementStatus &&
      output.insights &&
      output.confidence
    );
  }
}