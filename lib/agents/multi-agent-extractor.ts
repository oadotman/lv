/**
 * Multi-Agent Extraction System Entry Point
 * Integrates with existing LoadVoice infrastructure
 */

import { ExtractionOrchestrator } from './orchestrator';
import { AgentRegistry } from './agent-registry';
import { AssemblyAIUtterance } from '../assemblyai';
import { CallMetadata, ExtractionResult } from './types';

/**
 * Main interface to the multi-agent extraction system
 */
export class MultiAgentExtractor {
  private orchestrator: ExtractionOrchestrator;
  private registry: AgentRegistry;
  private initialized: boolean = false;

  constructor() {
    this.orchestrator = new ExtractionOrchestrator();
    this.registry = AgentRegistry.getInstance();
  }

  /**
   * Initialize the system with all agents
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize registry with all agents
    this.registry.initialize();

    // Register agents with orchestrator
    const agents = this.registry.getAllAgents();
    for (const agent of agents) {
      this.orchestrator.registerAgent(agent);
    }

    this.initialized = true;
    console.log(`Multi-agent system initialized with ${agents.length} agents`);
  }

  /**
   * Extract data from a call transcript
   */
  async extract(
    transcript: string,
    utterances: AssemblyAIUtterance[],
    metadata: CallMetadata
  ): Promise<ExtractionResult> {
    // Ensure system is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Run extraction through orchestrator
    return await this.orchestrator.extract(transcript, utterances, metadata);
  }

  /**
   * Get feature flag status for multi-agent extraction
   */
  static async shouldUseMultiAgent(
    organizationId: string,
    percentage: number = 10
  ): Promise<boolean> {
    // Check environment variable override
    if (process.env.FORCE_MULTI_AGENT === 'true') return true;
    if (process.env.FORCE_MULTI_AGENT === 'false') return false;

    // Check organization-specific flag
    // In production, this would check database or feature flag service
    const orgOverride = await this.getOrgFeatureFlag(organizationId);
    if (orgOverride !== null) return orgOverride;

    // Random percentage rollout
    return Math.random() * 100 < percentage;
  }

  /**
   * Get organization-specific feature flag
   */
  private static async getOrgFeatureFlag(organizationId: string): Promise<boolean | null> {
    // This would query database for org-specific settings
    // For now, return null to use percentage-based rollout
    return null;
  }

  /**
   * Convert extraction result to legacy format for compatibility
   */
  static toLegacyFormat(result: ExtractionResult): any {
    const legacy: any = {
      success: result.success,
      summary: result.summary?.executiveSummary || '',
      sentiment: 'neutral',
      action_items: result.summary?.actionItems || [],
      next_steps: result.summary?.nextSteps || []
    };

    // Map classification
    if (result.classification) {
      legacy.call_type = result.classification.primaryType;
      legacy.confidence_score = result.classification.confidence.value;
    }

    // Map loads
    if (result.loads) {
      legacy.loads = result.loads.loads;
      legacy.multi_load = result.loads.multiLoadCall;
    }

    // Map negotiation
    if (result.negotiation) {
      const firstNegotiation = result.negotiation.negotiations[0];
      if (firstNegotiation) {
        legacy.negotiation_status = firstNegotiation.status;
        legacy.agreed_rate = firstNegotiation.agreedRate;
        legacy.rate_type = firstNegotiation.rateType;
      }
    }

    // Add metadata
    legacy.extraction_method = 'multi_agent';
    legacy.agents_executed = result.agentsExecuted?.length || 0;
    legacy.total_tokens = result.tokensUsed || 0;
    legacy.warnings = result.warnings || [];

    return legacy;
  }

  /**
   * Compare multi-agent extraction with monolithic extraction
   */
  static async compareExtractions(
    multiAgentResult: ExtractionResult,
    monolithicResult: any
  ): Promise<{
    agreement: number;
    differences: string[];
    recommendation: 'use_multi_agent' | 'use_monolithic' | 'needs_review';
  }> {
    const differences: string[] = [];
    let matchCount = 0;
    let totalFields = 0;

    // Compare key fields
    const comparisons = [
      {
        field: 'call_type',
        multi: multiAgentResult.classification?.primaryType,
        mono: monolithicResult.call_type
      },
      {
        field: 'agreed_rate',
        multi: multiAgentResult.negotiation?.negotiations[0]?.agreedRate,
        mono: monolithicResult.negotiation_outcome?.agreed_rate
      },
      {
        field: 'load_count',
        multi: multiAgentResult.loads?.loads.length,
        mono: monolithicResult.loads?.length
      }
    ];

    for (const comp of comparisons) {
      totalFields++;
      if (comp.multi === comp.mono) {
        matchCount++;
      } else {
        differences.push(`${comp.field}: multi=${comp.multi}, mono=${comp.mono}`);
      }
    }

    const agreement = (matchCount / totalFields) * 100;

    // Determine recommendation
    let recommendation: 'use_multi_agent' | 'use_monolithic' | 'needs_review';
    if (agreement >= 90) {
      // High agreement, prefer multi-agent for better structure
      recommendation = 'use_multi_agent';
    } else if (agreement >= 70) {
      // Moderate agreement, use multi-agent but flag for review
      recommendation = 'use_multi_agent';
    } else {
      // Low agreement, needs human review
      recommendation = 'needs_review';
    }

    return {
      agreement,
      differences,
      recommendation
    };
  }

  /**
   * Get system status and statistics
   */
  getStatus(): {
    initialized: boolean;
    agentCount: number;
    registeredAgents: string[];
  } {
    return {
      initialized: this.initialized,
      agentCount: this.orchestrator.getRegisteredAgents().length,
      registeredAgents: this.orchestrator.getRegisteredAgents()
    };
  }
}

/**
 * Singleton instance for easy access
 */
let extractorInstance: MultiAgentExtractor | null = null;

export function getMultiAgentExtractor(): MultiAgentExtractor {
  if (!extractorInstance) {
    extractorInstance = new MultiAgentExtractor();
  }
  return extractorInstance;
}