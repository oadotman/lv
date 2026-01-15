/**
 * Agent Context manages shared state and data flow between agents
 */

import { AssemblyAIUtterance } from '../assemblyai';
import {
  AgentContextData,
  AgentExecutionResult,
  AgentExecutionLog,
  AgentStatus,
  CallMetadata,
  ClassificationOutput,
  SpeakerOutput,
  LoadExtractionOutput,
  RateNegotiationOutput,
  TemporalOutput,
  ValidationOutput,
  SummaryOutput
} from './types';

export class AgentContext implements AgentContextData {
  public readonly transcript: string;
  public readonly utterances: AssemblyAIUtterance[];
  public readonly metadata: CallMetadata;

  public agentOutputs: Map<string, AgentExecutionResult>;
  public sharedState: Map<string, any>;
  public executionLog: AgentExecutionLog[];

  private startTime: Date;
  private totalTokensUsed: number = 0;

  constructor(
    transcript: string,
    utterances: AssemblyAIUtterance[],
    metadata: CallMetadata
  ) {
    this.transcript = transcript;
    this.utterances = utterances;
    this.metadata = metadata;

    this.agentOutputs = new Map();
    this.sharedState = new Map();
    this.executionLog = [];
    this.startTime = new Date();
  }

  /**
   * Add an agent's output to the context
   */
  addAgentOutput(agentName: string, result: AgentExecutionResult): void {
    this.agentOutputs.set(agentName, result);

    // Track tokens
    if (result.tokensUsed) {
      this.totalTokensUsed += result.tokensUsed;
    }

    // Update execution log
    const logEntry = this.executionLog.find(e => e.agentName === agentName);
    if (logEntry) {
      logEntry.endTime = new Date();
      logEntry.status = result.status;
      if (result.error) {
        logEntry.error = result.error.message;
      }
    }
  }

  /**
   * Start tracking an agent's execution
   */
  startAgentExecution(agentName: string): void {
    this.executionLog.push({
      agentName,
      startTime: new Date(),
      status: 'running' as AgentStatus
    });
  }

  /**
   * Get output from a specific agent (typed)
   */
  getAgentOutput<T>(agentName: string): T | undefined {
    const result = this.agentOutputs.get(agentName);
    return result?.output as T | undefined;
  }

  /**
   * Check if an agent has completed successfully
   */
  hasAgentCompleted(agentName: string): boolean {
    const result = this.agentOutputs.get(agentName);
    return result?.status === 'completed';
  }

  /**
   * Get all agent outputs of a specific status
   */
  getAgentsByStatus(status: AgentStatus): string[] {
    return Array.from(this.agentOutputs.entries())
      .filter(([_, result]) => result.status === status)
      .map(([name, _]) => name);
  }

  /**
   * Set shared state value
   */
  setSharedState(key: string, value: any): void {
    this.sharedState.set(key, value);
  }

  /**
   * Get shared state value
   */
  getSharedState<T>(key: string): T | undefined {
    return this.sharedState.get(key) as T | undefined;
  }

  /**
   * Get total execution time
   */
  getTotalExecutionTime(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Get total tokens used
   */
  getTotalTokensUsed(): number {
    return this.totalTokensUsed;
  }

  /**
   * Get execution summary
   */
  getExecutionSummary(): {
    totalAgents: number;
    completed: number;
    failed: number;
    skipped: number;
    totalTime: number;
    totalTokens: number;
  } {
    const statuses = Array.from(this.agentOutputs.values()).map(r => r.status);

    return {
      totalAgents: this.agentOutputs.size,
      completed: statuses.filter(s => s === 'completed').length,
      failed: statuses.filter(s => s === 'failed').length,
      skipped: statuses.filter(s => s === 'skipped').length,
      totalTime: this.getTotalExecutionTime(),
      totalTokens: this.totalTokensUsed
    };
  }

  /**
   * Typed getters for common agent outputs
   */
  get classification(): ClassificationOutput | undefined {
    return this.getAgentOutput<ClassificationOutput>('classification');
  }

  get speakers(): SpeakerOutput | undefined {
    return this.getAgentOutput<SpeakerOutput>('speaker_identification');
  }

  get loads(): LoadExtractionOutput | undefined {
    return this.getAgentOutput<LoadExtractionOutput>('load_extraction');
  }

  get negotiation(): RateNegotiationOutput | undefined {
    return this.getAgentOutput<RateNegotiationOutput>('rate_negotiation');
  }

  get temporal(): TemporalOutput | undefined {
    return this.getAgentOutput<TemporalOutput>('temporal_resolution');
  }

  get validation(): ValidationOutput | undefined {
    return this.getAgentOutput<ValidationOutput>('validation');
  }

  get summary(): SummaryOutput | undefined {
    return this.getAgentOutput<SummaryOutput>('summary');
  }

  /**
   * Check if this is a specific call type
   */
  isCallType(type: string): boolean {
    return this.classification?.primaryType === type;
  }

  /**
   * Get warnings from all agents
   */
  getAllWarnings(): string[] {
    const warnings: string[] = [];

    for (const result of this.agentOutputs.values()) {
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    }

    return warnings;
  }

  /**
   * Check if human review is required
   */
  requiresHumanReview(): boolean {
    // Check validation agent
    if (this.validation?.requiresHumanReview) {
      return true;
    }

    // Check for critical warnings
    if (this.validation?.warnings.some(w => w.severity === 'critical')) {
      return true;
    }

    // Check for low confidence in key areas
    if (this.classification && this.classification.confidence.value < 0.5) {
      return true;
    }

    if (this.negotiation) {
      const hasLowConfidenceAgreement = this.negotiation.negotiations.some(
        n => n.status === 'agreed' && n.confidence < 0.6
      );
      if (hasLowConfidenceAgreement) {
        return true;
      }
    }

    // Check for failed critical agents
    const criticalAgents = ['classification', 'validation'];
    for (const agentName of criticalAgents) {
      const result = this.agentOutputs.get(agentName);
      if (result && result.status === 'failed') {
        return true;
      }
    }

    return false;
  }

  /**
   * Export context for debugging
   */
  toDebugObject(): any {
    return {
      metadata: this.metadata,
      executionSummary: this.getExecutionSummary(),
      executionLog: this.executionLog,
      agentOutputs: Object.fromEntries(this.agentOutputs),
      sharedState: Object.fromEntries(this.sharedState),
      warnings: this.getAllWarnings(),
      requiresReview: this.requiresHumanReview()
    };
  }

  /**
   * Create a snapshot of the context (for rollback/recovery)
   */
  createSnapshot(): string {
    return JSON.stringify({
      agentOutputs: Array.from(this.agentOutputs.entries()),
      sharedState: Array.from(this.sharedState.entries()),
      executionLog: this.executionLog,
      totalTokensUsed: this.totalTokensUsed
    });
  }

  /**
   * Restore from a snapshot
   */
  restoreFromSnapshot(snapshot: string): void {
    try {
      const data = JSON.parse(snapshot);
      this.agentOutputs = new Map(data.agentOutputs);
      this.sharedState = new Map(data.sharedState);
      this.executionLog = data.executionLog;
      this.totalTokensUsed = data.totalTokensUsed;
    } catch (error) {
      throw new Error(`Failed to restore context from snapshot: ${error}`);
    }
  }
}