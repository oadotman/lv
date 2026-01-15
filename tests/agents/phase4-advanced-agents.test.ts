/**
 * Phase 4 Advanced Agents Test Suite
 * Tests all complex scenario handling agents
 */

import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { RateNegotiationAgent } from '../../lib/agents/implementations/rate-negotiation-agent';
import { TemporalResolutionAgent } from '../../lib/agents/implementations/temporal-resolution-agent';
import { ConditionalAgreementAgent } from '../../lib/agents/implementations/conditional-agreement-agent';
import { AccessorialParserAgent } from '../../lib/agents/implementations/accessorial-parser-agent';
import { ReferenceResolutionAgent } from '../../lib/agents/implementations/reference-resolution-agent';
import { AgentContext } from '../../lib/agents/agent-context';
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

describe('Phase 4: Advanced Agent Tests', () => {
  let negotiationAgent: RateNegotiationAgent;
  let temporalAgent: TemporalResolutionAgent;
  let conditionalAgent: ConditionalAgreementAgent;
  let accessorialAgent: AccessorialParserAgent;
  let referenceAgent: ReferenceResolutionAgent;

  beforeAll(() => {
    negotiationAgent = new RateNegotiationAgent();
    temporalAgent = new TemporalResolutionAgent();
    conditionalAgent = new ConditionalAgreementAgent();
    accessorialAgent = new AccessorialParserAgent();
    referenceAgent = new ReferenceResolutionAgent();
  });

  describe('Rate Negotiation Agent', () => {
    test('should track multi-round negotiation', async () => {
      const transcript = `
        Broker: What's your rate for Chicago to Atlanta?
        Carrier: I need $3,500 for that run.
        Broker: That's way too high. I can do $2,200.
        Carrier: No way, that doesn't even cover fuel. How about $3,000?
        Broker: Still too high. Best I can do is $2,500.
        Carrier: Can you meet me in the middle at $2,750?
        Broker: Let me check... okay, $2,650 final offer.
        Carrier: Alright, $2,650 works. We have a deal.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await negotiationAgent.execute(context);

      expect(output.negotiations).toHaveLength(1);
      const negotiation = output.negotiations[0];

      // Check negotiation progression
      expect(negotiation.status).toBe('agreed');
      expect(negotiation.agreedRate).toBe(2650);
      expect(negotiation.numberOfRounds).toBeGreaterThanOrEqual(4);

      // Check price history
      expect(negotiation.priceHistory).toContainEqual(
        expect.objectContaining({
          amount: 3500,
          action: 'initial_offer'
        })
      );

      // Check negotiation tactics
      expect(negotiation.tactics).toContainEqual(
        expect.objectContaining({
          tactic: 'splitting_difference'
        })
      );

      // Check final positions
      expect(negotiation.finalPositions.broker).toBe(2650);
      expect(negotiation.finalPositions.carrier).toBe(2650);
    });

    test('should identify conditional rates', async () => {
      const transcript = `
        Carrier: I can do it for $2,800 if it's a regular lane.
        Broker: What if it's just one-time?
        Carrier: Then it's $3,200.
        Broker: And if I give you 3 loads a week?
        Carrier: For that volume, I can come down to $2,500 per load.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await negotiationAgent.execute(context);

      expect(output.negotiations[0].conditions).toContainEqual(
        expect.objectContaining({
          type: 'volume_based',
          impact: 'decreases_rate'
        })
      );
    });

    test('should detect negotiation deadlock', async () => {
      const transcript = `
        Carrier: I need at least $3,000.
        Broker: Maximum I can pay is $2,200.
        Carrier: That's impossible. I can't go below $2,900.
        Broker: Then we don't have a deal. I'll find another carrier.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await negotiationAgent.execute(context);

      expect(output.negotiations[0].status).toBe('rejected');
      expect(output.negotiations[0].deadlockReason).toBeTruthy();
    });
  });

  describe('Temporal Resolution Agent', () => {
    const callDate = new Date('2024-01-15'); // Monday

    test('should resolve relative dates', async () => {
      const transcript = `
        Broker: Can you pick up tomorrow morning?
        Carrier: Tomorrow works. What about delivery?
        Broker: Needs to be there by Friday end of day.
        Carrier: So pick up Tuesday, deliver Friday?
        Broker: Correct. Tuesday January 16th, deliver by Friday the 19th.
      `;

      const context = createContext(transcript, 'new_booking', callDate);

      const output = await temporalAgent.execute(context);

      expect(output.resolvedDates).toContainEqual(
        expect.objectContaining({
          originalText: 'tomorrow morning',
          resolvedDate: new Date('2024-01-16'),
          type: 'relative',
          context: 'pickup'
        })
      );

      expect(output.resolvedDates).toContainEqual(
        expect.objectContaining({
          originalText: 'Friday end of day',
          resolvedDate: new Date('2024-01-19'),
          type: 'relative',
          context: 'delivery'
        })
      );
    });

    test('should identify time windows', async () => {
      const transcript = `
        Shipper: Pickup window is between 8 AM and noon.
        Broker: And delivery?
        Shipper: Anytime between 6 AM and 2 PM on Thursday.
      `;

      const context = createContext(transcript, 'new_booking', callDate);

      const output = await temporalAgent.execute(context);

      expect(output.timeWindows).toHaveLength(2);
      expect(output.timeWindows[0]).toMatchObject({
        type: 'pickup',
        window: expect.objectContaining({
          start: expect.objectContaining({
            resolvedTime: '08:00'
          }),
          end: expect.objectContaining({
            resolvedTime: '12:00'
          }),
          duration: 240 // 4 hours in minutes
        })
      });
    });

    test('should detect holiday conflicts', async () => {
      const transcript = `
        Broker: Can you deliver on December 25th?
        Carrier: That's Christmas Day. We're closed.
        Broker: How about the 26th then?
      `;

      const context = createContext(transcript, 'new_booking');

      const output = await temporalAgent.execute(context);

      expect(output.holidayConsiderations).toContainEqual(
        expect.objectContaining({
          holiday: 'Christmas',
          impact: 'closed'
        })
      );
    });

    test('should handle ASAP and urgent references', async () => {
      const transcript = `
        Broker: This needs to go ASAP.
        Carrier: How soon?
        Broker: As soon as possible, ideally within the next 2 hours.
      `;

      const context = createContext(transcript, 'new_booking');

      const output = await temporalAgent.execute(context);

      expect(output.resolvedDates).toContainEqual(
        expect.objectContaining({
          originalText: expect.stringContaining('ASAP'),
          isRush: true
        })
      );
    });
  });

  describe('Conditional Agreement Agent', () => {
    test('should identify if-then conditions', async () => {
      const transcript = `
        Carrier: If you can guarantee payment within 7 days, I'll take it for $2,400.
        Broker: What if it's standard 30-day terms?
        Carrier: Then it's $2,600.
        Broker: Okay, if we do quick pay at 7 days, $2,400 it is.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await conditionalAgent.execute(context);

      expect(output.conditions).toContainEqual(
        expect.objectContaining({
          type: 'if_then',
          ifClause: expect.objectContaining({
            category: 'rate',
            description: expect.stringContaining('payment within 7 days')
          }),
          thenClause: expect.objectContaining({
            outcome: 'rate_change',
            description: expect.stringContaining('$2,400')
          }),
          status: 'met'
        })
      );

      expect(output.agreementStatus.type).toBe('conditional');
    });

    test('should identify approval requirements', async () => {
      const transcript = `
        Broker: I can probably do $2,800, but I need to check with my manager.
        Carrier: When will you know?
        Broker: Give me 30 minutes to get approval.
        Carrier: Okay, if approved, we have a deal at $2,800.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await conditionalAgent.execute(context);

      expect(output.approvals).toContainEqual(
        expect.objectContaining({
          requiredFrom: 'manager',
          forWhat: expect.stringContaining('$2,800'),
          status: 'pending'
        })
      );

      expect(output.agreementStatus.type).toBe('pending_approval');
    });

    test('should identify equipment dependencies', async () => {
      const transcript = `
        Carrier: If you need a reefer, it's $3,200.
        Broker: What about dry van?
        Carrier: Dry van I can do for $2,700.
        Broker: We'll go with dry van then.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await conditionalAgent.execute(context);

      expect(output.conditions).toContainEqual(
        expect.objectContaining({
          type: 'equipment_dependent',
          ifClause: expect.objectContaining({
            category: 'equipment'
          })
        })
      );
    });
  });

  describe('Accessorial Parser Agent', () => {
    test('should extract detention terms', async () => {
      const transcript = `
        Broker: Detention is $75 per hour after 2 hours free.
        Carrier: Is that at both pickup and delivery?
        Broker: Yes, 2 hours free at each location, then $75 per hour.
        Carrier: What about weekends?
        Broker: Same rate, clock keeps running on weekends.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await accessorialAgent.execute(context);

      expect(output.accessorials).toContainEqual(
        expect.objectContaining({
          type: 'detention',
          calculation: expect.objectContaining({
            method: 'hourly',
            rate: 75
          }),
          terms: expect.objectContaining({
            freeTime: 2,
            freeTimeUnit: 'hours',
            includesWeekends: true
          })
        })
      );

      expect(output.summary.detention).toMatchObject({
        rate: 75,
        freeHours: 2,
        locations: expect.arrayContaining(['pickup', 'delivery'])
      });
    });

    test('should extract lumper and TONU charges', async () => {
      const transcript = `
        Broker: Lumper fees are reimbursable with receipt.
        Carrier: What's the TONU policy?
        Broker: $250 TONU if cancelled within 24 hours of pickup.
        Carrier: And lumper maximum?
        Broker: We'll reimburse up to $300 for lumper.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await accessorialAgent.execute(context);

      expect(output.accessorials).toContainEqual(
        expect.objectContaining({
          type: 'lumper',
          billing: expect.objectContaining({
            reimbursable: true,
            requiresReceipt: true
          }),
          calculation: expect.objectContaining({
            maximum: 300
          })
        })
      );

      expect(output.accessorials).toContainEqual(
        expect.objectContaining({
          type: 'tonu',
          amount: 250,
          terms: expect.objectContaining({
            trigger: expect.stringContaining('24 hours')
          })
        })
      );
    });

    test('should identify included vs additional charges', async () => {
      const transcript = `
        Broker: The rate of $2,800 includes fuel surcharge.
        Carrier: What about detention and lumper?
        Broker: Those are additional. Detention is extra, lumper is reimbursable.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      const output = await accessorialAgent.execute(context);

      expect(output.totalImpact.includedInRate).toContain('fuel_surcharge');
      expect(output.totalImpact.additional).toContain('detention');
      expect(output.totalImpact.additional).toContain('lumper');
    });
  });

  describe('Reference Resolution Agent', () => {
    test('should resolve previous load references', async () => {
      const transcript = `
        Carrier: Is this the same load we talked about yesterday?
        Broker: Yes, the Chicago to Atlanta run, same as before.
        Carrier: Same rate as last time?
        Broker: Yes, $2,500 like we agreed.
      `;

      const context = createContext(transcript, 'check_call');
      setupMockClassification(context, 'check_call');

      const output = await referenceAgent.execute(context);

      expect(output.references).toContainEqual(
        expect.objectContaining({
          originalReference: expect.objectContaining({
            text: expect.stringContaining('same load we talked about yesterday'),
            type: 'previous_call'
          }),
          resolvedTo: expect.objectContaining({
            type: 'load',
            description: expect.stringContaining('Chicago to Atlanta')
          })
        })
      );

      expect(output.inferredContext.familiarityLevel).toBe('very_familiar');
    });

    test('should identify standard lanes', async () => {
      const transcript = `
        Broker: We need coverage for our regular Tuesday Chicago run.
        Carrier: The usual one to Memphis?
        Broker: That's right, our standard lane.
        Carrier: Same terms as always?
        Broker: Yes, standard rate and terms apply.
      `;

      const context = createContext(transcript, 'new_booking');
      setupMockClassification(context, 'new_booking');

      const output = await referenceAgent.execute(context);

      expect(output.references).toContainEqual(
        expect.objectContaining({
          originalReference: expect.objectContaining({
            type: 'standard_lane'
          })
        })
      );

      expect(output.referencePatterns.hasRegularLanes).toBe(true);
      expect(output.inferredContext.relationshipType).toBe('regular');
    });

    test('should identify clarification needs', async () => {
      const transcript = `
        Carrier: I'll take that load we discussed.
        Broker: Which one? We talked about three different loads.
        Carrier: The one with the good rate.
        Broker: They all had different rates. Can you be more specific?
      `;

      const context = createContext(transcript, 'callback_acceptance');
      setupMockClassification(context, 'callback_acceptance');

      const output = await referenceAgent.execute(context);

      expect(output.clarificationNeeded).toContainEqual(
        expect.objectContaining({
          missingInfo: expect.any(String),
          priority: 'critical'
        })
      );

      expect(output.references[0].resolutionStatus.resolved).toBe(false);
    });
  });

  describe('Agent Integration', () => {
    test('should handle complex negotiation with conditions', async () => {
      const transcript = `
        Carrier: What's the rate for Chicago to Atlanta?
        Broker: I can do $2,500 if you can pick up tomorrow.
        Carrier: Tomorrow is tight. If I pick up Wednesday, what's the rate?
        Broker: Wednesday would be $2,300 since it's less urgent.
        Carrier: If I take both this load and the Memphis load, can you do $2,400 for Chicago?
        Broker: For both loads, I can do $2,400 for Chicago and $1,800 for Memphis.
        Carrier: Deal. So $2,400 Chicago, $1,800 Memphis, pickup Wednesday.
      `;

      const context = createContext(transcript, 'carrier_quote');
      setupMockClassification(context, 'carrier_quote');

      // Test negotiation agent
      const negotiationOutput = await negotiationAgent.execute(context);
      expect(negotiationOutput.negotiations[0].status).toBe('agreed');
      expect(negotiationOutput.negotiations[0].conditions).toHaveLength(expect.any(Number));

      // Test conditional agent
      const conditionalOutput = await conditionalAgent.execute(context);
      expect(conditionalOutput.conditions).toContainEqual(
        expect.objectContaining({
          type: 'volume_dependent'
        })
      );

      // Test temporal agent
      const temporalOutput = await temporalAgent.execute(context);
      expect(temporalOutput.resolvedDates).toContainEqual(
        expect.objectContaining({
          originalText: expect.stringContaining('Wednesday'),
          context: 'pickup'
        })
      );
    });

    test('should handle callback with previous references', async () => {
      const transcript = `
        Carrier: I'll take that load we discussed at the rate you offered.
        Broker: Great! So that's the Chicago to Atlanta for $2,500?
        Carrier: Yes, with the same detention terms as usual.
        Broker: Perfect. 2 hours free, $75 after that.
      `;

      const context = createContext(transcript, 'callback_acceptance');
      setupMockClassification(context, 'callback_acceptance');

      // Test reference resolution
      const referenceOutput = await referenceAgent.execute(context);
      expect(referenceOutput.references).toHaveLength(expect.any(Number));
      expect(referenceOutput.inferredContext.familiarityLevel).not.toBe('first_time');

      // Test accessorial parsing
      const accessorialOutput = await accessorialAgent.execute(context);
      expect(accessorialOutput.accessorials).toContainEqual(
        expect.objectContaining({
          type: 'detention'
        })
      );
    });
  });
});

// Helper functions
function createContext(
  transcript: string,
  callType: string,
  callDate: Date = new Date()
): AgentContext {
  const metadata: CallMetadata = {
    callId: `test_${Date.now()}`,
    callType: callType as any,
    organizationId: 'test_org',
    callDate,
    duration: 300,
    speakerCount: 2,
    timezone: 'America/Chicago'
  };

  return new AgentContext(transcript, [], metadata);
}

function setupMockClassification(context: AgentContext, callType: string) {
  context.addAgentOutput('classification', {
    agentName: 'classification',
    status: 'completed',
    output: {
      primaryType: callType,
      confidence: { value: 0.95, level: 'high', factors: [] }
    },
    executionTime: 1000
  });

  context.addAgentOutput('speaker_identification', {
    agentName: 'speaker_identification',
    status: 'completed',
    output: {
      speakers: {
        'speaker_0': { role: 'broker', confidence: 0.9 },
        'speaker_1': { role: 'carrier', confidence: 0.85 }
      }
    },
    executionTime: 500
  });
}