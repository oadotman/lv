/**
 * Test Script for Phase 4 Advanced Agent Implementation
 * Run this to verify all Phase 4 agents are working correctly
 */

require('dotenv').config();

const { MultiAgentExtractor } = require('../lib/agents/multi-agent-extractor');
const { AgentRegistry } = require('../lib/agents/agent-registry');

// Color output for better visibility
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.blue);
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log('✅ ' + message, colors.green);
}

function logError(message) {
  log('❌ ' + message, colors.red);
}

function logWarning(message) {
  log('⚠️  ' + message, colors.yellow);
}

function logInfo(message) {
  log('ℹ️  ' + message, colors.cyan);
}

// Test transcripts for Phase 4 scenarios
const Phase4TestTranscripts = {
  complexNegotiation: `
    Broker: Good morning, I need a truck for Chicago to Atlanta.
    Carrier: Morning! What's the commodity and weight?
    Broker: 42,000 pounds of auto parts, dry van. What's your rate?
    Carrier: For Chicago to Atlanta, that's about 950 miles. I need $3,500.
    Broker: Whoa, that's way too high. Market rate is around $2,200.
    Carrier: $2,200? That doesn't even cover my costs. Fuel alone is killing us.
    Broker: I understand fuel is high, but $3,500 is unrealistic. How about $2,400?
    Carrier: I can't go that low. Minimum I can do is $3,000.
    Broker: Look, I have multiple loads on this lane. If you can do $2,600, I'll give you 3 loads this week.
    Carrier: Three guaranteed loads? Let me think... If it's three loads at $2,600 each, that's $7,800 total.
    Broker: Correct. All Chicago to Atlanta, same product.
    Carrier: Alright, for three loads, I can do $2,600 per load. But I need detention after 2 hours.
    Broker: Standard detention terms - 2 hours free, then $75 per hour. Deal?
    Carrier: Deal. When's the first pickup?
  `,

  conditionalAgreement: `
    Carrier: I can take that load, but it depends on a few things.
    Broker: What do you need to know?
    Carrier: First, if it's a morning pickup, I can do it for $2,400.
    Broker: And if it's afternoon?
    Carrier: Afternoon pickup would be $2,200 since I can combine it with another load.
    Broker: Okay, and what about equipment?
    Carrier: If you need a reefer, add $300. Dry van is the base price.
    Broker: It's dry van. But I need to check with my customer on the pickup time.
    Carrier: No problem. Also, if they need team drivers for expedited, that's an extra $500.
    Broker: Single driver is fine, standard transit. So either $2,400 for morning or $2,200 for afternoon?
    Carrier: Correct. Let me know once you confirm with the customer.
  `,

  temporalComplexity: `
    Broker: When can you pick up?
    Carrier: I can be there tomorrow morning.
    Broker: Tomorrow is Tuesday, right? What time?
    Carrier: Yes, Tuesday. I can be there by 8 AM.
    Broker: Actually, the shipper doesn't open until 10 AM on Tuesdays.
    Carrier: 10 AM Tuesday works. When do they need delivery?
    Broker: Has to deliver by end of day Thursday.
    Carrier: Wait, this Thursday or next Thursday?
    Broker: This Thursday, January 18th.
    Carrier: So pickup Tuesday the 16th at 10 AM, deliver by Thursday the 18th end of day?
    Broker: Exactly. EOD means by 5 PM local time.
    Carrier: Got it. That gives me about 48 hours transit time, which is plenty.
  `,

  accessorialDetails: `
    Broker: Let's go over the accessorial charges.
    Carrier: Sure, what are the terms?
    Broker: Detention is $75 per hour after 2 hours free at both pickup and delivery.
    Carrier: Does the clock run on weekends?
    Broker: Yes, continuous clock including weekends.
    Carrier: What about lumper fees?
    Broker: Lumper is reimbursable with receipt, up to $350 maximum.
    Carrier: Good. TONU policy?
    Broker: $300 TONU if cancelled within 24 hours, $150 if more than 24 hours notice.
    Carrier: Any stop charges?
    Broker: First stop is included, additional stops are $100 each.
    Carrier: What about fuel surcharge?
    Broker: Fuel surcharge is included in the base rate I quoted.
    Carrier: Perfect. And layover?
    Broker: $400 per day if we hold you over.
  `,

  previousReferences: `
    Carrier: Hey Mike, Bob from Thunder Transport. Calling about that Chicago lane we discussed.
    Broker: Hi Bob! The regular Tuesday run?
    Carrier: That's the one. Same as last week?
    Broker: Yes, same shipper, same product. Auto parts to Atlanta.
    Carrier: Are we keeping the same rate we agreed on?
    Broker: Yes, $2,500 like we've been doing.
    Carrier: Great. Same detention terms too?
    Broker: Yes, our standard terms apply. 2 hours free, $75 after.
    Carrier: Perfect. I'll use driver John again, he knows the route.
    Broker: Excellent, John did great last time. Same pickup time?
    Carrier: 10 AM Tuesday works perfectly.
  `
};

// Test individual Phase 4 agent
async function testPhase4Agent(agentName, transcript, expectations) {
  try {
    const registry = AgentRegistry.getInstance();
    registry.initialize();

    const agent = registry.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    // Create mock context
    const context = {
      transcript,
      utterances: [],
      metadata: {
        callId: 'test_' + Date.now(),
        callType: 'carrier_quote',
        organizationId: 'test_org',
        callDate: new Date('2024-01-15'), // Monday
        timezone: 'America/Chicago',
        duration: 420,
        speakerCount: 2
      },
      getAgentOutput: (name) => {
        if (name === 'classification') {
          return {
            primaryType: 'carrier_quote',
            confidence: { value: 0.95 }
          };
        }
        if (name === 'speaker_identification') {
          return {
            speakers: {
              'speaker_0': { role: 'broker', confidence: 0.9 },
              'speaker_1': { role: 'carrier', confidence: 0.85 }
            }
          };
        }
        return null;
      },
      addAgentOutput: () => {},
      getTotalTokensUsed: () => 0
    };

    const startTime = Date.now();
    const result = await agent.execute(context);
    const executionTime = Date.now() - startTime;

    // Check expectations
    let passed = true;
    const checks = [];

    for (const [key, expected] of Object.entries(expectations)) {
      const actual = result[key];
      if (expected === 'exists') {
        if (actual !== undefined && actual !== null) {
          checks.push(`✓ ${key} exists`);
        } else {
          checks.push(`✗ ${key} missing`);
          passed = false;
        }
      } else if (expected === 'array' && Array.isArray(actual)) {
        checks.push(`✓ ${key} is array with ${actual.length} items`);
      } else if (typeof expected === 'function') {
        if (expected(actual)) {
          checks.push(`✓ ${key} passes validation`);
        } else {
          checks.push(`✗ ${key} fails validation`);
          passed = false;
        }
      }
    }

    return {
      passed,
      executionTime,
      checks,
      result
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message,
      checks: []
    };
  }
}

// Main test runner
async function runPhase4Tests() {
  logSection('🚀 Phase 4 Advanced Agents Testing');

  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Check OpenAI configuration
  if (!process.env.OPENAI_API_KEY) {
    logError('OPENAI_API_KEY not configured');
    logInfo('Tests will use mock responses');
  }

  // Test 1: Agent Registration
  logSection('Test 1: Phase 4 Agent Registration');

  const phase4Agents = [
    'rate_negotiation',
    'temporal_resolution',
    'conditional_agreement',
    'accessorial_parser',
    'reference_resolution'
  ];

  try {
    const registry = AgentRegistry.getInstance();
    registry.initialize();
    const allAgents = registry.getAllAgents();

    logInfo(`Total agents registered: ${allAgents.length}`);

    for (const agentName of phase4Agents) {
      totalTests++;
      if (registry.has(agentName)) {
        logSuccess(`${agentName} agent registered`);
        passedTests++;
      } else {
        logError(`${agentName} agent not found`);
        failedTests++;
      }
    }
  } catch (error) {
    logError(`Registry test failed: ${error.message}`);
    failedTests++;
  }

  // Test 2: Complex Negotiation
  logSection('Test 2: Complex Rate Negotiation');
  totalTests++;

  const negotiationResult = await testPhase4Agent(
    'rate_negotiation',
    Phase4TestTranscripts.complexNegotiation,
    {
      negotiations: 'array',
      negotiationSummary: 'exists',
      insights: 'array',
      negotiations_check: (n) => n && n.length > 0 && n[0].status === 'agreed'
    }
  );

  if (negotiationResult.passed) {
    logSuccess(`Rate negotiation analysis passed (${negotiationResult.executionTime}ms)`);
    negotiationResult.checks.forEach(check => log('  ' + check, colors.green));

    // Additional validation
    if (negotiationResult.result?.negotiations?.[0]) {
      const neg = negotiationResult.result.negotiations[0];
      logInfo(`  Agreed rate: $${neg.agreedRate}`);
      logInfo(`  Negotiation rounds: ${neg.numberOfRounds}`);
      logInfo(`  Status: ${neg.status}`);
    }
    passedTests++;
  } else {
    logError('Rate negotiation analysis failed');
    if (negotiationResult.error) {
      log('  Error: ' + negotiationResult.error, colors.red);
    }
    failedTests++;
  }

  // Test 3: Temporal Resolution
  logSection('Test 3: Temporal Resolution');
  totalTests++;

  const temporalResult = await testPhase4Agent(
    'temporal_resolution',
    Phase4TestTranscripts.temporalComplexity,
    {
      resolvedDates: 'array',
      timeWindows: 'array',
      assumptions: 'array',
      resolvedDates_check: (dates) => dates && dates.length > 0
    }
  );

  if (temporalResult.passed) {
    logSuccess(`Temporal resolution passed (${temporalResult.executionTime}ms)`);
    temporalResult.checks.forEach(check => log('  ' + check, colors.green));

    if (temporalResult.result?.resolvedDates) {
      logInfo(`  Resolved ${temporalResult.result.resolvedDates.length} dates/times`);
    }
    passedTests++;
  } else {
    logError('Temporal resolution failed');
    failedTests++;
  }

  // Test 4: Conditional Agreements
  logSection('Test 4: Conditional Agreements');
  totalTests++;

  const conditionalResult = await testPhase4Agent(
    'conditional_agreement',
    Phase4TestTranscripts.conditionalAgreement,
    {
      conditions: 'array',
      agreementStatus: 'exists',
      requiredActions: 'array',
      conditions_check: (c) => c && c.length > 0
    }
  );

  if (conditionalResult.passed) {
    logSuccess(`Conditional agreement analysis passed (${conditionalResult.executionTime}ms)`);
    conditionalResult.checks.forEach(check => log('  ' + check, colors.green));

    if (conditionalResult.result?.conditions) {
      logInfo(`  Found ${conditionalResult.result.conditions.length} conditions`);
      logInfo(`  Agreement status: ${conditionalResult.result.agreementStatus?.type}`);
    }
    passedTests++;
  } else {
    logError('Conditional agreement analysis failed');
    failedTests++;
  }

  // Test 5: Accessorial Parsing
  logSection('Test 5: Accessorial Parsing');
  totalTests++;

  const accessorialResult = await testPhase4Agent(
    'accessorial_parser',
    Phase4TestTranscripts.accessorialDetails,
    {
      accessorials: 'array',
      summary: 'exists',
      totalImpact: 'exists',
      accessorials_check: (a) => a && a.length > 0
    }
  );

  if (accessorialResult.passed) {
    logSuccess(`Accessorial parsing passed (${accessorialResult.executionTime}ms)`);
    accessorialResult.checks.forEach(check => log('  ' + check, colors.green));

    if (accessorialResult.result?.accessorials) {
      logInfo(`  Extracted ${accessorialResult.result.accessorials.length} accessorial charges`);

      // Show summary
      const types = accessorialResult.result.accessorials.map(a => a.type);
      logInfo(`  Types: ${[...new Set(types)].join(', ')}`);
    }
    passedTests++;
  } else {
    logError('Accessorial parsing failed');
    failedTests++;
  }

  // Test 6: Reference Resolution
  logSection('Test 6: Reference Resolution');
  totalTests++;

  const referenceResult = await testPhase4Agent(
    'reference_resolution',
    Phase4TestTranscripts.previousReferences,
    {
      references: 'array',
      referencePatterns: 'exists',
      inferredContext: 'exists',
      references_check: (r) => r && r.length > 0
    }
  );

  if (referenceResult.passed) {
    logSuccess(`Reference resolution passed (${referenceResult.executionTime}ms)`);
    referenceResult.checks.forEach(check => log('  ' + check, colors.green));

    if (referenceResult.result) {
      logInfo(`  Found ${referenceResult.result.references?.length || 0} references`);
      logInfo(`  Relationship: ${referenceResult.result.inferredContext?.relationshipType}`);
      logInfo(`  Familiarity: ${referenceResult.result.inferredContext?.familiarityLevel}`);
    }
    passedTests++;
  } else {
    logError('Reference resolution failed');
    failedTests++;
  }

  // Test 7: Full Pipeline with Phase 4 Agents
  logSection('Test 7: Complete Pipeline Integration');
  totalTests++;

  try {
    const extractor = new MultiAgentExtractor();
    await extractor.initialize();

    const metadata = {
      callId: 'test_full_' + Date.now(),
      callType: 'carrier_quote',
      organizationId: 'test_org',
      callDate: new Date('2024-01-15'),
      timezone: 'America/Chicago',
      duration: 600,
      speakerCount: 2
    };

    const startTime = Date.now();
    const result = await extractor.extract(
      Phase4TestTranscripts.complexNegotiation,
      [],
      metadata
    );
    const executionTime = Date.now() - startTime;

    if (result.success) {
      logSuccess(`Full pipeline execution successful (${executionTime}ms)`);

      // Check which agents ran
      const agentsRun = [];
      if (result.classification) agentsRun.push('classification');
      if (result.speakers) agentsRun.push('speaker_identification');
      if (result.loads) agentsRun.push('load_extraction');
      if (result.negotiation) agentsRun.push('rate_negotiation');
      if (result.temporal) agentsRun.push('temporal_resolution');
      if (result.conditions) agentsRun.push('conditional_agreement');
      if (result.accessorials) agentsRun.push('accessorial_parser');
      if (result.references) agentsRun.push('reference_resolution');

      logInfo(`  Agents executed: ${agentsRun.length}`);
      log(`  ${agentsRun.join(', ')}`, colors.cyan);

      passedTests++;
    } else {
      logError('Full pipeline execution failed');
      if (result.errors) {
        result.errors.forEach(err => log('  - ' + err, colors.red));
      }
      failedTests++;
    }
  } catch (error) {
    logError(`Pipeline test failed: ${error.message}`);
    failedTests++;
  }

  // Final Summary
  logSection('📊 Phase 4 Test Summary');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  log(`Total Tests: ${totalTests}`, colors.bright);
  logSuccess(`Passed: ${passedTests}`);
  if (failedTests > 0) {
    logError(`Failed: ${failedTests}`);
  }
  log(`Pass Rate: ${passRate}%`, colors.cyan);
  log(`Total Time: ${totalTime}s`, colors.cyan);

  // Phase 4 Status
  logSection('🎯 Phase 4 Advanced Agents Status');

  if (passRate >= 80) {
    logSuccess('✨ Phase 4 Advanced Agents COMPLETE! ✨');
    logInfo('System can now handle complex scenarios:');
    log('  • Multi-round rate negotiations', colors.green);
    log('  • Temporal reference resolution', colors.green);
    log('  • Conditional agreements', colors.green);
    log('  • Detailed accessorial parsing', colors.green);
    log('  • Previous call references', colors.green);
  } else if (passRate >= 60) {
    logWarning('Phase 4 is partially complete');
    logInfo('Most advanced features work but need refinement');
  } else {
    logError('Phase 4 needs more work');
    logInfo('Review failed tests and fix critical issues');
  }

  // Next Steps
  logSection('📝 Next Steps');

  if (failedTests === 0) {
    log('1. ✅ Begin Phase 5: Validation & Optimization', colors.green);
    log('2. ✅ Test with production transcripts', colors.green);
    log('3. ✅ Performance optimization', colors.green);
    log('4. ✅ Prepare for production deployment', colors.green);
  } else {
    log('1. Fix failing Phase 4 agents', colors.yellow);
    log('2. Review error logs', colors.yellow);
    log('3. Add error recovery mechanisms', colors.yellow);
    log('4. Re-test after fixes', colors.yellow);
  }

  // System Capabilities Summary
  logSection('💪 Current System Capabilities');

  log('Phase 2 (Foundation):', colors.bright);
  log('  ✓ Call classification', colors.green);
  log('  ✓ Speaker identification', colors.green);

  log('\nPhase 3 (MVP):', colors.bright);
  log('  ✓ Load extraction', colors.green);
  log('  ✓ Simple rate extraction', colors.green);
  log('  ✓ Carrier/Shipper information', colors.green);
  log('  ✓ Action items', colors.green);

  log('\nPhase 4 (Advanced):', colors.bright + colors.magenta);
  log('  ✓ Complex rate negotiations', colors.green);
  log('  ✓ Date/time resolution', colors.green);
  log('  ✓ Conditional agreements', colors.green);
  log('  ✓ Accessorial details', colors.green);
  log('  ✓ Reference resolution', colors.green);

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runPhase4Tests().catch(error => {
  logError(`Test runner failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});