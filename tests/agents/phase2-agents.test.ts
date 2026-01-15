/**
 * Test suite for Phase 2 agents
 */

import { ClassificationAgent } from '@/lib/agents/implementations/classification-agent';
import { SpeakerIdentificationAgent } from '@/lib/agents/implementations/speaker-identification-agent';
import { AgentContext } from '@/lib/agents/agent-context';
import { AgentRegistry, RoutingStrategy, AgentCoordinator } from '@/lib/agents/agent-registry';
import { AssemblyAIUtterance } from '@/lib/assemblyai';

// Mock utterances for testing
const createMockUtterances = (texts: string[]): AssemblyAIUtterance[] => {
  return texts.map((text, idx) => ({
    text,
    speaker: idx % 2 === 0 ? 'A' : 'B',
    start: idx * 1000,
    end: (idx + 1) * 1000,
    confidence: 0.95,
    words: []
  }));
};

describe('Classification Agent', () => {
  let agent: ClassificationAgent;
  let context: AgentContext;

  beforeEach(() => {
    agent = new ClassificationAgent();
  });

  test('classifies carrier quote correctly', async () => {
    const utterances = createMockUtterances([
      "Hey, I've got trucks available in Chicago",
      "What's the load details?",
      "It's going to Dallas, 800 miles",
      "I can do it for $2,500, what's your rate?",
      "Best I can do is $2,200",
      "Let me check with my driver"
    ]);

    context = new AgentContext(
      utterances.map(u => u.text).join(' '),
      utterances,
      {
        callId: 'test-1',
        organizationId: 'org-1',
        callDate: new Date()
      }
    );

    const result = await agent.execute(context);

    expect(result.primaryType).toBe('carrier_quote');
    expect(result.confidence.value).toBeGreaterThan(0.6);
    expect(result.indicators).toContain('trucks available');
  });

  test('classifies new booking correctly', async () => {
    const utterances = createMockUtterances([
      "I need to ship some products",
      "Where's it going from and to?",
      "From our warehouse in Atlanta to Miami",
      "What's the commodity and weight?",
      "It's 15 pallets of electronics, about 20,000 lbs",
      "I can quote you $1,800 for that"
    ]);

    context = new AgentContext(
      utterances.map(u => u.text).join(' '),
      utterances,
      {
        callId: 'test-2',
        organizationId: 'org-1',
        callDate: new Date()
      }
    );

    const result = await agent.execute(context);

    expect(result.primaryType).toBe('new_booking');
    expect(result.confidence.value).toBeGreaterThan(0.6);
  });

  test('identifies multi-load call', async () => {
    const utterances = createMockUtterances([
      "I have three loads today",
      "What are the details?",
      "First one is Chicago to Dallas",
      "Second is Atlanta to Miami",
      "Third one is Denver to Phoenix"
    ]);

    context = new AgentContext(
      utterances.map(u => u.text).join(' '),
      utterances,
      {
        callId: 'test-3',
        organizationId: 'org-1',
        callDate: new Date()
      }
    );

    const result = await agent.execute(context);

    expect(result.multiLoadCall).toBe(true);
    expect(result.subTypes).toContain('multi_load');
  });

  test('handles wrong number gracefully', async () => {
    const utterances = createMockUtterances([
      "Hello, is this Pizza Palace?",
      "No, you have the wrong number",
      "Oh sorry about that"
    ]);

    context = new AgentContext(
      utterances.map(u => u.text).join(' '),
      utterances,
      {
        callId: 'test-4',
        organizationId: 'org-1',
        callDate: new Date()
      }
    );

    const result = await agent.execute(context);

    expect(result.primaryType).toBe('wrong_number');
  });
});

describe('Speaker Identification Agent', () => {
  let agent: SpeakerIdentificationAgent;
  let context: AgentContext;

  beforeEach(() => {
    agent = new SpeakerIdentificationAgent();
  });

  test('identifies broker and carrier correctly', async () => {
    const utterances = createMockUtterances([
      "What's your MC number?",
      "MC 123456, we have trucks in the area",
      "What's your rate for Chicago to Dallas?",
      "I need $2,500 for that",
      "I can offer $2,200",
      "Let me check with my driver"
    ]);

    context = new AgentContext(
      utterances.map(u => u.text).join(' '),
      utterances,
      {
        callId: 'test-5',
        organizationId: 'org-1',
        callDate: new Date()
      }
    );

    // Add classification first (dependency)
    context.addAgentOutput('classification', {
      agentName: 'classification',
      status: 'completed',
      output: {
        primaryType: 'carrier_quote',
        confidence: { value: 0.9, level: 'high' }
      },
      executionTime: 100
    });

    const result = await agent.execute(context);

    expect(result.speakers.size).toBe(2);

    const speakerA = result.speakers.get('A');
    const speakerB = result.speakers.get('B');

    expect(speakerA?.role).toBe('broker');
    expect(speakerB?.role).toBe('carrier');
    expect(result.brokerSpeakerId).toBe('A');
  });

  test('identifies broker and shipper correctly', async () => {
    const utterances = createMockUtterances([
      "I need to ship 20 pallets",
      "Where from and to?",
      "From our facility in Atlanta to Miami",
      "When does it need to pick up?",
      "Tomorrow morning by 8 AM",
      "I can handle that for $1,800"
    ]);

    context = new AgentContext(
      utterances.map(u => u.text).join(' '),
      utterances,
      {
        callId: 'test-6',
        organizationId: 'org-1',
        callDate: new Date()
      }
    );

    // Add classification first
    context.addAgentOutput('classification', {
      agentName: 'classification',
      status: 'completed',
      output: {
        primaryType: 'new_booking',
        confidence: { value: 0.9, level: 'high' }
      },
      executionTime: 100
    });

    const result = await agent.execute(context);

    const speakerA = result.speakers.get('A');
    const speakerB = result.speakers.get('B');

    expect(speakerA?.role).toBe('shipper');
    expect(speakerB?.role).toBe('broker');
  });

  test('handles unknown speakers gracefully', async () => {
    const utterances = createMockUtterances([
      "Hello?",
      "Hi there",
      "Can you hear me?",
      "Yes, go ahead"
    ]);

    context = new AgentContext(
      utterances.map(u => u.text).join(' '),
      utterances,
      {
        callId: 'test-7',
        organizationId: 'org-1',
        callDate: new Date()
      }
    );

    const result = await agent.execute(context);

    expect(result.confidence.value).toBeLessThan(0.5);
    expect(result.confidence.level).toBe('low');
  });
});

describe('Agent Registry and Routing', () => {
  let registry: AgentRegistry;
  let coordinator: AgentCoordinator;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    registry.clear();
    registry.initialize();
    coordinator = new AgentCoordinator();
  });

  test('registry initializes with Phase 2 agents', () => {
    expect(registry.has('classification')).toBe(true);
    expect(registry.has('speaker_identification')).toBe(true);
  });

  test('routing strategy builds correct plan for carrier quote', () => {
    const plan = RoutingStrategy.buildExecutionPlan('carrier_quote');

    expect(plan.phases.length).toBeGreaterThan(0);
    expect(plan.phases[0].name).toBe('foundation');
    expect(plan.phases[0].agents).toContainEqual(
      expect.objectContaining({ name: 'speaker_identification' })
    );
  });

  test('routing strategy builds correct plan for new booking', () => {
    const plan = RoutingStrategy.buildExecutionPlan('new_booking');

    expect(plan.phases.length).toBeGreaterThan(0);
    expect(plan.phases[0].name).toBe('foundation');
  });

  test('routing strategy returns null extraction for wrong number', () => {
    const plan = RoutingStrategy.buildExecutionPlan('wrong_number');

    // Should have foundation phase but no extraction phase
    expect(plan.phases.length).toBe(1);
    expect(plan.phases[0].name).toBe('foundation');
  });

  test('coordinator gets correct agents for call type', () => {
    const agents = coordinator.getAgentsForCallType('carrier_quote');

    expect(agents.some(a => a.name === 'classification')).toBe(true);
    expect(agents.some(a => a.name === 'speaker_identification')).toBe(true);
  });

  test('coordinator determines execution order correctly', () => {
    const order = coordinator.getExecutionOrder('carrier_quote');

    expect(order[0]).toEqual(['classification']);
    expect(order[1]).toContain('speaker_identification');
  });

  test('critical agents identified correctly', () => {
    const criticalCarrier = RoutingStrategy.getCriticalAgents('carrier_quote');
    expect(criticalCarrier).toContain('classification');

    const criticalBooking = RoutingStrategy.getCriticalAgents('new_booking');
    expect(criticalBooking).toContain('classification');

    const criticalCheck = RoutingStrategy.getCriticalAgents('check_call');
    expect(criticalCheck).toContain('classification');
  });
});

describe('Agent Context Integration', () => {
  let context: AgentContext;

  beforeEach(() => {
    const utterances = createMockUtterances(['Test', 'Response']);
    context = new AgentContext(
      'Test transcript',
      utterances,
      {
        callId: 'test-context',
        organizationId: 'org-1',
        callDate: new Date()
      }
    );
  });

  test('context accumulates agent outputs correctly', () => {
    context.addAgentOutput('test-agent', {
      agentName: 'test-agent',
      status: 'completed',
      output: { test: 'data' },
      executionTime: 100,
      tokensUsed: 50
    });

    expect(context.hasAgentCompleted('test-agent')).toBe(true);
    expect(context.getAgentOutput('test-agent')).toEqual({ test: 'data' });
    expect(context.getTotalTokensUsed()).toBe(50);
  });

  test('context tracks execution summary', () => {
    context.addAgentOutput('agent1', {
      agentName: 'agent1',
      status: 'completed',
      executionTime: 100
    });

    context.addAgentOutput('agent2', {
      agentName: 'agent2',
      status: 'failed',
      executionTime: 50
    });

    const summary = context.getExecutionSummary();
    expect(summary.totalAgents).toBe(2);
    expect(summary.completed).toBe(1);
    expect(summary.failed).toBe(1);
  });

  test('context snapshot and restore works', () => {
    context.addAgentOutput('agent1', {
      agentName: 'agent1',
      status: 'completed',
      output: { data: 'test' },
      executionTime: 100
    });

    const snapshot = context.createSnapshot();

    // Clear and restore
    context = new AgentContext('', [], {
      callId: 'new',
      organizationId: 'new',
      callDate: new Date()
    });

    context.restoreFromSnapshot(snapshot);

    expect(context.hasAgentCompleted('agent1')).toBe(true);
    expect(context.getAgentOutput('agent1')).toEqual({ data: 'test' });
  });
});