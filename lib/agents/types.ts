/**
 * Core types and interfaces for the multi-agent extraction system
 */

import { AssemblyAIUtterance } from '../assemblyai';

// ============================================
// Base Types
// ============================================

export type CallType =
  | 'new_booking'
  | 'carrier_quote'
  | 'check_call'
  | 'renegotiation'
  | 'callback_acceptance'
  | 'wrong_number'
  | 'voicemail';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceScore {
  value: number; // 0-1
  level: ConfidenceLevel;
  factors?: string[];
}

// ============================================
// Agent Execution Types
// ============================================

export interface AgentExecutionConfig {
  timeout?: number;           // ms, default 30000
  retryOnFailure?: boolean;  // default false
  critical?: boolean;         // if true, failure stops pipeline
  parallel?: boolean;         // can run in parallel with others
  optional?: boolean;         // can be skipped if deps fail
}

export interface AgentExecutionResult<T = any> {
  agentName: string;
  status: AgentStatus;
  output?: T;
  error?: AgentError;
  executionTime: number; // ms
  tokensUsed?: number;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: any;
}

// ============================================
// Context Types
// ============================================

export interface CallMetadata {
  callId: string;
  organizationId: string;
  userId?: string;
  callType?: string;
  callDate: Date;
  duration?: number; // seconds
  customerName?: string;
  templateId?: string;
  timezone?: string; // Timezone for the call location
}

export interface AgentContextData {
  // Original inputs
  transcript: string;
  utterances: AssemblyAIUtterance[];
  metadata: CallMetadata;

  // Agent outputs (accumulated)
  agentOutputs: Map<string, AgentExecutionResult>;

  // Shared state
  sharedState: Map<string, any>;

  // Execution tracking
  executionLog: AgentExecutionLog[];

  // Methods for accessing agent outputs
  getAgentOutput<T>(agentName: string): T | undefined;
}

export interface AgentExecutionLog {
  agentName: string;
  startTime: Date;
  endTime?: Date;
  status: AgentStatus;
  error?: string;
}

// ============================================
// Agent Input/Output Types
// ============================================

export interface BaseAgentInput {
  transcript: string;
  utterances: AssemblyAIUtterance[];
  metadata: CallMetadata;
}

export interface BaseAgentOutput {
  confidence: ConfidenceScore;
  processingNotes?: string[];
}

// Classification Agent Types
export interface ClassificationOutput extends BaseAgentOutput {
  primaryType: CallType;
  subTypes?: string[];
  indicators: string[];
  multiLoadCall: boolean;
  continuationCall: boolean;
}

// Speaker Identification Types
export interface SpeakerRole {
  role: 'broker' | 'carrier' | 'shipper' | 'driver' | 'dispatcher' | 'unknown';
  confidence: number;
  name?: string;
  company?: string;
}

export interface SpeakerOutput extends BaseAgentOutput {
  speakers: Map<string, SpeakerRole>;
  primarySpeaker: string;
  brokerSpeakerId?: string;
}

// Load Extraction Types
export interface Location {
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  rawText: string;
  confidence: number;
}

export interface DateWindow {
  date?: Date;
  startTime?: Date;
  endTime?: Date;
  isFlexible: boolean;
  rawText: string;
  confidence: number;
}

export interface LoadDetails {
  id: string; // Internal ID for tracking
  origin: Location;
  destination: Location;
  stops?: Location[];
  commodity?: string;
  weight?: number;
  palletCount?: number;
  equipmentType?: string;
  pickupDate?: DateWindow;
  deliveryDate?: DateWindow;
  referenceNumber?: string;
  specialRequirements?: string[];
  distance?: number;
  status: 'discussed' | 'booked' | 'cancelled' | 'modified';
}

export interface LoadExtractionOutput extends BaseAgentOutput {
  loads: LoadDetails[];
  multiLoadCall: boolean;
  loadModifications?: Array<{
    loadId: string;
    changeType: string;
    description: string;
    timestamp?: number;
  }>;
}

// Rate Negotiation Types
export interface RateNegotiationOutput extends BaseAgentOutput {
  negotiations: Array<{
    loadId?: string;
    status: 'agreed' | 'pending' | 'rejected' | 'callback_requested';
    agreedRate?: number;
    rateType: 'flat' | 'per_mile' | 'unknown';
    includesFuel: boolean | 'unknown';

    priceHistory: Array<{
      speaker: string;
      amount: number;
      timestamp?: number;
      type: 'offer' | 'counter' | 'final';
    }>;

    finalPositions: {
      broker: number | null;
      carrier: number | null;
    };

    conditions?: string[];
    confidence: number;
  }>;

  requiresRateConfirmation: boolean;
  negotiationComplexity: 'simple' | 'moderate' | 'complex';
}

// Temporal Resolution Types
export interface TemporalOutput extends BaseAgentOutput {
  resolvedDates: Array<{
    originalText: string;
    resolvedDate?: Date;
    confidence: number;
    type: 'pickup' | 'delivery' | 'availability' | 'deadline' | 'other';
    isApproximate: boolean;
    assumptionsMade?: string[];
  }>;

  timeWindows: Array<{
    start: Date;
    end: Date;
    type: string;
    confidence: number;
  }>;

  timeZone: string;
}

// Validation Types
export interface ValidationWarning {
  severity: 'critical' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
  affectedAgents?: string[];
}

export interface ValidationOutput extends BaseAgentOutput {
  isValid: boolean;
  warnings: ValidationWarning[];

  dataConsistency: {
    rateVsLoadMatch: boolean;
    temporalLogicValid: boolean;
    speakerConsistency: boolean;
    requiredFieldsPresent: boolean;
  };

  confidenceAdjustments: Map<string, number>;
  requiresHumanReview: boolean;
  reviewReasons?: string[];
}

// Summary Types
export interface SummaryOutput extends BaseAgentOutput {
  executiveSummary: string;
  keyPoints: string[];
  actionItems: Array<{
    description: string;
    owner: 'broker' | 'carrier' | 'shipper';
    deadline?: Date;
    priority: 'high' | 'medium' | 'low';
  }>;
  nextSteps: string[];
  warnings?: string[];
}

// ============================================
// Orchestration Types
// ============================================

export interface OrchestrationPlan {
  phases: Array<{
    name: string;
    agents: Array<{
      name: string;
      config: AgentExecutionConfig;
      dependencies?: string[];
    }>;
    parallel: boolean;
  }>;

  fallbackStrategy?: 'use_monolithic' | 'partial_extraction' | 'fail';
}

export interface ExtractionResult {
  success: boolean;
  classification?: ClassificationOutput;
  speakers?: SpeakerOutput;
  loads?: LoadExtractionOutput;
  negotiation?: RateNegotiationOutput;
  temporal?: TemporalOutput;
  validation?: ValidationOutput;
  summary?: SummaryOutput;

  // Metadata
  executionTime: number;
  tokensUsed: number;
  agentsExecuted: string[];
  agentsFailed: string[];
  warnings: string[];

  // Raw outputs for debugging
  rawAgentOutputs?: Map<string, any>;
}

// ============================================
// Agent Interface
// ============================================

export interface IAgent<TInput = any, TOutput = any> {
  name: string;
  version: string;
  description: string;

  // Configuration
  config: AgentExecutionConfig;

  // Dependencies on other agents
  dependencies?: string[];

  // Main execution
  execute(context: AgentContextData, input?: TInput): Promise<TOutput>;

  // Validation
  validateInput(input: any): boolean;
  validateOutput(output: any): boolean;

  // Error handling
  handleError(error: Error): AgentError;
  getDefaultOutput(): TOutput;

  // Helpers
  shouldExecute(context: AgentContextData): boolean;
  getPrompt?(context: AgentContextData): string;
}