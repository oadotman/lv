/**
 * Summary Agent - Generates executive summary and key insights
 * Consolidates all agent outputs into actionable intelligence
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface KeyInsight {
  id: string;
  category: 'rate' | 'schedule' | 'agreement' | 'relationship' | 'risk' | 'opportunity';
  importance: 'critical' | 'high' | 'medium' | 'low';

  insight: {
    title: string;
    description: string;
    evidence: string[]; // Supporting facts from extraction
    confidence: number;
  };

  businessImpact: {
    financial?: string; // "$500 savings opportunity"
    operational?: string; // "2-day delivery window"
    strategic?: string; // "New carrier relationship"
    risk?: string; // "Conditional agreement pending"
  };

  recommendation?: {
    action: string;
    priority: 'immediate' | 'soon' | 'future';
    owner: 'broker' | 'operations' | 'management';
  };
}

export interface CallSummary {
  // One-line summary
  headline: string;

  // Call metadata
  callType: string;
  participants: {
    broker?: string;
    carrier?: string;
    shipper?: string;
    company?: string[];
  };

  // Core outcomes
  primaryOutcome: {
    status: 'agreed' | 'pending' | 'rejected' | 'information_only';
    description: string;
    confidence: number;
  };

  // Key details
  keyDetails: {
    loads?: Array<{
      route: string; // "Chicago to Atlanta"
      commodity: string;
      equipment: string;
      dates: string; // "Pickup 1/16, Deliver 1/18"
    }>;

    rates?: Array<{
      amount: number;
      type: string;
      conditions?: string[];
    }>;

    terms?: string[]; // Key terms agreed upon
  };

  // Deal summary (if applicable)
  deal?: {
    totalValue: number;
    numberOfLoads: number;
    equipment: string[];
    timeline: string;
    specialConditions?: string[];
  };
}

export interface SummaryOutput extends BaseAgentOutput {
  // Executive summary
  executiveSummary: string; // 2-3 sentence overview

  // Structured summary
  summary: CallSummary;

  // Key insights
  insights: KeyInsight[];

  // Action items consolidated
  actionItems: Array<{
    id: string;
    action: string;
    owner: string;
    deadline?: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed';
    dependencies?: string[];
  }>;

  // Next steps
  nextSteps: Array<{
    step: string;
    responsible: string;
    timing: string; // "immediately", "within 2 hours", "by EOD"
    critical: boolean;
  }>;

  // Risk summary
  risks: Array<{
    type: 'agreement' | 'operational' | 'financial' | 'relationship';
    description: string;
    severity: 'high' | 'medium' | 'low';
    mitigation?: string;
  }>;

  // Opportunities identified
  opportunities: Array<{
    type: 'cost_savings' | 'efficiency' | 'relationship' | 'volume';
    description: string;
    potentialValue?: string;
    actionRequired?: string;
  }>;

  // Communication summary
  communicationSummary: {
    tone: 'positive' | 'neutral' | 'challenging' | 'professional';
    negotiationStyle?: 'collaborative' | 'competitive' | 'mixed';
    relationshipStatus: 'new' | 'developing' | 'established' | 'strained';
    followUpRequired: boolean;
    followUpReason?: string;
  };

  // Data quality assessment
  dataQuality: {
    extractionCompleteness: number; // 0-100%
    confidenceLevel: 'high' | 'medium' | 'low';
    validationIssues: number;
    manualReviewRecommended: boolean;
    reviewReasons?: string[];
  };

  // Template-ready outputs
  templates: {
    emailSubject?: string; // "Load Confirmation: Chicago to Atlanta - $2,500"
    smsMessage?: string; // 140 char summary
    internalNote?: string; // For CRM/TMS
    customerUpdate?: string; // For shipper communication
  };
}

export class SummaryAgent extends BaseAgent<void, SummaryOutput> {
  name = 'summary';
  version = '1.0.0';
  description = 'Executive summary and insight generation';
  dependencies = []; // Runs last, uses all available outputs

  constructor() {
    super({
      timeout: 12000,
      critical: false,
      parallel: false,
      retryOnFailure: true
    });
  }
  getPrompt(context: AgentContextData): string {
    // Summary agent doesn't use prompts - it processes outputs from other agents
    return '';
  }

  async execute(context: AgentContextData): Promise<SummaryOutput> {
    this.log('Generating executive summary and insights');

    // Collect all agent outputs
    const outputs = this.collectAllOutputs(context);

    // Generate components
    const summary = this.generateCallSummary(outputs);
    const executiveSummary = this.generateExecutiveSummary(summary, outputs);
    const insights = this.extractKeyInsights(outputs);
    const actionItems = this.consolidateActionItems(outputs);
    const nextSteps = this.determineNextSteps(outputs, actionItems);
    const risks = this.assessRisks(outputs);
    const opportunities = this.identifyOpportunities(outputs);
    const communicationSummary = this.analyzeCommunication(outputs);
    const dataQuality = this.assessDataQuality(outputs);
    const templates = this.generateTemplates(summary, outputs);

    this.log(`Generated summary with ${insights.length} insights, ${actionItems.length} action items`);

    return {
      executiveSummary,
      summary,
      insights,
      actionItems,
      nextSteps,
      risks,
      opportunities,
      communicationSummary,
      dataQuality,
      templates,
      confidence: this.calculateConfidence({
        dataCompleteness: dataQuality.extractionCompleteness / 100,
        insightQuality: insights.length > 0 ? 0.8 : 0.5,
        validationScore: 1 - (dataQuality.validationIssues / 10)
      })
    };
  }

  private collectAllOutputs(context: AgentContextData): Map<string, any> {
    const outputs = new Map<string, any>();

    const agents = [
      'classification', 'speaker_identification', 'load_extraction',
      'simple_rate_extraction', 'rate_negotiation', 'carrier_information',
      'shipper_information', 'temporal_resolution', 'conditional_agreement',
      'accessorial_parser', 'reference_resolution', 'action_items', 'validation'
    ];

    for (const agent of agents) {
      const output = context.getAgentOutput(agent);
      if (output) {
        outputs.set(agent, output);
      }
    }

    return outputs;
  }

  private generateCallSummary(outputs: Map<string, any>): CallSummary {
    const classification = outputs.get('classification');
    const speakers = outputs.get('speaker_identification');
    const loads = outputs.get('load_extraction');
    const negotiation = outputs.get('rate_negotiation');
    const simpleRate = outputs.get('simple_rate_extraction');
    const carrier = outputs.get('carrier_information');
    const shipper = outputs.get('shipper_information');
    const conditional = outputs.get('conditional_agreement');

    // Determine primary outcome
    const primaryOutcome = this.determinePrimaryOutcome(
      classification,
      negotiation,
      conditional
    );

    // Extract participants
    const participants = this.extractParticipants(speakers, carrier, shipper);

    // Build key details
    const keyDetails = this.buildKeyDetails(loads, negotiation, simpleRate);

    // Build deal summary if applicable
    const deal = this.buildDealSummary(loads, negotiation, simpleRate);

    // Create headline
    const headline = this.createHeadline(
      classification?.primaryType,
      primaryOutcome,
      keyDetails
    );

    return {
      headline,
      callType: classification?.primaryType || 'unknown',
      participants,
      primaryOutcome,
      keyDetails,
      deal
    };
  }

  private determinePrimaryOutcome(classification: any, negotiation: any, conditional: any): any {
    let status: 'agreed' | 'pending' | 'rejected' | 'information_only' = 'information_only';
    let description = '';
    let confidence = 0.5;

    if (negotiation?.negotiations?.[0]) {
      const neg = negotiation.negotiations[0];
      status = neg.status === 'agreed' ? 'agreed'
        : neg.status === 'rejected' ? 'rejected'
        : 'pending';

      description = neg.status === 'agreed'
        ? `Rate agreed at $${neg.agreedRate}`
        : neg.status === 'rejected'
        ? 'Negotiation failed - no agreement reached'
        : 'Negotiation ongoing - pending decision';

      confidence = neg.confidence?.negotiationComplete || 0.7;
    }

    // Check for conditional agreements
    if (conditional?.agreementStatus?.type === 'conditional') {
      status = 'pending';
      description += ' (conditional on ' +
        conditional.conditions.filter((c: any) => c.status === 'pending').length +
        ' conditions)';
    }

    return { status, description, confidence };
  }

  private extractParticipants(speakers: any, carrier: any, shipper: any): any {
    const participants: any = {};

    if (speakers?.speakers) {
      for (const [id, speaker] of Object.entries(speakers.speakers)) {
        const s = speaker as any;
        if (s.role === 'broker' && s.name) participants.broker = s.name;
        if (s.role === 'carrier' && s.name) participants.carrier = s.name;
        if (s.role === 'shipper' && s.name) participants.shipper = s.name;
      }
    }

    const companies = [];
    if (carrier?.carriers?.[0]?.companyName) {
      companies.push(carrier.carriers[0].companyName);
    }
    if (shipper?.shippers?.[0]?.companyName) {
      companies.push(shipper.shippers[0].companyName);
    }

    if (companies.length > 0) {
      participants.company = companies;
    }

    return participants;
  }

  private buildKeyDetails(loads: any, negotiation: any, simpleRate: any): any {
    const details: any = {};

    // Load details
    if (loads?.loads?.length > 0) {
      details.loads = loads.loads.map((load: any) => ({
        route: `${load.origin?.city || 'Unknown'}, ${load.origin?.state || ''} to ${load.destination?.city || 'Unknown'}, ${load.destination?.state || ''}`,
        commodity: load.commodity || 'Not specified',
        equipment: load.equipmentType || 'Not specified',
        dates: this.formatDateRange(load.pickupDate, load.deliveryDate)
      }));
    }

    // Rate details
    const rates = [];
    if (negotiation?.negotiations?.[0]?.agreedRate) {
      rates.push({
        amount: negotiation.negotiations[0].agreedRate,
        type: negotiation.negotiations[0].rateType || 'flat',
        conditions: negotiation.negotiations[0].conditions?.map((c: any) => c.description)
      });
    } else if (simpleRate?.rates?.length > 0) {
      rates.push(...simpleRate.rates.map((r: any) => ({
        amount: r.amount,
        type: r.type,
        conditions: r.conditions
      })));
    }

    if (rates.length > 0) {
      details.rates = rates;
    }

    // Key terms
    const terms = [];
    if (negotiation?.negotiations?.[0]?.includesFuel) {
      terms.push('Rate includes fuel');
    }
    if (loads?.loads?.[0]?.specialRequirements?.length > 0) {
      terms.push(...loads.loads[0].specialRequirements);
    }

    if (terms.length > 0) {
      details.terms = terms;
    }

    return details;
  }

  private buildDealSummary(loads: any, negotiation: any, simpleRate: any): any {
    if (negotiation?.negotiations?.[0]?.status !== 'agreed' &&
        simpleRate?.rates?.[0]?.status !== 'accepted') {
      return undefined;
    }

    const numberOfLoads = loads?.loads?.length || 1;
    const rate = negotiation?.negotiations?.[0]?.agreedRate || simpleRate?.rates?.[0]?.amount || 0;
    const totalValue = rate * numberOfLoads;

    const equipment = [...new Set(loads?.loads?.map((l: any) => l.equipmentType) || [])];

    return {
      totalValue,
      numberOfLoads,
      equipment,
      timeline: this.formatTimeline(loads?.loads),
      specialConditions: negotiation?.negotiations?.[0]?.conditions?.map((c: any) => c.description)
    };
  }

  private createHeadline(callType: string, outcome: any, details: any): string {
    const route = details.loads?.[0]?.route || 'route TBD';
    const rate = details.rates?.[0]?.amount;

    switch (callType) {
      case 'carrier_quote':
        return outcome.status === 'agreed'
          ? `Carrier agreed: ${route} at $${rate}`
          : outcome.status === 'rejected'
          ? `Carrier quote rejected for ${route}`
          : `Carrier quote pending for ${route}`;

      case 'new_booking':
        return `New booking: ${route}${rate ? ` at $${rate}` : ''}`;

      case 'check_call':
        return `Check call: Status update on ${route}`;

      case 'renegotiation':
        return outcome.status === 'agreed'
          ? `Rate renegotiated: ${route} now $${rate}`
          : `Renegotiation in progress for ${route}`;

      default:
        return `${callType}: ${outcome.description}`;
    }
  }

  private formatDateRange(pickup: any, delivery: any): string {
    if (!pickup && !delivery) return 'Dates TBD';

    const pickupStr = pickup?.date
      ? `Pickup ${new Date(pickup.date).toLocaleDateString()}`
      : 'Pickup TBD';

    const deliveryStr = delivery?.date
      ? `Deliver ${new Date(delivery.date).toLocaleDateString()}`
      : 'Delivery TBD';

    return `${pickupStr}, ${deliveryStr}`;
  }

  private formatTimeline(loads: any): string {
    if (!loads || loads.length === 0) return 'Timeline TBD';

    const dates = loads
      .map((l: any) => l.pickupDate?.date)
      .filter((d: any) => d)
      .map((d: any) => new Date(d))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    if (dates.length === 0) return 'Timeline TBD';

    const start = dates[0].toLocaleDateString();
    const end = dates[dates.length - 1].toLocaleDateString();

    return start === end ? `On ${start}` : `${start} to ${end}`;
  }

  private generateExecutiveSummary(summary: CallSummary, outputs: Map<string, any>): string {
    const validation = outputs.get('validation');
    const conditional = outputs.get('conditional_agreement');

    let summary_text = summary.headline + '. ';

    // Add outcome details
    if (summary.primaryOutcome.status === 'agreed') {
      summary_text += `Agreement reached with ${summary.deal?.numberOfLoads || 1} load(s) ` +
        `totaling $${summary.deal?.totalValue || 0}. `;
    } else if (summary.primaryOutcome.status === 'pending') {
      const pendingConditions = conditional?.conditions?.filter((c: any) => c.status === 'pending').length || 0;
      if (pendingConditions > 0) {
        summary_text += `Agreement pending ${pendingConditions} condition(s). `;
      } else {
        summary_text += `Decision pending. `;
      }
    }

    // Add data quality note if issues exist
    if (validation?.issues?.length > 0) {
      const criticalIssues = validation.issues.filter((i: any) => i.severity === 'critical').length;
      if (criticalIssues > 0) {
        summary_text += `Note: ${criticalIssues} critical data issues require attention. `;
      }
    }

    // Add next step
    const urgentActions = outputs.get('action_items')?.actionItems
      ?.filter((a: any) => a.priority === 'urgent' || a.priority === 'high');

    if (urgentActions?.length > 0) {
      summary_text += `Immediate action required: ${urgentActions[0].action}`;
    }

    return summary_text;
  }

  private extractKeyInsights(outputs: Map<string, any>): KeyInsight[] {
    const insights: KeyInsight[] = [];
    let insightId = 1;

    // Rate insights
    const negotiation = outputs.get('rate_negotiation');
    if (negotiation?.negotiations?.[0]) {
      const neg = negotiation.negotiations[0];
      if (neg.priceMovement?.brokerConcession > 200) {
        insights.push({
          id: `insight_${insightId++}`,
          category: 'rate',
          importance: 'high',
          insight: {
            title: 'Significant broker concession',
            description: `Broker increased offer by $${neg.priceMovement.brokerConcession} during negotiation`,
            evidence: [`Initial: $${neg.initialPositions.broker}`, `Final: $${neg.finalPositions.broker}`],
            confidence: 0.9
          },
          businessImpact: {
            financial: `$${neg.priceMovement.brokerConcession} additional cost per load`,
            strategic: 'May indicate strong carrier market position'
          },
          recommendation: {
            action: 'Review market rates and consider alternative carriers',
            priority: 'soon',
            owner: 'broker'
          }
        });
      }
    }

    // Relationship insights
    const references = outputs.get('reference_resolution');
    if (references?.inferredContext?.relationshipType === 'regular') {
      insights.push({
        id: `insight_${insightId++}`,
        category: 'relationship',
        importance: 'medium',
        insight: {
          title: 'Established business relationship',
          description: 'This appears to be a regular lane with standard terms',
          evidence: references.references.map((r: any) => r.originalReference.text),
          confidence: 0.8
        },
        businessImpact: {
          operational: 'Streamlined processing possible',
          strategic: 'Consider volume commitment for better rates'
        }
      });
    }

    // Risk insights
    const conditional = outputs.get('conditional_agreement');
    const criticalPending = conditional?.conditions
      ?.filter((c: any) => c.status === 'pending' && c.impact.criticalToAgreement);

    if (criticalPending?.length > 0) {
      insights.push({
        id: `insight_${insightId++}`,
        category: 'risk',
        importance: 'critical',
        insight: {
          title: 'Agreement at risk',
          description: `${criticalPending.length} critical condition(s) must be met for agreement to proceed`,
          evidence: criticalPending.map((c: any) => c.ifClause.description),
          confidence: 0.95
        },
        businessImpact: {
          risk: 'Deal may fall through if conditions not met',
          operational: 'May need backup carrier'
        },
        recommendation: {
          action: 'Resolve pending conditions immediately',
          priority: 'immediate',
          owner: 'broker'
        }
      });
    }

    // Opportunity insights
    const accessorials = outputs.get('accessorial_parser');
    if (accessorials?.negotiationOpportunities?.length > 0) {
      const topOpp = accessorials.negotiationOpportunities[0];
      insights.push({
        id: `insight_${insightId++}`,
        category: 'opportunity',
        importance: 'medium',
        insight: {
          title: 'Cost saving opportunity',
          description: topOpp.suggestion,
          evidence: [topOpp.currentTerms],
          confidence: 0.7
        },
        businessImpact: {
          financial: topOpp.potentialSavings ? `$${topOpp.potentialSavings} potential savings` : 'Cost reduction possible'
        },
        recommendation: {
          action: 'Negotiate ' + topOpp.accessorialType,
          priority: 'future',
          owner: 'broker'
        }
      });
    }

    return insights;
  }

  private consolidateActionItems(outputs: Map<string, any>): any[] {
    const allActions = [];

    // From action_items agent
    const actionAgent = outputs.get('action_items');
    if (actionAgent?.actionItems) {
      allActions.push(...actionAgent.actionItems.map((a: any) => ({
        ...a,
        id: `action_${allActions.length + 1}`,
        status: 'pending'
      })));
    }

    // From conditional_agreement
    const conditional = outputs.get('conditional_agreement');
    if (conditional?.requiredActions) {
      allActions.push(...conditional.requiredActions.map((a: any) => ({
        id: `action_${allActions.length + 1}`,
        action: a.action,
        owner: a.owner,
        deadline: a.deadline,
        priority: a.priority,
        status: 'pending',
        dependencies: [a.conditionId]
      })));
    }

    // From validation recommendations
    const validation = outputs.get('validation');
    if (validation?.recommendations) {
      allActions.push(...validation.recommendations
        .filter((r: any) => r.priority === 'high')
        .map((r: any) => ({
          id: `action_${allActions.length + 1}`,
          action: r.action,
          owner: 'operations',
          priority: r.priority,
          status: 'pending'
        })));
    }

    // Sort by priority
    return allActions.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private determineNextSteps(outputs: Map<string, any>, actionItems: any[]): any[] {
    const steps = [];

    // Immediate actions
    const urgentActions = actionItems.filter(a => a.priority === 'urgent');
    for (const action of urgentActions.slice(0, 3)) {
      steps.push({
        step: action.action,
        responsible: action.owner,
        timing: 'immediately',
        critical: true
      });
    }

    // Based on call outcome
    const classification = outputs.get('classification');
    const negotiation = outputs.get('rate_negotiation');

    if (negotiation?.negotiations?.[0]?.status === 'agreed') {
      steps.push({
        step: 'Send rate confirmation',
        responsible: 'broker',
        timing: 'within 1 hour',
        critical: true
      });

      steps.push({
        step: 'Dispatch driver',
        responsible: 'carrier',
        timing: 'as scheduled',
        critical: false
      });
    }

    if (classification?.primaryType === 'new_booking') {
      steps.push({
        step: 'Find and confirm carrier',
        responsible: 'broker',
        timing: 'within 2 hours',
        critical: true
      });
    }

    return steps;
  }

  private assessRisks(outputs: Map<string, any>): any[] {
    const risks = [];

    // Validation risks
    const validation = outputs.get('validation');
    if (validation?.issues) {
      const criticalIssues = validation.issues.filter((i: any) => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        risks.push({
          type: 'agreement',
          description: `${criticalIssues.length} critical data issues could invalidate agreement`,
          severity: 'high',
          mitigation: 'Resolve data conflicts before proceeding'
        });
      }
    }

    // Conditional agreement risks
    const conditional = outputs.get('conditional_agreement');
    if (conditional?.risks) {
      risks.push(...conditional.risks.map((r: any) => ({
        type: 'agreement',
        description: r.description,
        severity: r.impact === 'critical' ? 'high' : r.impact === 'major' ? 'medium' : 'low',
        mitigation: r.mitigation
      })));
    }

    // Timing risks
    const temporal = outputs.get('temporal_resolution');
    if (temporal?.warnings) {
      risks.push(...temporal.warnings
        .filter((w: any) => w.severity === 'high')
        .map((w: any) => ({
          type: 'operational',
          description: w.description,
          severity: 'medium',
          mitigation: 'Verify and confirm all dates/times'
        })));
    }

    return risks;
  }

  private identifyOpportunities(outputs: Map<string, any>): any[] {
    const opportunities = [];

    // Volume opportunities
    const loads = outputs.get('load_extraction');
    if (loads?.multiLoadCall) {
      opportunities.push({
        type: 'volume',
        description: 'Multiple loads discussed - potential for volume discount',
        potentialValue: 'Estimated 5-10% rate reduction',
        actionRequired: 'Negotiate volume commitment'
      });
    }

    // Relationship opportunities
    const references = outputs.get('reference_resolution');
    if (references?.referencePatterns?.hasRegularLanes) {
      opportunities.push({
        type: 'relationship',
        description: 'Regular lane identified - consider dedicated capacity agreement',
        potentialValue: 'Guaranteed capacity and stable pricing',
        actionRequired: 'Propose long-term contract'
      });
    }

    // Efficiency opportunities
    const negotiation = outputs.get('rate_negotiation');
    if (negotiation?.negotiationSummary?.duration === 'extended') {
      opportunities.push({
        type: 'efficiency',
        description: 'Long negotiation detected - pre-agreed rates could save time',
        actionRequired: 'Establish rate matrix for common lanes'
      });
    }

    return opportunities;
  }

  private analyzeCommunication(outputs: Map<string, any>): any {
    const negotiation = outputs.get('rate_negotiation');
    const references = outputs.get('reference_resolution');

    const tone = negotiation?.negotiationSummary?.style === 'collaborative' ? 'positive'
      : negotiation?.negotiationSummary?.style === 'competitive' ? 'challenging'
      : 'neutral';

    const relationshipStatus = references?.inferredContext?.relationshipType === 'regular' ? 'established'
      : references?.inferredContext?.relationshipType === 'occasional' ? 'developing'
      : 'new';

    const followUpRequired = outputs.get('action_items')?.actionItems?.length > 0 ||
      outputs.get('conditional_agreement')?.conditions?.some((c: any) => c.status === 'pending');

    return {
      tone,
      negotiationStyle: negotiation?.negotiationSummary?.style,
      relationshipStatus,
      followUpRequired,
      followUpReason: followUpRequired ? 'Pending actions and conditions' : undefined
    };
  }

  private assessDataQuality(outputs: Map<string, any>): any {
    const validation = outputs.get('validation');

    const extractionCompleteness = validation?.validationStatus?.completeness
      ? validation.validationStatus.completeness * 100
      : 50;

    const avgConfidence = Array.from(outputs.values())
      .map(o => o?.confidence?.value || 0)
      .filter(c => c > 0)
      .reduce((a, b, _, arr) => a + b / arr.length, 0);

    const confidenceLevel = avgConfidence > 0.8 ? 'high'
      : avgConfidence > 0.6 ? 'medium'
      : 'low';

    const validationIssues = validation?.issues?.length || 0;

    const criticalIssues = validation?.issues?.filter((i: any) => i.severity === 'critical').length || 0;
    const manualReviewRecommended = criticalIssues > 0 || confidenceLevel === 'low';

    const reviewReasons = [];
    if (criticalIssues > 0) reviewReasons.push(`${criticalIssues} critical validation issues`);
    if (confidenceLevel === 'low') reviewReasons.push('Low extraction confidence');
    if (extractionCompleteness < 60) reviewReasons.push('Incomplete data extraction');

    return {
      extractionCompleteness,
      confidenceLevel,
      validationIssues,
      manualReviewRecommended,
      reviewReasons: reviewReasons.length > 0 ? reviewReasons : undefined
    };
  }

  private generateTemplates(summary: CallSummary, outputs: Map<string, any>): any {
    const templates: any = {};

    // Email subject
    if (summary.deal) {
      templates.emailSubject = `${summary.callType === 'carrier_quote' ? 'Rate Confirmation' : 'Load Booking'}: ` +
        `${summary.keyDetails.loads?.[0]?.route || 'TBD'} - $${summary.deal.totalValue}`;
    } else {
      templates.emailSubject = `${summary.callType}: ${summary.headline}`;
    }

    // SMS message (140 chars)
    const smsBase = summary.primaryOutcome.status === 'agreed'
      ? `Agreed: ${summary.keyDetails.loads?.[0]?.route || 'TBD'} $${summary.deal?.totalValue || 0}`
      : summary.primaryOutcome.status === 'pending'
      ? `Pending: ${summary.keyDetails.loads?.[0]?.route || 'TBD'}`
      : `${summary.callType}: ${summary.headline}`;

    templates.smsMessage = smsBase.substring(0, 140);

    // Internal note
    templates.internalNote = `${summary.headline}. ${summary.primaryOutcome.description}. ` +
      `Participants: ${Object.values(summary.participants).filter(p => p).join(', ')}. ` +
      (summary.deal ? `Deal value: $${summary.deal.totalValue}. ` : '') +
      (outputs.get('action_items')?.actionItems?.length > 0
        ? `${outputs.get('action_items').actionItems.length} action items pending.`
        : '');

    // Customer update
    if (summary.callType === 'new_booking' || summary.callType === 'check_call') {
      templates.customerUpdate = summary.primaryOutcome.status === 'agreed'
        ? `Your shipment from ${summary.keyDetails.loads?.[0]?.route || 'TBD'} has been confirmed. ` +
          `${summary.keyDetails.loads?.[0]?.dates || ''}`
        : `Update on your shipment: ${summary.primaryOutcome.description}`;
    }

    return templates;
  }

  getDefaultOutput(): SummaryOutput {
    return {
      executiveSummary: 'Unable to generate summary - insufficient data',
      summary: {
        headline: 'Call summary unavailable',
        callType: 'unknown',
        participants: {},
        primaryOutcome: {
          status: 'information_only',
          description: 'No outcome determined',
          confidence: 0
        },
        keyDetails: {}
      },
      insights: [],
      actionItems: [],
      nextSteps: [],
      risks: [],
      opportunities: [],
      communicationSummary: {
        tone: 'neutral',
        relationshipStatus: 'new',
        followUpRequired: false
      },
      dataQuality: {
        extractionCompleteness: 0,
        confidenceLevel: 'low',
        validationIssues: 0,
        manualReviewRecommended: true,
        reviewReasons: ['Insufficient data for summary']
      },
      templates: {},
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No data available for summary']
      }
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      output.executiveSummary &&
      output.summary &&
      Array.isArray(output.insights) &&
      Array.isArray(output.actionItems) &&
      output.confidence
    );
  }
}