/**
 * Agent Registry and Factory
 * Manages agent registration and routing logic
 */

import { IAgent, CallType, OrchestrationPlan, AgentExecutionConfig } from './types';
import { ClassificationAgent } from './implementations/classification-agent';
import { SpeakerIdentificationAgent } from './implementations/speaker-identification-agent';
import { LoadExtractionAgent } from './implementations/load-extraction-agent';
import { CarrierInformationAgent } from './implementations/carrier-information-agent';
import { ShipperInformationAgent } from './implementations/shipper-information-agent';
import { SimpleRateExtractionAgent } from './implementations/simple-rate-extraction-agent';
import { ActionItemsAgent } from './implementations/action-items-agent';
// Phase 4 Advanced Agents
import { RateNegotiationAgent } from './implementations/rate-negotiation-agent';
import { TemporalResolutionAgent } from './implementations/temporal-resolution-agent';
import { ConditionalAgreementAgent } from './implementations/conditional-agreement-agent';
import { AccessorialParserAgent } from './implementations/accessorial-parser-agent';
import { ReferenceResolutionAgent } from './implementations/reference-resolution-agent';
// Phase 5 Validation & Optimization Agents
import { ValidationAgent } from './implementations/validation-agent';
import { SummaryAgent } from './implementations/summary-agent';

/**
 * Central registry for all agents
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, IAgent> = new Map();
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Initialize with all available agents
   */
  initialize(): void {
    if (this.initialized) return;

    // Phase 2 agents (implemented)
    this.register(new ClassificationAgent());
    this.register(new SpeakerIdentificationAgent());

    // Phase 3 agents (implemented)
    this.register(new LoadExtractionAgent());
    this.register(new SimpleRateExtractionAgent());
    this.register(new CarrierInformationAgent());
    this.register(new ShipperInformationAgent());
    this.register(new ActionItemsAgent());

    // Phase 4 agents (advanced - implemented)
    this.register(new RateNegotiationAgent());
    this.register(new TemporalResolutionAgent());
    this.register(new ConditionalAgreementAgent());
    this.register(new AccessorialParserAgent());
    this.register(new ReferenceResolutionAgent());

    // Phase 5 agents (validation - implemented)
    this.register(new ValidationAgent());
    this.register(new SummaryAgent());

    this.initialized = true;
    console.log(`Agent Registry initialized with ${this.agents.size} agents`);
  }

  /**
   * Register an agent
   */
  register(agent: IAgent): void {
    this.agents.set(agent.name, agent);
    console.log(`Registered agent: ${agent.name} v${agent.version}`);
  }

  /**
   * Get an agent by name
   */
  get(name: string): IAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Check if an agent exists
   */
  has(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * Clear all agents (useful for testing)
   */
  clear(): void {
    this.agents.clear();
    this.initialized = false;
  }
}

/**
 * Routing Strategy determines which agents to run based on call classification
 */
export class RoutingStrategy {
  /**
   * Build execution plan based on call type
   */
  static buildExecutionPlan(callType: CallType): OrchestrationPlan {
    const plan: OrchestrationPlan = {
      phases: [],
      fallbackStrategy: 'partial_extraction'
    };

    // Phase 1: Foundation agents (always run after classification)
    plan.phases.push({
      name: 'foundation',
      parallel: true,
      agents: [
        {
          name: 'speaker_identification',
          config: { parallel: true, optional: false }
        },
        {
          name: 'temporal_resolution',
          config: { parallel: true, optional: true }
        },
        {
          name: 'reference_resolution',
          config: { parallel: true, optional: true }
        }
      ]
    });

    // Phase 2: Call type-specific extraction
    const extractionPhase = this.getExtractionPhase(callType);
    if (extractionPhase) {
      plan.phases.push(extractionPhase);
    }

    // Phase 3: Post-processing (Phase 5 agents)
    plan.phases.push({
      name: 'post_processing',
      parallel: false,
      agents: [
        {
          name: 'validation',
          config: { optional: false }
        },
        {
          name: 'summary',
          config: { optional: true }
        }
      ]
    });

    return plan;
  }

  /**
   * Get extraction phase based on call type
   */
  private static getExtractionPhase(callType: CallType): OrchestrationPlan['phases'][0] | null {
    switch (callType) {
      case 'carrier_quote':
        return {
          name: 'carrier_extraction',
          parallel: false,
          agents: [
            {
              name: 'carrier_information',
              config: { critical: true }
            },
            {
              name: 'load_extraction',
              config: { optional: true }
            },
            {
              name: 'simple_rate_extraction',
              config: { critical: false }
            },
            {
              name: 'rate_negotiation',
              config: { critical: true }
            },
            {
              name: 'conditional_agreement',
              config: { optional: false }
            },
            {
              name: 'accessorial_parser',
              config: { optional: true }
            },
            {
              name: 'action_items',
              config: { optional: false }
            }
          ]
        };

      case 'new_booking':
        return {
          name: 'booking_extraction',
          parallel: false,
          agents: [
            {
              name: 'shipper_information',
              config: { critical: true }
            },
            {
              name: 'load_extraction',
              config: { critical: true }
            },
            {
              name: 'simple_rate_extraction',
              config: { optional: true }
            },
            {
              name: 'action_items',
              config: { optional: false }
            }
          ]
        };

      case 'check_call':
        return {
          name: 'check_extraction',
          parallel: false,
          agents: [
            // {
            //   name: 'reference_resolution',
            //   config: { optional: true }
            // },
            {
              name: 'load_extraction',
              config: { optional: true }
            },
            // {
            //   name: 'status_update',
            //   config: { critical: true }
            // },
            {
              name: 'action_items',
              config: { optional: false }
            }
          ]
        };

      case 'renegotiation':
        return {
          name: 'renegotiation_extraction',
          parallel: false,
          agents: [
            {
              name: 'load_extraction',
              config: { optional: true }
            },
            {
              name: 'rate_negotiation',
              config: { critical: true }
            },
            {
              name: 'conditional_agreement',
              config: { optional: false }
            },
            {
              name: 'accessorial_parser',
              config: { optional: true }
            },
            {
              name: 'action_items',
              config: { optional: false }
            }
          ]
        };

      case 'callback_acceptance':
        return {
          name: 'callback_extraction',
          parallel: false,
          agents: [
            {
              name: 'carrier_information',
              config: { optional: true }
            },
            {
              name: 'rate_negotiation',
              config: { critical: true }
            },
            {
              name: 'conditional_agreement',
              config: { optional: false }
            },
            {
              name: 'action_items',
              config: { optional: false }
            }
          ]
        };

      case 'wrong_number':
        // No extraction needed
        return null;

      case 'voicemail':
        return {
          name: 'voicemail_extraction',
          parallel: false,
          agents: [
            // {
            //   name: 'action_items',
            //   config: { optional: false }
            // }
          ]
        };

      default:
        return {
          name: 'generic_extraction',
          parallel: false,
          agents: [
            // {
            //   name: 'load_extraction',
            //   config: { optional: true }
            // },
            // {
            //   name: 'action_items',
            //   config: { optional: false }
            // }
          ]
        };
    }
  }

  /**
   * Get critical agents for a call type
   */
  static getCriticalAgents(callType: CallType): string[] {
    switch (callType) {
      case 'carrier_quote':
        return ['classification', 'carrier_information', 'rate_negotiation'];
      case 'new_booking':
        return ['classification', 'shipper_information', 'load_extraction'];
      case 'check_call':
        return ['classification', 'status_update'];
      case 'renegotiation':
        return ['classification', 'reference_resolution', 'rate_negotiation'];
      case 'callback_acceptance':
        return ['classification', 'reference_resolution'];
      default:
        return ['classification'];
    }
  }

  /**
   * Determine if an agent should run based on context
   */
  static shouldRunAgent(
    agentName: string,
    callType: CallType,
    previousAgentsFailed: string[]
  ): boolean {
    // Always run classification
    if (agentName === 'classification') return true;

    // Check if critical dependencies failed
    const criticalDeps = this.getCriticalDependencies(agentName);
    const criticalFailed = criticalDeps.some(dep => previousAgentsFailed.includes(dep));
    if (criticalFailed) return false;

    // Check if agent is relevant for call type
    return this.isAgentRelevant(agentName, callType);
  }

  /**
   * Get critical dependencies for an agent
   */
  private static getCriticalDependencies(agentName: string): string[] {
    const dependencies: Record<string, string[]> = {
      'speaker_identification': ['classification'],
      'load_extraction': ['classification'],
      'rate_negotiation': ['classification', 'speaker_identification'],
      'carrier_information': ['classification', 'speaker_identification'],
      'shipper_information': ['classification', 'speaker_identification'],
      'validation': ['classification'],
      'summary': ['classification']
    };

    return dependencies[agentName] || [];
  }

  /**
   * Check if agent is relevant for call type
   */
  private static isAgentRelevant(agentName: string, callType: CallType): boolean {
    const relevanceMap: Record<string, CallType[]> = {
      'carrier_information': ['carrier_quote', 'callback_acceptance'],
      'shipper_information': ['new_booking'],
      'rate_negotiation': ['carrier_quote', 'renegotiation', 'callback_acceptance'],
      'load_extraction': ['new_booking', 'carrier_quote', 'check_call'],
      'reference_resolution': ['check_call', 'renegotiation', 'callback_acceptance'],
      'status_update': ['check_call'],
      'action_items': ['new_booking', 'check_call', 'voicemail']
    };

    const relevantFor = relevanceMap[agentName];
    if (!relevantFor) return true; // Run if no specific relevance defined

    return relevantFor.includes(callType);
  }
}

/**
 * Agent execution coordinator
 */
export class AgentCoordinator {
  private registry: AgentRegistry;

  constructor() {
    this.registry = AgentRegistry.getInstance();
    this.registry.initialize();
  }

  /**
   * Get agents for a specific call type
   */
  getAgentsForCallType(callType: CallType): IAgent[] {
    const plan = RoutingStrategy.buildExecutionPlan(callType);
    const agentNames = new Set<string>();

    // Always include classification
    agentNames.add('classification');

    // Add agents from all phases
    for (const phase of plan.phases) {
      for (const agentSpec of phase.agents) {
        agentNames.add(agentSpec.name);
      }
    }

    // Return actual agent instances
    return Array.from(agentNames)
      .map(name => this.registry.get(name))
      .filter((agent): agent is IAgent => agent !== undefined);
  }

  /**
   * Get execution order for agents
   */
  getExecutionOrder(callType: CallType): string[][] {
    const plan = RoutingStrategy.buildExecutionPlan(callType);
    const order: string[][] = [];

    // Classification always first
    order.push(['classification']);

    // Add each phase
    for (const phase of plan.phases) {
      if (phase.parallel) {
        // Parallel agents in same array
        order.push(phase.agents.map(a => a.name));
      } else {
        // Sequential agents in separate arrays
        phase.agents.forEach(agent => {
          order.push([agent.name]);
        });
      }
    }

    return order;
  }
}