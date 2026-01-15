/**
 * Validation Agent - Cross-checks data consistency and validates extraction quality
 * Ensures all extracted data is logically consistent and complete
 */

import { BaseAgent } from '../base-agent';
import { AgentContextData, BaseAgentOutput } from '../types';

export interface ValidationIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'consistency' | 'completeness' | 'logic' | 'format' | 'conflict';

  // What's wrong
  issue: {
    field: string; // Which field/agent output
    description: string;
    expectedValue?: any;
    actualValue?: any;
    affectedAgents: string[];
  };

  // How to fix
  resolution: {
    suggested: string;
    autoFixable: boolean;
    fixApplied?: boolean;
    fixedValue?: any;
  };

  // Impact assessment
  impact: {
    affectsRate: boolean;
    affectsSchedule: boolean;
    affectsAgreement: boolean;
    userActionRequired: boolean;
  };

  confidence: number;
}

export interface DataConsistency {
  category: string;
  isConsistent: boolean;
  details: string;
  conflicts?: Array<{
    field1: string;
    field2: string;
    value1: any;
    value2: any;
    resolution?: string;
  }>;
}

export interface ValidationOutput extends BaseAgentOutput {
  // Overall validation status
  validationStatus: {
    isValid: boolean;
    completeness: number; // 0-1
    consistency: number; // 0-1
    reliability: number; // 0-1
    overallScore: number; // 0-100
  };

  // Issues found
  issues: ValidationIssue[];

  // Data consistency checks
  consistencyChecks: {
    rateVsLoadMatch: DataConsistency;
    dateLogicValid: DataConsistency;
    speakerConsistency: DataConsistency;
    referenceResolution: DataConsistency;
    conditionsFulfillment: DataConsistency;
    accessorialLogic: DataConsistency;
  };

  // Completeness assessment
  completeness: {
    requiredFields: Array<{
      field: string;
      present: boolean;
      confidence: number;
      source: string; // Which agent provided it
    }>;
    missingCritical: string[];
    missingOptional: string[];
    dataQuality: 'high' | 'medium' | 'low';
  };

  // Cross-agent validation
  crossAgentValidation: {
    agentConflicts: Array<{
      agent1: string;
      agent2: string;
      conflictType: string;
      description: string;
      resolution?: string;
    }>;
    agentAgreement: number; // 0-1, how well agents agree
  };

  // Logical validation
  logicalValidation: {
    pickupBeforeDelivery: boolean;
    rateWithinMarketRange: boolean;
    distanceReasonable: boolean;
    timingFeasible: boolean;
    equipmentMatchesCommodity: boolean;
  };

  // Auto-corrections applied
  corrections: Array<{
    field: string;
    originalValue: any;
    correctedValue: any;
    reason: string;
    confidence: number;
  }>;

  // Recommendations
  recommendations: Array<{
    type: 'data_quality' | 'missing_info' | 'verification' | 'manual_review';
    priority: 'high' | 'medium' | 'low';
    description: string;
    action: string;
  }>;

  // Quality metrics
  qualityMetrics: {
    extractionQuality: number; // 0-1
    confidenceDistribution: {
      high: number; // % of high confidence extractions
      medium: number;
      low: number;
    };
    agentPerformance: {
      [agentName: string]: {
        reliability: number;
        issueCount: number;
      };
    };
  };
}

export class ValidationAgent extends BaseAgent<void, ValidationOutput> {
  name = 'validation';
  version = '1.0.0';
  description = 'Data validation and consistency checking';
  dependencies = []; // Runs after all extraction agents

  // Validation rules
  private readonly MARKET_RATE_RANGE = { min: 1000, max: 6000 };
  private readonly MAX_REASONABLE_DISTANCE = 3500; // miles
  private readonly MIN_TRANSIT_SPEED = 25; // mph average
  private readonly MAX_TRANSIT_SPEED = 65; // mph average

  constructor() {
    super({
      timeout: 10000,
      critical: false, // Important but not blocking
      parallel: false, // Runs last
      retryOnFailure: false
    });
  }
  getPrompt(context: AgentContextData): string {
    // Validation agent doesn't need prompts as it analyzes other agent outputs
    return '';
  }

  async execute(context: AgentContextData): Promise<ValidationOutput> {
    this.log('Starting comprehensive validation');

    // Collect all agent outputs
    const agentOutputs = this.collectAgentOutputs(context);

    // Perform validation checks
    const consistencyChecks = this.performConsistencyChecks(agentOutputs);
    const completeness = this.assessCompleteness(agentOutputs);
    const crossAgentValidation = this.validateCrossAgent(agentOutputs);
    const logicalValidation = this.performLogicalValidation(agentOutputs);
    const issues = this.identifyIssues(
      consistencyChecks,
      completeness,
      crossAgentValidation,
      logicalValidation
    );

    // Apply auto-corrections where possible
    const corrections = this.applyAutoCorrections(issues, agentOutputs);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, completeness);

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(agentOutputs, issues);

    // Overall validation status
    const validationStatus = this.calculateValidationStatus(
      consistencyChecks,
      completeness,
      issues
    );

    this.log(`Validation complete: ${issues.length} issues found, score: ${validationStatus.overallScore}/100`);

    return {
      validationStatus,
      issues,
      consistencyChecks,
      completeness,
      crossAgentValidation,
      logicalValidation,
      corrections,
      recommendations,
      qualityMetrics,
      confidence: this.calculateConfidence({
        validationCompleteness: this.getValidationCompleteness(agentOutputs),
        issueCount: Math.max(0, 1 - (issues.length / 20)),
        dataQuality: qualityMetrics.extractionQuality
      })
    };
  }

  private collectAgentOutputs(context: AgentContextData): Map<string, any> {
    const outputs = new Map<string, any>();

    // Collect all available agent outputs
    const agentNames = [
      'classification',
      'speaker_identification',
      'load_extraction',
      'simple_rate_extraction',
      'rate_negotiation',
      'carrier_information',
      'shipper_information',
      'temporal_resolution',
      'conditional_agreement',
      'accessorial_parser',
      'reference_resolution',
      'action_items'
    ];

    for (const agentName of agentNames) {
      const output = context.getAgentOutput(agentName);
      if (output) {
        outputs.set(agentName, output);
      }
    }

    return outputs;
  }

  private performConsistencyChecks(outputs: Map<string, any>): ValidationOutput['consistencyChecks'] {
    return {
      rateVsLoadMatch: this.checkRateLoadConsistency(outputs),
      dateLogicValid: this.checkDateLogic(outputs),
      speakerConsistency: this.checkSpeakerConsistency(outputs),
      referenceResolution: this.checkReferenceConsistency(outputs),
      conditionsFulfillment: this.checkConditionsConsistency(outputs),
      accessorialLogic: this.checkAccessorialLogic(outputs)
    };
  }

  private checkRateLoadConsistency(outputs: Map<string, any>): DataConsistency {
    const loads = outputs.get('load_extraction')?.loads || [];
    const rates = outputs.get('rate_negotiation')?.negotiations ||
                  outputs.get('simple_rate_extraction')?.rates || [];

    const conflicts: any[] = [];

    // Check if number of rates matches number of loads
    if (loads.length > 0 && rates.length > 0 && loads.length !== rates.length) {
      conflicts.push({
        field1: 'load_count',
        field2: 'rate_count',
        value1: loads.length,
        value2: rates.length,
        resolution: 'Verify if rates apply to all loads or specific ones'
      });
    }

    // Check if rate IDs match load IDs
    for (const rate of rates) {
      if (rate.loadId && !loads.find((l: any) => l.id === rate.loadId)) {
        conflicts.push({
          field1: 'rate.loadId',
          field2: 'loads',
          value1: rate.loadId,
          value2: 'not found',
          resolution: 'Link rate to correct load or mark as general rate'
        });
      }
    }

    return {
      category: 'rate_load_matching',
      isConsistent: conflicts.length === 0,
      details: conflicts.length === 0
        ? 'Rates and loads are properly matched'
        : `Found ${conflicts.length} rate/load mismatches`,
      conflicts
    };
  }

  private checkDateLogic(outputs: Map<string, any>): DataConsistency {
    const loads = outputs.get('load_extraction')?.loads || [];
    const temporal = outputs.get('temporal_resolution');
    const conflicts: any[] = [];

    for (const load of loads) {
      if (load.pickupDate?.date && load.deliveryDate?.date) {
        const pickup = new Date(load.pickupDate.date);
        const delivery = new Date(load.deliveryDate.date);

        // Check if delivery is after pickup
        if (delivery <= pickup) {
          conflicts.push({
            field1: 'pickup_date',
            field2: 'delivery_date',
            value1: pickup.toISOString(),
            value2: delivery.toISOString(),
            resolution: 'Delivery must be after pickup'
          });
        }

        // Check if transit time is reasonable
        const transitHours = (delivery.getTime() - pickup.getTime()) / (1000 * 60 * 60);
        const distance = load.distance || 500; // Assume 500 miles if not specified
        const impliedSpeed = distance / transitHours;

        if (impliedSpeed < this.MIN_TRANSIT_SPEED || impliedSpeed > this.MAX_TRANSIT_SPEED) {
          conflicts.push({
            field1: 'transit_time',
            field2: 'distance',
            value1: `${transitHours} hours`,
            value2: `${distance} miles`,
            resolution: `Implied speed ${impliedSpeed.toFixed(1)} mph is unrealistic`
          });
        }
      }
    }

    // Check temporal resolution consistency
    if (temporal?.constraints) {
      for (const constraint of temporal.constraints) {
        if (constraint.violated) {
          conflicts.push({
            field1: constraint.reference1,
            field2: constraint.reference2 || 'time',
            value1: constraint.constraint,
            value2: 'violated',
            resolution: 'Adjust dates to meet constraint'
          });
        }
      }
    }

    return {
      category: 'date_logic',
      isConsistent: conflicts.length === 0,
      details: conflicts.length === 0
        ? 'All dates are logically consistent'
        : `Found ${conflicts.length} date/time conflicts`,
      conflicts
    };
  }

  private checkSpeakerConsistency(outputs: Map<string, any>): DataConsistency {
    const speakers = outputs.get('speaker_identification')?.speakers || {};
    const classification = outputs.get('classification');
    const conflicts: any[] = [];

    // Check if speaker roles match call type
    const speakerRoles = Object.values(speakers).map((s: any) => s.role);

    if (classification?.primaryType === 'carrier_quote' && !speakerRoles.includes('carrier')) {
      conflicts.push({
        field1: 'call_type',
        field2: 'speaker_roles',
        value1: 'carrier_quote',
        value2: speakerRoles.join(', '),
        resolution: 'Carrier quote should have a carrier speaker'
      });
    }

    if (classification?.primaryType === 'new_booking' && !speakerRoles.includes('shipper')) {
      conflicts.push({
        field1: 'call_type',
        field2: 'speaker_roles',
        value1: 'new_booking',
        value2: speakerRoles.join(', '),
        resolution: 'New booking should have a shipper speaker'
      });
    }

    return {
      category: 'speaker_consistency',
      isConsistent: conflicts.length === 0,
      details: conflicts.length === 0
        ? 'Speaker roles match call context'
        : `Found ${conflicts.length} speaker inconsistencies`,
      conflicts
    };
  }

  private checkReferenceConsistency(outputs: Map<string, any>): DataConsistency {
    const references = outputs.get('reference_resolution')?.references || [];
    const conflicts: any[] = [];

    for (const ref of references) {
      if (!ref.resolutionStatus.resolved && ref.impact.affectsAgreement) {
        conflicts.push({
          field1: 'reference',
          field2: 'resolution',
          value1: ref.originalReference.text,
          value2: 'unresolved',
          resolution: 'Critical reference needs clarification'
        });
      }
    }

    return {
      category: 'reference_resolution',
      isConsistent: conflicts.length === 0,
      details: conflicts.length === 0
        ? 'All references properly resolved'
        : `Found ${conflicts.length} unresolved references`,
      conflicts
    };
  }

  private checkConditionsConsistency(outputs: Map<string, any>): DataConsistency {
    const conditions = outputs.get('conditional_agreement')?.conditions || [];
    const negotiation = outputs.get('rate_negotiation')?.negotiations?.[0];
    const conflicts: any[] = [];

    for (const condition of conditions) {
      if (condition.status === 'pending' && condition.impact.criticalToAgreement) {
        conflicts.push({
          field1: 'condition',
          field2: 'status',
          value1: condition.ifClause.description,
          value2: 'pending',
          resolution: 'Critical condition must be resolved for agreement'
        });
      }
    }

    // Check if conditional agreement matches negotiation status
    if (negotiation?.status === 'agreed' && conditions.some((c: any) =>
      c.status === 'pending' && c.impact.criticalToAgreement)) {
      conflicts.push({
        field1: 'negotiation_status',
        field2: 'pending_conditions',
        value1: 'agreed',
        value2: 'has critical pending conditions',
        resolution: 'Agreement should be conditional until conditions are met'
      });
    }

    return {
      category: 'conditions_fulfillment',
      isConsistent: conflicts.length === 0,
      details: conflicts.length === 0
        ? 'All conditions properly tracked'
        : `Found ${conflicts.length} condition conflicts`,
      conflicts
    };
  }

  private checkAccessorialLogic(outputs: Map<string, any>): DataConsistency {
    const accessorials = outputs.get('accessorial_parser')?.accessorials || [];
    const rate = outputs.get('rate_negotiation')?.negotiations?.[0] ||
                 outputs.get('simple_rate_extraction')?.rates?.[0];
    const conflicts: any[] = [];

    // Check if accessorials marked as included match rate structure
    const includedAccessorials = accessorials.filter((a: any) => a.status === 'included');

    if (rate && includedAccessorials.length > 0) {
      if (rate.includesAccessorials === false && includedAccessorials.length > 0) {
        conflicts.push({
          field1: 'rate.includesAccessorials',
          field2: 'accessorials.included',
          value1: false,
          value2: includedAccessorials.map((a: any) => a.type).join(', '),
          resolution: 'Rate structure conflicts with included accessorials'
        });
      }
    }

    // Check for duplicate accessorial types
    const types = accessorials.map((a: any) => a.type);
    const duplicates = types.filter((t: string, i: number) => types.indexOf(t) !== i);

    if (duplicates.length > 0) {
      conflicts.push({
        field1: 'accessorial_types',
        field2: 'duplicates',
        value1: types.join(', '),
        value2: duplicates.join(', '),
        resolution: 'Consolidate duplicate accessorial entries'
      });
    }

    return {
      category: 'accessorial_logic',
      isConsistent: conflicts.length === 0,
      details: conflicts.length === 0
        ? 'Accessorial charges are consistent'
        : `Found ${conflicts.length} accessorial conflicts`,
      conflicts
    };
  }

  private assessCompleteness(outputs: Map<string, any>): ValidationOutput['completeness'] {
    const requiredFields = this.getRequiredFields(outputs);
    const present = requiredFields.filter(f => f.present);
    const missingCritical = requiredFields
      .filter(f => !f.present && this.isCriticalField(f.field))
      .map(f => f.field);
    const missingOptional = requiredFields
      .filter(f => !f.present && !this.isCriticalField(f.field))
      .map(f => f.field);

    const completenessRatio = present.length / requiredFields.length;
    const dataQuality = completenessRatio > 0.8 ? 'high'
      : completenessRatio > 0.6 ? 'medium'
      : 'low';

    return {
      requiredFields,
      missingCritical,
      missingOptional,
      dataQuality
    };
  }

  private getRequiredFields(outputs: Map<string, any>): any[] {
    const fields = [];
    const classification = outputs.get('classification');

    // Always required
    fields.push({
      field: 'call_type',
      present: !!classification?.primaryType,
      confidence: classification?.confidence?.value || 0,
      source: 'classification'
    });

    // Conditionally required based on call type
    if (classification?.primaryType === 'carrier_quote' ||
        classification?.primaryType === 'new_booking') {

      const loads = outputs.get('load_extraction');
      fields.push({
        field: 'origin',
        present: loads?.loads?.[0]?.origin?.city,
        confidence: loads?.loads?.[0]?.origin?.confidence || 0,
        source: 'load_extraction'
      });

      fields.push({
        field: 'destination',
        present: loads?.loads?.[0]?.destination?.city,
        confidence: loads?.loads?.[0]?.destination?.confidence || 0,
        source: 'load_extraction'
      });

      const rate = outputs.get('rate_negotiation') || outputs.get('simple_rate_extraction');
      fields.push({
        field: 'rate',
        present: rate?.negotiations?.[0]?.agreedRate || rate?.rates?.[0]?.amount,
        confidence: rate?.confidence?.value || 0,
        source: 'rate_extraction'
      });
    }

    if (classification?.primaryType === 'carrier_quote') {
      const carrier = outputs.get('carrier_information');
      fields.push({
        field: 'carrier_info',
        present: carrier?.carriers?.[0]?.companyName,
        confidence: carrier?.confidence?.value || 0,
        source: 'carrier_information'
      });
    }

    if (classification?.primaryType === 'new_booking') {
      const shipper = outputs.get('shipper_information');
      fields.push({
        field: 'shipper_info',
        present: shipper?.shippers?.[0]?.companyName,
        confidence: shipper?.confidence?.value || 0,
        source: 'shipper_information'
      });
    }

    return fields;
  }

  private isCriticalField(field: string): boolean {
    const criticalFields = ['call_type', 'origin', 'destination', 'rate'];
    return criticalFields.includes(field);
  }

  private validateCrossAgent(outputs: Map<string, any>): ValidationOutput['crossAgentValidation'] {
    const conflicts: any[] = [];

    // Check rate consistency between simple and negotiation agents
    const simpleRate = outputs.get('simple_rate_extraction')?.rates?.[0];
    const negotiatedRate = outputs.get('rate_negotiation')?.negotiations?.[0];

    if (simpleRate && negotiatedRate && simpleRate.amount !== negotiatedRate.agreedRate) {
      conflicts.push({
        agent1: 'simple_rate_extraction',
        agent2: 'rate_negotiation',
        conflictType: 'rate_mismatch',
        description: `Simple: $${simpleRate.amount} vs Negotiated: $${negotiatedRate.agreedRate}`,
        resolution: 'Use negotiated rate as it has more context'
      });
    }

    // Check date consistency between load and temporal agents
    const loadDates = outputs.get('load_extraction')?.loads?.[0];
    const temporalDates = outputs.get('temporal_resolution')?.resolvedDates;

    if (loadDates && temporalDates) {
      // Complex date validation logic here
    }

    const agentAgreement = conflicts.length === 0 ? 1.0
      : Math.max(0, 1 - (conflicts.length * 0.2));

    return {
      agentConflicts: conflicts,
      agentAgreement
    };
  }

  private performLogicalValidation(outputs: Map<string, any>): ValidationOutput['logicalValidation'] {
    const loads = outputs.get('load_extraction')?.loads?.[0];
    const rate = outputs.get('rate_negotiation')?.negotiations?.[0] ||
                 outputs.get('simple_rate_extraction')?.rates?.[0];

    return {
      pickupBeforeDelivery: this.validatePickupBeforeDelivery(loads),
      rateWithinMarketRange: this.validateRateRange(rate),
      distanceReasonable: this.validateDistance(loads),
      timingFeasible: this.validateTiming(loads),
      equipmentMatchesCommodity: this.validateEquipmentMatch(loads)
    };
  }

  private validatePickupBeforeDelivery(load: any): boolean {
    if (!load?.pickupDate?.date || !load?.deliveryDate?.date) return true;

    const pickup = new Date(load.pickupDate.date);
    const delivery = new Date(load.deliveryDate.date);

    return pickup < delivery;
  }

  private validateRateRange(rate: any): boolean {
    if (!rate?.amount && !rate?.agreedRate) return true;

    const amount = rate.amount || rate.agreedRate;
    return amount >= this.MARKET_RATE_RANGE.min && amount <= this.MARKET_RATE_RANGE.max;
  }

  private validateDistance(load: any): boolean {
    if (!load?.distance) return true;
    return load.distance <= this.MAX_REASONABLE_DISTANCE;
  }

  private validateTiming(load: any): boolean {
    if (!load?.pickupDate?.date || !load?.deliveryDate?.date || !load?.distance) return true;

    const pickup = new Date(load.pickupDate.date);
    const delivery = new Date(load.deliveryDate.date);
    const transitHours = (delivery.getTime() - pickup.getTime()) / (1000 * 60 * 60);
    const impliedSpeed = load.distance / transitHours;

    return impliedSpeed >= this.MIN_TRANSIT_SPEED && impliedSpeed <= this.MAX_TRANSIT_SPEED;
  }

  private validateEquipmentMatch(load: any): boolean {
    if (!load?.equipmentType || !load?.commodity) return true;

    // Basic equipment matching logic
    const refrigeratedGoods = ['food', 'produce', 'frozen', 'pharmaceutical'];
    const needsReefer = refrigeratedGoods.some(g =>
      load.commodity.toLowerCase().includes(g)
    );

    if (needsReefer && load.equipmentType !== 'reefer') {
      return false;
    }

    return true;
  }

  private identifyIssues(
    consistencyChecks: any,
    completeness: any,
    crossAgentValidation: any,
    logicalValidation: any
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    let issueId = 1;

    // Add consistency issues
    for (const [key, check] of Object.entries(consistencyChecks) as [string, any][]) {
      if (check && !check.isConsistent && check.conflicts) {
        for (const conflict of check.conflicts) {
          issues.push({
            id: `issue_${issueId++}`,
            severity: this.issueSeverity(key, conflict),
            category: 'consistency',
            issue: {
              field: conflict.field1,
              description: check.details,
              expectedValue: conflict.value1,
              actualValue: conflict.value2,
              affectedAgents: this.getAffectedAgents(key)
            },
            resolution: {
              suggested: conflict.resolution,
              autoFixable: false
            },
            impact: this.assessImpact(key),
            confidence: 0.8
          });
        }
      }
    }

    // Add completeness issues
    for (const field of completeness.missingCritical) {
      issues.push({
        id: `issue_${issueId++}`,
        severity: 'critical',
        category: 'completeness',
        issue: {
          field,
          description: `Required field "${field}" is missing`,
          affectedAgents: [this.getResponsibleAgent(field)]
        },
        resolution: {
          suggested: `Extract ${field} from transcript or request from user`,
          autoFixable: false
        },
        impact: {
          affectsRate: field === 'rate',
          affectsSchedule: field.includes('date'),
          affectsAgreement: true,
          userActionRequired: true
        },
        confidence: 0.9
      });
    }

    // Add logical validation issues
    for (const [key, valid] of Object.entries(logicalValidation)) {
      if (!valid) {
        issues.push({
          id: `issue_${issueId++}`,
          severity: 'warning',
          category: 'logic',
          issue: {
            field: key,
            description: `Logical validation failed: ${key}`,
            affectedAgents: this.getAffectedAgents(key)
          },
          resolution: {
            suggested: this.getLogicalResolution(key),
            autoFixable: false
          },
          impact: this.assessImpact(key),
          confidence: 0.7
        });
      }
    }

    return issues;
  }

  private issueSeverity(key: string, conflict: any): 'critical' | 'warning' | 'info' {
    if (key === 'rateVsLoadMatch' || key === 'dateLogicValid') return 'critical';
    if (key === 'conditionsFulfillment') return 'warning';
    return 'info';
  }

  private getAffectedAgents(key: string): string[] {
    const agentMap: Record<string, string[]> = {
      rateVsLoadMatch: ['load_extraction', 'rate_negotiation', 'simple_rate_extraction'],
      dateLogicValid: ['load_extraction', 'temporal_resolution'],
      speakerConsistency: ['speaker_identification', 'classification'],
      conditionsFulfillment: ['conditional_agreement', 'rate_negotiation'],
      accessorialLogic: ['accessorial_parser', 'simple_rate_extraction']
    };
    return agentMap[key] || [];
  }

  private getResponsibleAgent(field: string): string {
    const agentMap: Record<string, string> = {
      origin: 'load_extraction',
      destination: 'load_extraction',
      rate: 'rate_negotiation',
      carrier_info: 'carrier_information',
      shipper_info: 'shipper_information'
    };
    return agentMap[field] || 'unknown';
  }

  private assessImpact(key: string): any {
    const impactMap: Record<string, any> = {
      rateVsLoadMatch: {
        affectsRate: true,
        affectsSchedule: false,
        affectsAgreement: true,
        userActionRequired: false
      },
      dateLogicValid: {
        affectsRate: false,
        affectsSchedule: true,
        affectsAgreement: true,
        userActionRequired: true
      }
    };
    return impactMap[key] || {
      affectsRate: false,
      affectsSchedule: false,
      affectsAgreement: false,
      userActionRequired: false
    };
  }

  private getLogicalResolution(key: string): string {
    const resolutions: Record<string, string> = {
      pickupBeforeDelivery: 'Adjust delivery date to be after pickup',
      rateWithinMarketRange: 'Verify rate is correct or flag for review',
      distanceReasonable: 'Verify distance calculation',
      timingFeasible: 'Adjust transit time or verify urgency',
      equipmentMatchesCommodity: 'Verify equipment type matches commodity requirements'
    };
    return resolutions[key] || 'Manual review required';
  }

  private applyAutoCorrections(issues: ValidationIssue[], outputs: Map<string, any>): any[] {
    const corrections = [];

    for (const issue of issues) {
      if (issue.resolution.autoFixable) {
        // Apply specific auto-corrections
        // This is simplified - real implementation would modify the outputs
        corrections.push({
          field: issue.issue.field,
          originalValue: issue.issue.actualValue,
          correctedValue: issue.issue.expectedValue,
          reason: issue.issue.description,
          confidence: issue.confidence
        });
      }
    }

    return corrections;
  }

  private generateRecommendations(issues: ValidationIssue[], completeness: any): any[] {
    const recommendations = [];

    // High priority: Critical missing fields
    if (completeness.missingCritical.length > 0) {
      recommendations.push({
        type: 'missing_info',
        priority: 'high',
        description: `Critical fields missing: ${completeness.missingCritical.join(', ')}`,
        action: 'Request missing information from user or re-process transcript'
      });
    }

    // Medium priority: Data conflicts
    const conflicts = issues.filter(i => i.category === 'consistency');
    if (conflicts.length > 0) {
      recommendations.push({
        type: 'verification',
        priority: 'medium',
        description: `${conflicts.length} data conflicts need resolution`,
        action: 'Review and resolve conflicts before finalizing'
      });
    }

    // Low priority: Quality improvements
    if (completeness.dataQuality === 'low') {
      recommendations.push({
        type: 'data_quality',
        priority: 'low',
        description: 'Overall data quality is low',
        action: 'Consider manual review or re-processing with different parameters'
      });
    }

    return recommendations;
  }

  private calculateQualityMetrics(outputs: Map<string, any>, issues: ValidationIssue[]): any {
    const agentPerformance: any = {};

    for (const [agentName, output] of outputs) {
      const agentIssues = issues.filter(i =>
        i.issue.affectedAgents.includes(agentName)
      );

      agentPerformance[agentName] = {
        reliability: output?.confidence?.value || 0.5,
        issueCount: agentIssues.length
      };
    }

    const confidences = Array.from(outputs.values())
      .map(o => o?.confidence?.value || 0)
      .filter(c => c > 0);

    const high = confidences.filter(c => c > 0.8).length;
    const medium = confidences.filter(c => c > 0.5 && c <= 0.8).length;
    const low = confidences.filter(c => c <= 0.5).length;
    const total = confidences.length || 1;

    return {
      extractionQuality: confidences.reduce((a, b) => a + b, 0) / total,
      confidenceDistribution: {
        high: (high / total) * 100,
        medium: (medium / total) * 100,
        low: (low / total) * 100
      },
      agentPerformance
    };
  }

  private calculateValidationStatus(
    consistencyChecks: any,
    completeness: any,
    issues: ValidationIssue[]
  ): ValidationOutput['validationStatus'] {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const isValid = criticalIssues.length === 0;

    const consistencyScore = Object.values(consistencyChecks)
      .filter((c: any) => c.isConsistent).length / Object.keys(consistencyChecks).length;

    const completenessScore = completeness.requiredFields.filter((f: any) => f.present).length /
      completeness.requiredFields.length;

    const reliabilityScore = issues.length === 0 ? 1.0
      : Math.max(0, 1 - (issues.length * 0.05));

    const overallScore = ((consistencyScore + completenessScore + reliabilityScore) / 3) * 100;

    return {
      isValid,
      completeness: completenessScore,
      consistency: consistencyScore,
      reliability: reliabilityScore,
      overallScore: Math.round(overallScore)
    };
  }

  private getValidationCompleteness(outputs: Map<string, any>): number {
    const expectedAgents = 10; // Adjust based on call type
    const actualAgents = outputs.size;
    return Math.min(1, actualAgents / expectedAgents);
  }

  getDefaultOutput(): ValidationOutput {
    return {
      validationStatus: {
        isValid: true,
        completeness: 0,
        consistency: 0,
        reliability: 0,
        overallScore: 0
      },
      issues: [],
      consistencyChecks: {
        rateVsLoadMatch: { category: 'rate_load_matching', isConsistent: true, details: 'No data to validate' },
        dateLogicValid: { category: 'date_logic', isConsistent: true, details: 'No data to validate' },
        speakerConsistency: { category: 'speaker_consistency', isConsistent: true, details: 'No data to validate' },
        referenceResolution: { category: 'reference_resolution', isConsistent: true, details: 'No data to validate' },
        conditionsFulfillment: { category: 'conditions_fulfillment', isConsistent: true, details: 'No data to validate' },
        accessorialLogic: { category: 'accessorial_logic', isConsistent: true, details: 'No data to validate' }
      },
      completeness: {
        requiredFields: [],
        missingCritical: [],
        missingOptional: [],
        dataQuality: 'low'
      },
      crossAgentValidation: {
        agentConflicts: [],
        agentAgreement: 0
      },
      logicalValidation: {
        pickupBeforeDelivery: true,
        rateWithinMarketRange: true,
        distanceReasonable: true,
        timingFeasible: true,
        equipmentMatchesCommodity: true
      },
      corrections: [],
      recommendations: [],
      qualityMetrics: {
        extractionQuality: 0,
        confidenceDistribution: {
          high: 0,
          medium: 0,
          low: 100
        },
        agentPerformance: {}
      },
      confidence: {
        value: 0.3,
        level: 'low',
        factors: ['No data to validate']
      }
    };
  }

  validateOutput(output: any): boolean {
    return (
      output &&
      output.validationStatus &&
      Array.isArray(output.issues) &&
      output.consistencyChecks &&
      output.confidence
    );
  }
}