/**
 * Phase 3 MVP Agents Test Suite
 * Tests all essential extraction agents required for 80% of calls
 */

import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { LoadExtractionAgent } from '../../lib/agents/implementations/load-extraction-agent';
import { SimpleRateExtractionAgent } from '../../lib/agents/implementations/simple-rate-extraction-agent';
import { CarrierInformationAgent } from '../../lib/agents/implementations/carrier-information-agent';
import { ShipperInformationAgent } from '../../lib/agents/implementations/shipper-information-agent';
import { ActionItemsAgent } from '../../lib/agents/implementations/action-items-agent';
import { AgentContext } from '../../lib/agents/agent-context';
import { TestTranscripts } from './test-transcripts';
import { CallMetadata } from '../../lib/agents/types';

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

describe('Phase 3: MVP Agent Tests', () => {
  let loadAgent: LoadExtractionAgent;
  let rateAgent: SimpleRateExtractionAgent;
  let carrierAgent: CarrierInformationAgent;
  let shipperAgent: ShipperInformationAgent;
  let actionAgent: ActionItemsAgent;

  beforeAll(() => {
    loadAgent = new LoadExtractionAgent();
    rateAgent = new SimpleRateExtractionAgent();
    carrierAgent = new CarrierInformationAgent();
    shipperAgent = new ShipperInformationAgent();
    actionAgent = new ActionItemsAgent();
  });

  describe('Load Extraction Agent', () => {
    test('should extract single load details', async () => {
      const transcript = TestTranscripts.singleLoadBooking;
      const context = createContext(transcript, 'new_booking');

      // Mock classification output
      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          confidence: { value: 0.95 }
        }
      });

      const output = await loadAgent.execute(context);

      expect(output.loads).toHaveLength(1);
      expect(output.loads[0]).toMatchObject({
        origin: expect.objectContaining({
          city: expect.any(String),
          state: expect.any(String)
        }),
        destination: expect.objectContaining({
          city: expect.any(String),
          state: expect.any(String)
        }),
        commodity: expect.any(String),
        equipmentType: expect.any(String)
      });
    });

    test('should handle multi-load extraction', async () => {
      const transcript = TestTranscripts.multiLoadCall;
      const context = createContext(transcript, 'new_booking');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          multiLoadCall: true,
          confidence: { value: 0.9 }
        }
      });

      const output = await loadAgent.execute(context);

      expect(output.multiLoadCall).toBe(true);
      expect(output.loads.length).toBeGreaterThan(1);

      // Each load should have unique ID
      const loadIds = output.loads.map(l => l.id);
      expect(new Set(loadIds).size).toBe(loadIds.length);
    });

    test('should track load modifications during call', async () => {
      const transcript = TestTranscripts.loadWithChanges;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.85 }
        }
      });

      const output = await loadAgent.execute(context);

      expect(output.loadModifications).toBeDefined();
      expect(output.loadModifications.length).toBeGreaterThan(0);
      expect(output.loadModifications[0]).toMatchObject({
        loadId: expect.any(String),
        changeType: expect.any(String),
        description: expect.any(String)
      });
    });

    test('should handle multi-stop loads', async () => {
      const transcript = TestTranscripts.multiStopLoad;
      const context = createContext(transcript, 'new_booking');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          confidence: { value: 0.9 }
        }
      });

      const output = await loadAgent.execute(context);

      expect(output.loads[0].stops).toBeDefined();
      expect(output.loads[0].stops!.length).toBeGreaterThan(0);
    });

    test('should return empty loads for wrong number', async () => {
      const transcript = TestTranscripts.wrongNumber;
      const context = createContext(transcript, 'wrong_number');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'wrong_number',
          confidence: { value: 0.99 }
        }
      });

      const output = await loadAgent.execute(context);

      expect(output.loads).toHaveLength(0);
      expect(output.confidence.level).toBe('low');
    });
  });

  describe('Simple Rate Extraction Agent', () => {
    test('should extract flat rate', async () => {
      const transcript = TestTranscripts.flatRateQuote;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.9 }
        }
      });

      const output = await rateAgent.execute(context);

      expect(output.rates).toHaveLength(1);
      expect(output.rates[0]).toMatchObject({
        amount: expect.any(Number),
        type: 'flat',
        status: expect.stringMatching(/quoted|accepted/),
        currency: 'USD'
      });
    });

    test('should extract per-mile rate with calculation', async () => {
      const transcript = TestTranscripts.perMileRate;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.9 }
        }
      });

      const output = await rateAgent.execute(context);

      expect(output.rates[0]).toMatchObject({
        type: 'per_mile',
        miles: expect.any(Number),
        totalIfPerMile: expect.any(Number)
      });
    });

    test('should extract accessorials', async () => {
      const transcript = TestTranscripts.rateWithAccessorials;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.85 }
        }
      });

      const output = await rateAgent.execute(context);

      expect(output.accessorials).toBeDefined();
      expect(output.accessorials.length).toBeGreaterThan(0);
      expect(output.accessorials).toContainEqual(
        expect.objectContaining({
          type: expect.any(String),
          terms: expect.any(String)
        })
      );
    });

    test('should extract payment terms', async () => {
      const transcript = TestTranscripts.rateWithPaymentTerms;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.9 }
        }
      });

      const output = await rateAgent.execute(context);

      expect(output.paymentTerms).toBeDefined();
      expect(output.paymentTerms?.quickPay).toBeDefined();
      expect(output.paymentTerms?.standard).toBeDefined();
    });

    test('should handle multiple rates for multi-load', async () => {
      const transcript = TestTranscripts.multiLoadWithDifferentRates;
      const context = createContext(transcript, 'carrier_quote');

      // Add load extraction output
      context.addAgentOutput('load_extraction', {
        status: 'completed',
        output: {
          loads: [
            { id: 'load_1', origin: {}, destination: {} },
            { id: 'load_2', origin: {}, destination: {} }
          ],
          multiLoadCall: true
        }
      });

      const output = await rateAgent.execute(context);

      expect(output.rates.length).toBeGreaterThan(1);
      expect(output.rates[0].loadId).toBeDefined();
      expect(output.rates[1].loadId).toBeDefined();
    });
  });

  describe('Carrier Information Agent', () => {
    test('should extract carrier company details', async () => {
      const transcript = TestTranscripts.carrierIntroduction;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.95 }
        }
      });

      const output = await carrierAgent.execute(context);

      expect(output.carriers).toHaveLength(1);
      expect(output.carriers[0]).toMatchObject({
        companyName: expect.any(String),
        contactInfo: expect.objectContaining({
          primaryContact: expect.any(String)
        })
      });
    });

    test('should extract MC number and DOT', async () => {
      const transcript = TestTranscripts.carrierWithMCNumber;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.9 }
        }
      });

      const output = await carrierAgent.execute(context);

      expect(output.carriers[0].mcNumber).toBeDefined();
      expect(output.carriers[0].mcNumber).toMatch(/^\d+$/);
    });

    test('should extract equipment availability', async () => {
      const transcript = TestTranscripts.carrierEquipmentDetails;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.85 }
        }
      });

      const output = await carrierAgent.execute(context);

      expect(output.carriers[0].equipment).toBeDefined();
      expect(output.carriers[0].equipment?.available).toContainEqual(
        expect.objectContaining({
          type: expect.any(String),
          count: expect.any(Number)
        })
      );
    });

    test('should extract driver information', async () => {
      const transcript = TestTranscripts.carrierWithDriverInfo;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.9 }
        }
      });

      const output = await carrierAgent.execute(context);

      expect(output.carriers[0].drivers).toBeDefined();
      expect(output.carriers[0].drivers?.available).toBeGreaterThan(0);
    });
  });

  describe('Shipper Information Agent', () => {
    test('should extract shipper company details', async () => {
      const transcript = TestTranscripts.shipperBooking;
      const context = createContext(transcript, 'new_booking');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          confidence: { value: 0.95 }
        }
      });

      const output = await shipperAgent.execute(context);

      expect(output.shippers).toHaveLength(1);
      expect(output.shippers[0]).toMatchObject({
        companyName: expect.any(String),
        contactInfo: expect.objectContaining({
          primaryContact: expect.any(String)
        })
      });
    });

    test('should extract pickup location details', async () => {
      const transcript = TestTranscripts.shipperWithFacilityDetails;
      const context = createContext(transcript, 'new_booking');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          confidence: { value: 0.9 }
        }
      });

      const output = await shipperAgent.execute(context);

      expect(output.shippers[0].pickupLocation).toBeDefined();
      expect(output.shippers[0].pickupLocation).toMatchObject({
        address: expect.any(String),
        hours: expect.any(String)
      });
    });

    test('should extract shipping requirements', async () => {
      const transcript = TestTranscripts.shipperWithSpecialRequirements;
      const context = createContext(transcript, 'new_booking');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          confidence: { value: 0.85 }
        }
      });

      const output = await shipperAgent.execute(context);

      expect(output.shippers[0].shippingRequirements).toBeDefined();
      expect(output.shippers[0].shippingRequirements?.special).toContain(
        expect.any(String)
      );
    });
  });

  describe('Action Items Agent', () => {
    test('should extract follow-up actions', async () => {
      const transcript = TestTranscripts.callWithFollowUps;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.9 }
        }
      });

      const output = await actionAgent.execute(context);

      expect(output.actionItems).toHaveLength(expect.any(Number));
      expect(output.actionItems[0]).toMatchObject({
        action: expect.any(String),
        owner: expect.stringMatching(/broker|carrier|shipper/),
        priority: expect.stringMatching(/high|medium|low/),
        category: expect.any(String)
      });
    });

    test('should extract time-sensitive actions', async () => {
      const transcript = TestTranscripts.urgentActions;
      const context = createContext(transcript, 'new_booking');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          confidence: { value: 0.95 }
        }
      });

      const output = await actionAgent.execute(context);

      const urgentActions = output.actionItems.filter(a => a.priority === 'high');
      expect(urgentActions.length).toBeGreaterThan(0);
      expect(urgentActions[0].deadline).toBeDefined();
    });

    test('should extract communication commitments', async () => {
      const transcript = TestTranscripts.communicationCommitments;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.85 }
        }
      });

      const output = await actionAgent.execute(context);

      const commActions = output.actionItems.filter(a =>
        a.category === 'communication'
      );
      expect(commActions.length).toBeGreaterThan(0);
    });

    test('should extract next steps summary', async () => {
      const transcript = TestTranscripts.callWithNextSteps;
      const context = createContext(transcript, 'new_booking');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          confidence: { value: 0.9 }
        }
      });

      const output = await actionAgent.execute(context);

      expect(output.nextSteps).toBeDefined();
      expect(output.nextSteps).toHaveLength(expect.any(Number));
    });

    test('should identify pending decisions', async () => {
      const transcript = TestTranscripts.pendingDecisions;
      const context = createContext(transcript, 'carrier_quote');

      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.85 }
        }
      });

      const output = await actionAgent.execute(context);

      expect(output.pendingDecisions).toBeDefined();
      expect(output.pendingDecisions).toHaveLength(expect.any(Number));
      expect(output.pendingDecisions![0]).toMatchObject({
        decision: expect.any(String),
        decisionMaker: expect.any(String),
        expectedBy: expect.any(String)
      });
    });
  });

  describe('Agent Integration Tests', () => {
    test('should handle dependencies correctly', async () => {
      const transcript = TestTranscripts.completeCarrierCall;
      const context = createContext(transcript, 'carrier_quote');

      // Classification runs first
      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'carrier_quote',
          confidence: { value: 0.95 }
        }
      });

      // Speaker identification depends on classification
      context.addAgentOutput('speaker_identification', {
        status: 'completed',
        output: {
          speakers: {
            'speaker_0': { role: 'broker', confidence: 0.9 },
            'speaker_1': { role: 'carrier', confidence: 0.85 }
          }
        }
      });

      // Load extraction can use speaker info
      const loadOutput = await loadAgent.execute(context);
      expect(loadOutput).toBeDefined();

      // Rate extraction can use load info
      context.addAgentOutput('load_extraction', {
        status: 'completed',
        output: loadOutput
      });

      const rateOutput = await rateAgent.execute(context);
      expect(rateOutput).toBeDefined();
    });

    test('should handle agent failures gracefully', async () => {
      const transcript = TestTranscripts.corruptedTranscript;
      const context = createContext(transcript, 'unknown');

      context.addAgentOutput('classification', {
        status: 'failed',
        error: { message: 'Classification failed', recoverable: false }
      });

      // Agents should return default outputs
      const loadOutput = await loadAgent.execute(context);
      expect(loadOutput.loads).toHaveLength(0);
      expect(loadOutput.confidence.level).toBe('low');

      const actionOutput = await actionAgent.execute(context);
      expect(actionOutput.actionItems).toHaveLength(0);
    });

    test('should process complete booking flow', async () => {
      const transcript = TestTranscripts.completeBookingCall;
      const context = createContext(transcript, 'new_booking');

      // Set up context with classification
      context.addAgentOutput('classification', {
        status: 'completed',
        output: {
          primaryType: 'new_booking',
          confidence: { value: 0.95 }
        }
      });

      // Run all relevant agents
      const shipperOutput = await shipperAgent.execute(context);
      expect(shipperOutput.shippers).toHaveLength(1);

      const loadOutput = await loadAgent.execute(context);
      expect(loadOutput.loads.length).toBeGreaterThan(0);

      const actionOutput = await actionAgent.execute(context);
      expect(actionOutput.actionItems.length).toBeGreaterThan(0);

      // Verify coherent extraction
      expect(loadOutput.loads[0].origin.city).toBeTruthy();
      expect(shipperOutput.shippers[0].companyName).toBeTruthy();
      expect(actionOutput.nextSteps).toBeDefined();
    });
  });
});

// Helper function to create test context
function createContext(
  transcript: string,
  callType: string
): AgentContext {
  const metadata: CallMetadata = {
    callId: `test_${Date.now()}`,
    callType: callType as any,
    organizationId: 'test_org',
    callDate: new Date(),
    duration: 300,
    speakerCount: 2
  };

  return new AgentContext(transcript, [], metadata);
}