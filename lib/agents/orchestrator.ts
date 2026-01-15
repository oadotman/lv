/**
 * Orchestrator manages the execution of multiple agents in the correct order
 */

import { AgentContext } from './agent-context';
import { BaseAgent } from './base-agent';
import {
  IAgent,
  CallMetadata,
  ExtractionResult,
  AgentExecutionResult,
  AgentExecutionConfig,
  OrchestrationPlan,
  CallType
} from './types';
import { AssemblyAIUtterance } from '../assemblyai';
import { AgentLogger } from './agent-logger';

interface AgentRegistration {
  agent: IAgent;
  config: AgentExecutionConfig;
  dependencies: string[];
}

export class ExtractionOrchestrator {
  private agents: Map<string, AgentRegistration> = new Map();
  private logger: AgentLogger;
  private defaultTimeout: number = 30000;
  private maxRetries: number = 1;

  constructor() {
    this.logger = new AgentLogger();
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: IAgent): void {
    this.agents.set(agent.name, {
      agent,
      config: agent.config,
      dependencies: agent.dependencies || []
    });

    this.logger.log(`Registered agent: ${agent.name} v${agent.version}`);
  }

  /**
   * Main extraction method
   */
  async extract(
    transcript: string,
    utterances: AssemblyAIUtterance[],
    metadata: CallMetadata
  ): Promise<ExtractionResult> {
    const context = new AgentContext(transcript, utterances, metadata);
    const executionStartTime = Date.now();

    try {
      // Phase 1: Classification (always runs first)
      await this.executeAgent('classification', context);

      // Early exit for wrong numbers
      if (context.classification?.primaryType === 'wrong_number') {
        return this.buildEarlyExitResult(context, 'wrong_number');
      }

      // Build execution plan based on classification
      const plan = this.buildExecutionPlan(context);

      // Execute the plan
      await this.executePlan(plan, context);

      // Build final result
      return this.buildExtractionResult(context, true);

    } catch (error) {
      this.logger.error('Orchestration failed', error);

      // Try fallback extraction
      if (this.shouldUseFallback(error)) {
        return this.fallbackExtraction(transcript, metadata);
      }

      return this.buildExtractionResult(context, false);
    } finally {
      const executionTime = Date.now() - executionStartTime;
      this.logger.logPerformance({
        totalTime: executionTime,
        tokensUsed: context.getTotalTokensUsed(),
        agentsExecuted: context.getAgentsByStatus('completed').length,
        agentsFailed: context.getAgentsByStatus('failed').length
      });
    }
  }

  /**
   * Execute a single agent
   */
  private async executeAgent(
    agentName: string,
    context: AgentContext,
    retryCount: number = 0
  ): Promise<AgentExecutionResult> {
    const registration = this.agents.get(agentName);

    if (!registration) {
      throw new Error(`Agent ${agentName} not registered`);
    }

    const { agent, config } = registration;

    // Check if agent should execute
    if (!agent.shouldExecute(context)) {
      const result: AgentExecutionResult = {
        agentName,
        status: 'skipped',
        executionTime: 0,
        warnings: [`Agent ${agentName} skipped - preconditions not met`]
      };
      context.addAgentOutput(agentName, result);
      return result;
    }

    // Start execution tracking
    context.startAgentExecution(agentName);
    const startTime = Date.now();

    try {
      // Execute with timeout
      const output = await this.withTimeout(
        agent.execute(context),
        config.timeout || this.defaultTimeout
      );

      // Validate output
      if (!agent.validateOutput(output)) {
        throw new Error(`Invalid output from agent ${agentName}`);
      }

      // Success
      const result: AgentExecutionResult = {
        agentName,
        status: 'completed',
        output,
        executionTime: Date.now() - startTime,
        tokensUsed: output.tokensUsed
      };

      context.addAgentOutput(agentName, result);
      this.logger.logAgentSuccess(agentName, result);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Handle error
      const agentError = agent.handleError(error as Error);

      // Retry if recoverable and retries remaining
      if (agentError.recoverable && retryCount < this.maxRetries && config.retryOnFailure) {
        this.logger.log(`Retrying agent ${agentName} (attempt ${retryCount + 1})`);
        return this.executeAgent(agentName, context, retryCount + 1);
      }

      // Use default output if not critical
      if (!config.critical) {
        const defaultOutput = agent.getDefaultOutput();
        const result: AgentExecutionResult = {
          agentName,
          status: 'failed',
          output: defaultOutput,
          error: agentError,
          executionTime,
          warnings: [`Agent ${agentName} failed, using default output`]
        };

        context.addAgentOutput(agentName, result);
        this.logger.logAgentFailure(agentName, agentError);

        return result;
      }

      // Critical failure
      throw new Error(`Critical agent ${agentName} failed: ${agentError.message}`);
    }
  }

  /**
   * Build execution plan based on call classification
   */
  private buildExecutionPlan(context: AgentContext): OrchestrationPlan {
    const classification = context.classification;

    if (!classification) {
      throw new Error('Classification required to build execution plan');
    }

    const plan: OrchestrationPlan = {
      phases: [],
      fallbackStrategy: 'partial_extraction'
    };

    // Phase 1: Foundation agents (always run)
    plan.phases.push({
      name: 'foundation',
      parallel: true,
      agents: [
        { name: 'speaker_identification', config: { parallel: true } },
        { name: 'temporal_resolution', config: { parallel: true } }
      ]
    });

    // Phase 2: Type-specific extraction
    switch (classification.primaryType) {
      case 'carrier_quote':
        plan.phases.push({
          name: 'carrier_extraction',
          parallel: false,
          agents: [
            { name: 'carrier_information', config: {} },
            { name: 'load_extraction', config: { optional: true } },
            { name: 'rate_negotiation', config: {} },
            { name: 'conditional_agreement', config: {} },
            { name: 'accessorial_parser', config: {} }
          ]
        });
        break;

      case 'new_booking':
        plan.phases.push({
          name: 'booking_extraction',
          parallel: false,
          agents: [
            { name: 'shipper_information', config: {} },
            { name: 'load_extraction', config: { critical: true } },
            { name: 'action_items', config: {} }
          ]
        });
        break;

      case 'check_call':
        plan.phases.push({
          name: 'check_extraction',
          parallel: false,
          agents: [
            { name: 'load_extraction', config: { optional: true } },
            { name: 'status_update', config: {} },
            { name: 'action_items', config: {} }
          ]
        });
        break;

      case 'renegotiation':
        plan.phases.push({
          name: 'renegotiation_extraction',
          parallel: false,
          agents: [
            { name: 'reference_resolution', config: { critical: true } },
            { name: 'rate_negotiation', config: { critical: true } },
            { name: 'conditional_agreement', config: {} }
          ]
        });
        break;

      case 'callback_acceptance':
        plan.phases.push({
          name: 'callback_extraction',
          parallel: false,
          agents: [
            { name: 'reference_resolution', config: {} },
            { name: 'carrier_information', config: {} },
            { name: 'rate_negotiation', config: {} }
          ]
        });
        break;

      default:
        plan.phases.push({
          name: 'generic_extraction',
          parallel: false,
          agents: [
            { name: 'load_extraction', config: { optional: true } },
            { name: 'action_items', config: {} }
          ]
        });
    }

    // Phase 3: Validation and summary (always run last)
    plan.phases.push({
      name: 'finalization',
      parallel: false,
      agents: [
        { name: 'validation', config: {} },
        { name: 'summary', config: {} }
      ]
    });

    return plan;
  }

  /**
   * Execute an orchestration plan
   */
  private async executePlan(plan: OrchestrationPlan, context: AgentContext): Promise<void> {
    for (const phase of plan.phases) {
      this.logger.log(`Executing phase: ${phase.name}`);

      if (phase.parallel) {
        // Execute agents in parallel
        const promises = phase.agents.map(agentSpec =>
          this.executeAgent(agentSpec.name, context)
        );

        await Promise.allSettled(promises);
      } else {
        // Execute agents sequentially
        for (const agentSpec of phase.agents) {
          const registration = this.agents.get(agentSpec.name);

          // Skip if agent not registered
          if (!registration) {
            this.logger.warn(`Agent ${agentSpec.name} not registered, skipping`);
            continue;
          }

          // Check dependencies
          const depsmet = this.checkDependencies(agentSpec.name, context);
          if (!depsmet && !agentSpec.config.optional) {
            this.logger.warn(`Dependencies not met for ${agentSpec.name}`);
            continue;
          }

          // Execute agent
          await this.executeAgent(agentSpec.name, context);
        }
      }
    }
  }

  /**
   * Check if agent dependencies are met
   */
  private checkDependencies(agentName: string, context: AgentContext): boolean {
    const registration = this.agents.get(agentName);

    if (!registration || !registration.dependencies) {
      return true;
    }

    for (const dep of registration.dependencies) {
      if (!context.hasAgentCompleted(dep)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute with timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Build extraction result from context
   */
  private buildExtractionResult(context: AgentContext, success: boolean): ExtractionResult {
    const summary = context.getExecutionSummary();

    return {
      success,
      classification: context.classification,
      speakers: context.speakers,
      loads: context.loads,
      negotiation: context.negotiation,
      temporal: context.temporal,
      validation: context.validation,
      summary: context.summary,

      executionTime: summary.totalTime,
      tokensUsed: summary.totalTokens,
      agentsExecuted: context.getAgentsByStatus('completed'),
      agentsFailed: context.getAgentsByStatus('failed'),
      warnings: context.getAllWarnings(),

      rawAgentOutputs: process.env.NODE_ENV === 'development' ? context.agentOutputs : undefined
    };
  }

  /**
   * Build early exit result
   */
  private buildEarlyExitResult(context: AgentContext, reason: string): ExtractionResult {
    return {
      success: true,
      classification: context.classification,
      executionTime: context.getTotalExecutionTime(),
      tokensUsed: context.getTotalTokensUsed(),
      agentsExecuted: ['classification'],
      agentsFailed: [],
      warnings: [`Early exit: ${reason}`]
    };
  }

  /**
   * Determine if fallback should be used
   */
  private shouldUseFallback(error: any): boolean {
    // Don't fallback for timeout errors
    if (error.message?.includes('timeout')) {
      return false;
    }

    // Don't fallback for API errors
    if (error.message?.includes('API')) {
      return false;
    }

    return true;
  }

  /**
   * Fallback extraction using simplified approach
   */
  private async fallbackExtraction(
    transcript: string,
    metadata: CallMetadata
  ): Promise<ExtractionResult> {
    this.logger.warn('Using fallback extraction');

    // Use existing monolithic extraction as fallback
    try {
      const { extractFreightData } = await import('../openai-loadvoice');
      const extraction = await extractFreightData(transcript, metadata.callType as any);

      return {
        success: true,
        executionTime: 0,
        tokensUsed: 0,
        agentsExecuted: ['fallback'],
        agentsFailed: [],
        warnings: ['Used fallback extraction'],
        // Map monolithic extraction to our format
        // This would need proper mapping based on your monolithic output
      };
    } catch (fallbackError) {
      this.logger.error('Fallback extraction also failed', fallbackError);

      return {
        success: false,
        executionTime: 0,
        tokensUsed: 0,
        agentsExecuted: [],
        agentsFailed: ['fallback'],
        warnings: ['All extraction methods failed']
      };
    }
  }

  /**
   * Get registered agents
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Clear all registered agents
   */
  clearAgents(): void {
    this.agents.clear();
  }
}
// Export alias for compatibility
export { ExtractionOrchestrator as Orchestrator };
