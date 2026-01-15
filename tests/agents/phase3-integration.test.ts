/**
 * Phase 3 Integration Tests - Complete Multi-Agent Pipeline
 * Tests the orchestrator and agent coordination for MVP functionality
 */

import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { MultiAgentExtractor } from '../../lib/agents/multi-agent-extractor';
import { ExtractionOrchestrator } from '../../lib/agents/orchestrator';
import { AgentRegistry, AgentCoordinator, RoutingStrategy } from '../../lib/agents/agent-registry';
import { Phase3TestTranscripts } from './phase3-test-transcripts';
import { CallMetadata, ExtractionResult } from '../../lib/agents/types';

// Mock OpenAI responses
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async ({ messages, model }) => {
          // Mock different responses based on the prompt content
          const prompt = messages[messages.length - 1].content;

          if (prompt.includes('classification')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    primaryType: 'carrier_quote',
                    subTypes: [],
                    confidence: 0.95,
                    indicators: ['rate', 'MC number', 'truck available']
                  })
                }
              }]
            };
          }

          if (prompt.includes('speaker')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    speakers: {
                      'speaker_0': { role: 'broker', confidence: 0.9, name: 'Mike' },
                      'speaker_1': { role: 'carrier', confidence: 0.85, name: 'Bob' }
                    },
                    primarySpeaker: 'speaker_0'
                  })
                }
              }]
            };
          }

          if (prompt.includes('load')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    loads: [{
                      id: 'load_1',
                      origin: { city: 'Detroit', state: 'MI', confidence: 0.9 },
                      destination: { city: 'Atlanta', state: 'GA', confidence: 0.9 },
                      commodity: 'Auto parts',
                      weight: 42000,
                      equipmentType: 'dry_van',
                      status: 'discussed'
                    }],
                    multiLoadCall: false,
                    loadModifications: []
                  })
                }
              }]
            };
          }

          if (prompt.includes('rate')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    rates: [{
                      amount: 2950,
                      type: 'flat',
                      currency: 'USD',
                      includesFuel: true,
                      status: 'accepted',
                      confidence: 0.9
                    }],
                    accessorials: [],
                    paymentTerms: { standard: 'Net 30' }
                  })
                }
              }]
            };
          }

          if (prompt.includes('carrier')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    carriers: [{
                      companyName: 'Thunder Transport',
                      mcNumber: '789456',
                      contactInfo: {
                        primaryContact: 'Bob Thompson',
                        phone: '214-555-1234'
                      }
                    }]
                  })
                }
              }]
            };
          }

          if (prompt.includes('action')) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    actionItems: [{
                      action: 'Send rate confirmation',
                      owner: 'broker',
                      priority: 'high',
                      category: 'documentation'
                    }],
                    nextSteps: ['Send rate con', 'Driver calls for appointment'],
                    pendingDecisions: []
                  })
                }
              }]
            };
          }

          // Default response
          return {
            choices: [{
              message: {
                content: JSON.stringify({})
              }
            }]
          };
        })
      }
    }
  }))
}));

describe('Phase 3 Multi-Agent Integration Tests', () => {
  let extractor: MultiAgentExtractor;
  let orchestrator: ExtractionOrchestrator;
  let coordinator: AgentCoordinator;

  beforeAll(async () => {
    extractor = new MultiAgentExtractor();
    await extractor.initialize();

    orchestrator = new ExtractionOrchestrator();
    coordinator = new AgentCoordinator();

    // Register all agents with orchestrator
    const registry = AgentRegistry.getInstance();
    registry.initialize();
    const agents = registry.getAllAgents();
    agents.forEach(agent => orchestrator.registerAgent(agent));
  });

  describe('Complete Pipeline Execution', () => {
    test('should process carrier quote end-to-end', async () => {
      const transcript = Phase3TestTranscripts.completeCarrierCall;
      const metadata: CallMetadata = {
        callId: 'test_carrier_001',
        callType: 'carrier_quote',
        organizationId: 'test_org',
        callDate: new Date(),
        duration: 420,
        speakerCount: 2
      };

      const result = await extractor.extract(transcript, [], metadata);

      // Verify overall structure
      expect(result.success).toBe(true);
      expect(result.classification).toBeDefined();
      expect(result.loads).toBeDefined();
      expect(result.negotiation).toBeDefined();
      expect(result.carrier).toBeDefined();

      // Verify classification
      expect(result.classification?.primaryType).toBe('carrier_quote');
      expect(result.classification?.confidence.value).toBeGreaterThan(0.8);

      // Verify load extraction
      expect(result.loads?.loads).toHaveLength(1);
      expect(result.loads?.loads[0]).toMatchObject({
        origin: expect.objectContaining({ city: 'Detroit' }),
        destination: expect.objectContaining({ city: 'Atlanta' }),
        commodity: 'Auto parts',
        weight: 42000
      });

      // Verify rate extraction
      expect(result.negotiation?.rates).toHaveLength(1);
      expect(result.negotiation?.rates[0]).toMatchObject({
        amount: 2950,
        type: 'flat',
        status: 'accepted'
      });

      // Verify carrier information
      expect(result.carrier?.carriers).toHaveLength(1);
      expect(result.carrier?.carriers[0]).toMatchObject({
        companyName: 'Thunder Transport',
        mcNumber: '789456'
      });
    });

    test('should process new booking end-to-end', async () => {
      const transcript = Phase3TestTranscripts.completeBookingCall;
      const metadata: CallMetadata = {
        callId: 'test_booking_001',
        callType: 'new_booking',
        organizationId: 'test_org',
        callDate: new Date(),
        duration: 360,
        speakerCount: 2
      };

      // Mock booking-specific responses
      const mockCreate = jest.fn().mockImplementation(async ({ messages }) => {
        const prompt = messages[messages.length - 1].content;

        if (prompt.includes('classification')) {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  primaryType: 'new_booking',
                  confidence: 0.95
                })
              }
            }]
          };
        }

        if (prompt.includes('shipper')) {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  shippers: [{
                    companyName: 'Global Manufacturing',
                    contactInfo: {
                      primaryContact: 'Sarah',
                      phone: '313-555-6789'
                    },
                    pickupLocation: {
                      address: '4321 Production Drive, Detroit, 48201',
                      hours: '7 AM to 3 PM'
                    }
                  }]
                })
              }
            }]
          };
        }

        return {
          choices: [{
            message: { content: JSON.stringify({}) }
          }]
        };
      });

      // @ts-ignore - mocking internals
      require('openai').default.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }));

      const result = await extractor.extract(transcript, [], metadata);

      expect(result.success).toBe(true);
      expect(result.classification?.primaryType).toBe('new_booking');
      expect(result.shipper).toBeDefined();
      expect(result.shipper?.shippers[0].companyName).toBe('Global Manufacturing');
    });
  });

  describe('Agent Routing and Dependencies', () => {
    test('should route agents correctly for carrier quote', () => {
      const agents = coordinator.getAgentsForCallType('carrier_quote');
      const agentNames = agents.map(a => a.name);

      expect(agentNames).toContain('classification');
      expect(agentNames).toContain('speaker_identification');
      expect(agentNames).toContain('carrier_information');
      expect(agentNames).toContain('load_extraction');
      expect(agentNames).toContain('simple_rate_extraction');
      expect(agentNames).toContain('action_items');
    });

    test('should route agents correctly for new booking', () => {
      const agents = coordinator.getAgentsForCallType('new_booking');
      const agentNames = agents.map(a => a.name);

      expect(agentNames).toContain('classification');
      expect(agentNames).toContain('speaker_identification');
      expect(agentNames).toContain('shipper_information');
      expect(agentNames).toContain('load_extraction');
      expect(agentNames).toContain('action_items');
    });

    test('should determine correct execution order', () => {
      const order = coordinator.getExecutionOrder('carrier_quote');

      // Classification must be first
      expect(order[0]).toEqual(['classification']);

      // Foundation agents should run in parallel
      const foundationPhase = order.find(phase =>
        phase.includes('speaker_identification')
      );
      expect(foundationPhase).toBeDefined();

      // Type-specific agents should run after foundation
      const hasCarrierAgent = order.some(phase =>
        phase.includes('carrier_information')
      );
      expect(hasCarrierAgent).toBe(true);
    });

    test('should identify critical agents correctly', () => {
      const criticalForCarrier = RoutingStrategy.getCriticalAgents('carrier_quote');
      expect(criticalForCarrier).toContain('classification');
      expect(criticalForCarrier).toContain('carrier_information');

      const criticalForBooking = RoutingStrategy.getCriticalAgents('new_booking');
      expect(criticalForBooking).toContain('classification');
      expect(criticalForBooking).toContain('shipper_information');
      expect(criticalForBooking).toContain('load_extraction');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle agent failures gracefully', async () => {
      const transcript = Phase3TestTranscripts.corruptedTranscript;
      const metadata: CallMetadata = {
        callId: 'test_error_001',
        callType: 'unknown',
        organizationId: 'test_org',
        callDate: new Date(),
        duration: 60,
        speakerCount: 1
      };

      // Mock failure response
      const mockCreate = jest.fn().mockRejectedValue(new Error('AI processing failed'));
      // @ts-ignore
      require('openai').default.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }));

      const result = await extractor.extract(transcript, [], metadata);

      // Should still return a result, even if degraded
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('should use default outputs for non-critical agents', async () => {
      const transcript = Phase3TestTranscripts.singleLoadBooking;
      const metadata: CallMetadata = {
        callId: 'test_partial_001',
        callType: 'new_booking',
        organizationId: 'test_org',
        callDate: new Date()
      };

      // Mock mixed success/failure
      let callCount = 0;
      const mockCreate = jest.fn().mockImplementation(async ({ messages }) => {
        callCount++;
        const prompt = messages[messages.length - 1].content;

        // Let classification succeed
        if (prompt.includes('classification')) {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  primaryType: 'new_booking',
                  confidence: 0.9
                })
              }
            }]
          };
        }

        // Fail action items (non-critical)
        if (prompt.includes('action')) {
          throw new Error('Action extraction failed');
        }

        // Default success
        return {
          choices: [{
            message: { content: JSON.stringify({}) }
          }]
        };
      });

      // @ts-ignore
      require('openai').default.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }));

      const result = await extractor.extract(transcript, [], metadata);

      // Should succeed overall despite action items failing
      expect(result.success).toBe(true);
      expect(result.classification).toBeDefined();

      // Action items should have default output
      expect(result.actionItems).toBeDefined();
      expect(result.actionItems?.actionItems).toHaveLength(0);
    });
  });

  describe('Multi-Load Scenarios', () => {
    test('should handle multi-load extraction correctly', async () => {
      const transcript = Phase3TestTranscripts.multiLoadCall;
      const metadata: CallMetadata = {
        callId: 'test_multi_001',
        callType: 'carrier_quote',
        organizationId: 'test_org',
        callDate: new Date(),
        duration: 480,
        speakerCount: 2
      };

      // Mock multi-load response
      const mockCreate = jest.fn().mockImplementation(async ({ messages }) => {
        const prompt = messages[messages.length - 1].content;

        if (prompt.includes('load')) {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  loads: [
                    {
                      id: 'load_1',
                      origin: { city: 'Atlanta', state: 'GA' },
                      destination: { city: 'Miami', state: 'FL' },
                      weight: 38000
                    },
                    {
                      id: 'load_2',
                      origin: { city: 'Memphis', state: 'TN' },
                      destination: { city: 'Dallas', state: 'TX' },
                      weight: 44000
                    },
                    {
                      id: 'load_3',
                      origin: { city: 'Dallas', state: 'TX' },
                      destination: { city: 'Phoenix', state: 'AZ' },
                      weight: 35000
                    }
                  ],
                  multiLoadCall: true,
                  loadModifications: []
                })
              }
            }]
          };
        }

        if (prompt.includes('rate')) {
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  rates: [
                    { loadId: 'load_1', amount: 2100, type: 'flat' },
                    { loadId: 'load_2', amount: 2400, type: 'flat' },
                    { loadId: 'load_3', amount: 1900, type: 'flat' }
                  ]
                })
              }
            }]
          };
        }

        return {
          choices: [{
            message: { content: JSON.stringify({}) }
          }]
        };
      });

      // @ts-ignore
      require('openai').default.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } }
      }));

      const result = await extractor.extract(transcript, [], metadata);

      expect(result.loads?.multiLoadCall).toBe(true);
      expect(result.loads?.loads).toHaveLength(3);
      expect(result.negotiation?.rates).toHaveLength(3);

      // Verify load-rate linkage
      result.negotiation?.rates.forEach(rate => {
        expect(rate.loadId).toBeDefined();
        const matchingLoad = result.loads?.loads.find(l => l.id === rate.loadId);
        expect(matchingLoad).toBeDefined();
      });
    });
  });

  describe('Feature Flag and Rollout', () => {
    test('should respect feature flag for multi-agent usage', async () => {
      // Test force enable
      process.env.FORCE_MULTI_AGENT = 'true';
      let shouldUse = await MultiAgentExtractor.shouldUseMultiAgent('org_123', 0);
      expect(shouldUse).toBe(true);

      // Test force disable
      process.env.FORCE_MULTI_AGENT = 'false';
      shouldUse = await MultiAgentExtractor.shouldUseMultiAgent('org_123', 100);
      expect(shouldUse).toBe(false);

      // Test percentage-based rollout
      delete process.env.FORCE_MULTI_AGENT;
      const results: boolean[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(await MultiAgentExtractor.shouldUseMultiAgent('org_123', 50));
      }

      const enabledCount = results.filter(r => r).length;
      expect(enabledCount).toBeGreaterThan(30); // Should be roughly 50%
      expect(enabledCount).toBeLessThan(70);
    });

    test('should convert to legacy format correctly', () => {
      const result: ExtractionResult = {
        success: true,
        classification: {
          primaryType: 'carrier_quote',
          subTypes: [],
          confidence: { value: 0.9, level: 'high', factors: [] }
        },
        summary: {
          executiveSummary: 'Carrier quote for Detroit to Atlanta',
          keyPoints: ['Rate agreed at $2950'],
          actionItems: ['Send rate confirmation'],
          nextSteps: ['Driver pickup tomorrow']
        },
        loads: {
          loads: [{
            id: 'load_1',
            origin: { city: 'Detroit', state: 'MI', confidence: 0.9 },
            destination: { city: 'Atlanta', state: 'GA', confidence: 0.9 },
            status: 'discussed'
          }],
          multiLoadCall: false,
          confidence: { value: 0.85, level: 'high' }
        },
        errors: [],
        warnings: []
      };

      const legacy = MultiAgentExtractor.toLegacyFormat(result);

      expect(legacy.success).toBe(true);
      expect(legacy.summary).toBe('Carrier quote for Detroit to Atlanta');
      expect(legacy.action_items).toEqual(['Send rate confirmation']);
      expect(legacy.next_steps).toEqual(['Driver pickup tomorrow']);
    });
  });
});

// Helper to create mock context
function createMockMetadata(type: string): CallMetadata {
  return {
    callId: `test_${Date.now()}`,
    callType: type as any,
    organizationId: 'test_org',
    callDate: new Date(),
    duration: 300,
    speakerCount: 2
  };
}