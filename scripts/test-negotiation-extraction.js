/**
 * Test script for negotiation extraction system
 * Tests various carrier call scenarios with rate negotiations
 */

require('dotenv').config({ path: '.env.local' });

// Sample test transcripts with different negotiation scenarios
const TEST_TRANSCRIPTS = {
  agreed: `
    Broker: Hey, I've got a load from Chicago to Dallas, 800 miles. What's your rate?
    Carrier: For that lane, I'd need at least $2,500 all in.
    Broker: That's a bit high. I can do $2,000 flat rate.
    Carrier: Can't do $2,000. How about $2,300?
    Broker: I can come up to $2,150, that's my best.
    Carrier: You know what, if you can guarantee detention after 2 hours, I'll take $2,150.
    Broker: Deal. $2,150 with detention after 2 hours. What's your MC number?
    Carrier: MC 123456. Driver's name is John Smith, truck 5541.
    Broker: Perfect, I'll send the rate con over. Pick up is tomorrow at 8 AM.
  `,

  pending: `
    Broker: I need coverage for Atlanta to Miami, paying $1,800.
    Carrier: That's a 650-mile run. I'd need at least $2,200 for that.
    Broker: Best I can do is $1,950.
    Carrier: Let me check with my driver and see if he's interested at $1,950. I'll call you back in 30 minutes.
    Broker: Sounds good, let me know. If he can do it, we need pickup by noon tomorrow.
    Carrier: Will do. My MC is 789012 if you want to check us out in the meantime.
  `,

  rejected: `
    Broker: Got a load from Denver to Phoenix, 850 miles, paying $1,500.
    Carrier: $1,500 for 850 miles? That's way too light, I need at least $2,400.
    Broker: I can maybe go up to $1,700.
    Carrier: No way, that doesn't even cover my fuel. I'm at $2,400 minimum.
    Broker: Sorry, can't do that. The load only pays $1,700 max.
    Carrier: Then I'll have to pass. That's just not workable for us.
    Broker: Alright, thanks anyway.
  `,

  callback: `
    Broker: Seattle to Portland, 175 miles, quick run. Paying $600.
    Carrier: That's pretty short. What's the commodity?
    Broker: Produce, needs refrigerated trailer.
    Carrier: For reefer, I'd need at least $800 for that short run.
    Broker: Can't go that high, max is $650.
    Carrier: I'll pass for now, but if you get stuck and can come up on the rate, give me a call. My MC is 345678.
    Broker: Will do, I'll keep you in mind if the rate improves.
  `,

  complex_negotiation: `
    Broker: I've got a team load, New York to LA, 2,800 miles, needs to deliver in 2 days.
    Carrier: Team load? What's the rate?
    Broker: Starting at $7,000 all miles.
    Carrier: For a team, we need at least $9,500. That's a hot load with tight delivery.
    Broker: I hear you. How about $8,000?
    Carrier: Can't do it. My teams won't run for less than $9,000. Plus, what about detention and lumper?
    Broker: Detention after 2 hours, lumper is on the receiver.
    Carrier: If you can do $8,500 and guarantee the lumper is covered, I can make it work.
    Broker: Alright, $8,500 all in, detention after 2 hours, lumper on receiver. Deal?
    Carrier: Deal. MC 567890. I've got team drivers ready to roll.
    Broker: Perfect, sending rate con now.
  `
};

async function testNegotiationExtraction(scenario, transcript) {
  console.log('\n========================================');
  console.log(`Testing: ${scenario.toUpperCase()}`);
  console.log('========================================\n');

  try {
    const { extractFreightData } = await import('../lib/openai-loadvoice.js');

    const result = await extractFreightData(transcript, 'carrier');

    // Display key negotiation outcomes
    if (result.negotiation_outcome) {
      const outcome = result.negotiation_outcome;

      console.log('📊 NEGOTIATION STATUS:', outcome.status);
      console.log('-------------------');

      if (outcome.agreed_rate) {
        console.log(`✅ Agreed Rate: $${outcome.agreed_rate} (${outcome.rate_type})`);
        console.log(`   Includes Fuel: ${outcome.rate_includes_fuel}`);
      }

      if (outcome.broker_final_position) {
        console.log(`💼 Broker Final: $${outcome.broker_final_position}`);
      }

      if (outcome.carrier_final_position) {
        console.log(`🚚 Carrier Final: $${outcome.carrier_final_position}`);
      }

      if (outcome.pending_reason) {
        console.log(`⏳ Pending Reason: ${outcome.pending_reason}`);
      }

      if (outcome.rejection_reason) {
        console.log(`❌ Rejection Reason: ${outcome.rejection_reason}`);
      }

      if (outcome.callback_conditions) {
        console.log(`📞 Callback Conditions: ${outcome.callback_conditions}`);
      }

      if (outcome.accessorials_discussed) {
        console.log('\n💰 Accessorials Discussed:');
        Object.entries(outcome.accessorials_discussed).forEach(([key, value]) => {
          if (value) console.log(`   - ${key}: ${value}`);
        });
      }

      if (outcome.contingencies && outcome.contingencies.length > 0) {
        console.log('\n⚠️ Contingencies:');
        outcome.contingencies.forEach(c => console.log(`   - ${c}`));
      }

      console.log('\n📊 Confidence Scores:');
      console.log(`   Agreement: ${outcome.confidence.agreement_status}%`);
      console.log(`   Rate: ${outcome.confidence.agreed_rate}%`);
      console.log(`   Positions: ${outcome.confidence.final_positions}%`);

      if (outcome.rate_history && outcome.rate_history.length > 0) {
        console.log('\n📈 Rate History:');
        outcome.rate_history.forEach(entry => {
          console.log(`   ${entry.speaker}: $${entry.rate}`);
        });
      }
    }

    // Display carrier details if extracted
    if (result.carrier_details) {
      console.log('\n🚛 CARRIER DETAILS:');
      console.log('-------------------');
      Object.entries(result.carrier_details).forEach(([key, value]) => {
        if (value) console.log(`   ${key}: ${value}`);
      });
    }

    // Display next steps
    if (result.next_steps && result.next_steps.length > 0) {
      console.log('\n📝 NEXT STEPS:');
      console.log('-------------------');
      result.next_steps.forEach((step, i) => {
        console.log(`   ${i + 1}. ${step}`);
      });
    }

    // Display validation warnings
    if (result.validation_warnings && result.validation_warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      console.log('-------------------');
      result.validation_warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }

    // Should generate rate confirmation?
    if (result.should_generate_rate_con !== undefined) {
      console.log(`\n📄 Generate Rate Con: ${result.should_generate_rate_con ? 'YES ✅' : 'NO ❌'}`);
    }

    return {
      scenario,
      status: result.negotiation_outcome?.status,
      agreedRate: result.negotiation_outcome?.agreed_rate,
      success: true
    };

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return {
      scenario,
      success: false,
      error: error.message
    };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Negotiation Extraction Tests');
  console.log('=========================================\n');

  const results = [];

  for (const [scenario, transcript] of Object.entries(TEST_TRANSCRIPTS)) {
    const result = await testNegotiationExtraction(scenario, transcript);
    results.push(result);

    // Add delay between API calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n\n=========================================');
  console.log('📊 TEST SUMMARY');
  console.log('=========================================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  console.log('\nResults by Scenario:');
  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    const status = r.status || 'ERROR';
    const rate = r.agreedRate ? `($${r.agreedRate})` : '';
    console.log(`  ${icon} ${r.scenario}: ${status} ${rate}`);
  });

  // Validate expected outcomes
  console.log('\n🎯 Validation Results:');
  const validations = [
    {
      scenario: 'agreed',
      expected: 'agreed',
      actual: results.find(r => r.scenario === 'agreed')?.status
    },
    {
      scenario: 'pending',
      expected: 'pending',
      actual: results.find(r => r.scenario === 'pending')?.status
    },
    {
      scenario: 'rejected',
      expected: 'rejected',
      actual: results.find(r => r.scenario === 'rejected')?.status
    },
    {
      scenario: 'callback',
      expected: 'callback_requested',
      actual: results.find(r => r.scenario === 'callback')?.status
    },
  ];

  validations.forEach(v => {
    const match = v.expected === v.actual;
    const icon = match ? '✅' : '❌';
    console.log(`  ${icon} ${v.scenario}: Expected "${v.expected}", Got "${v.actual}"`);
  });

  const allValidationsPassed = validations.every(v => v.expected === v.actual);

  console.log('\n=========================================');
  if (allValidationsPassed) {
    console.log('✅ All validations PASSED!');
  } else {
    console.log('❌ Some validations FAILED - Review the extraction logic');
  }
  console.log('=========================================\n');
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testNegotiationExtraction, runAllTests };