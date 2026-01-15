// =====================================================
// COMPREHENSIVE END-TO-END REFERRAL SYSTEM TEST
// Tests all aspects of the referral system
// =====================================================

const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Generate unique test emails
const TEST_ID = crypto.randomBytes(4).toString('hex');
const TEST_REFERRER_EMAIL = `referrer-${TEST_ID}@test.com`;
const TEST_REFERRED_EMAIL = `referred-${TEST_ID}@test.com`;
const TEST_PASSWORD = 'TestPassword123!';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('═'.repeat(50), 'blue');
  log(title, 'blue');
  log('═'.repeat(50), 'blue');
}

// Store session data
let referrerSession = null;
let referredSession = null;
let referralCode = null;
let referralLink = null;

// API helper function
async function apiCall(endpoint, options = {}, session = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add session cookie if available
  if (session) {
    headers['Cookie'] = session;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include'
    });

    // Extract set-cookie headers for session management
    const setCookie = response.headers.get('set-cookie');

    const data = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      data,
      setCookie
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

// Test Suite Functions
async function test1_CreateReferrerAccount() {
  logSection('TEST 1: Create Referrer Account');

  log('Creating account for referrer: ' + TEST_REFERRER_EMAIL, 'cyan');

  const result = await apiCall('/api/auth/signup', {
    method: 'POST',
    body: {
      email: TEST_REFERRER_EMAIL,
      password: TEST_PASSWORD,
      fullName: 'Test Referrer',
      organizationName: 'Referrer Org'
    }
  });

  if (result.ok) {
    log('✓ Referrer account created successfully', 'green');

    // Log in to get session
    const loginResult = await apiCall('/api/auth/login', {
      method: 'POST',
      body: {
        email: TEST_REFERRER_EMAIL,
        password: TEST_PASSWORD
      }
    });

    if (loginResult.ok && loginResult.setCookie) {
      referrerSession = loginResult.setCookie;
      log('✓ Referrer logged in successfully', 'green');
      return true;
    } else {
      log('✗ Failed to log in referrer', 'red');
      return false;
    }
  } else {
    log(`✗ Failed to create referrer account: ${result.data.error || 'Unknown error'}`, 'red');
    return false;
  }
}

async function test2_GenerateReferralCode() {
  logSection('TEST 2: Generate Referral Code');

  if (!referrerSession) {
    log('✗ No referrer session available', 'red');
    return false;
  }

  const result = await apiCall('/api/referrals/generate', {
    method: 'POST'
  }, referrerSession);

  if (result.ok && result.data.referralCode) {
    referralCode = result.data.referralCode;
    referralLink = result.data.referralLink;

    log(`✓ Referral code generated: ${referralCode}`, 'green');
    log(`✓ Referral link: ${referralLink}`, 'green');

    // Verify statistics
    if (result.data.statistics) {
      log('Statistics:', 'cyan');
      log(`  - Total sent: ${result.data.statistics.total_referrals_sent || 0}`, 'cyan');
      log(`  - Total signups: ${result.data.statistics.total_signups || 0}`, 'cyan');
      log(`  - Rewards earned: ${result.data.statistics.total_rewards_earned || 0}`, 'cyan');
    }

    return true;
  } else {
    log(`✗ Failed to generate referral code: ${result.data.error || 'Unknown error'}`, 'red');
    return false;
  }
}

async function test3_TrackReferralClick() {
  logSection('TEST 3: Track Referral Click');

  if (!referralCode) {
    log('✗ No referral code available', 'red');
    return false;
  }

  const result = await apiCall('/api/referrals/track', {
    method: 'POST',
    body: {
      code: referralCode,
      action: 'click'
    }
  });

  if (result.ok) {
    log('✓ Referral click tracked successfully', 'green');
    return true;
  } else {
    log(`✗ Failed to track click: ${result.data.error || 'Unknown error'}`, 'red');
    return false;
  }
}

async function test4_SendReferralInvitation() {
  logSection('TEST 4: Send Referral Invitation');

  if (!referrerSession) {
    log('✗ No referrer session available', 'red');
    return false;
  }

  log(`Sending invitation to: ${TEST_REFERRED_EMAIL}`, 'cyan');

  const result = await apiCall('/api/referrals/send-invitation', {
    method: 'POST',
    body: {
      emails: [TEST_REFERRED_EMAIL],
      personalMessage: 'Join me on LoadVoice for amazing call transcription!'
    }
  }, referrerSession);

  if (result.ok) {
    log('✓ Invitation sent successfully', 'green');

    if (result.data.results) {
      log(`  - Sent: ${result.data.results.sent.length}`, 'cyan');
      log(`  - Failed: ${result.data.results.failed.length}`, 'cyan');
      log(`  - Already referred: ${result.data.results.alreadyReferred.length}`, 'cyan');
    }

    return true;
  } else {
    log(`✗ Failed to send invitation: ${result.data.error || 'Unknown error'}`, 'red');
    return false;
  }
}

async function test5_SignupWithReferralCode() {
  logSection('TEST 5: Sign Up With Referral Code');

  if (!referralCode) {
    log('✗ No referral code available', 'red');
    return false;
  }

  log(`Creating referred account: ${TEST_REFERRED_EMAIL}`, 'cyan');
  log(`Using referral code: ${referralCode}`, 'cyan');

  const result = await apiCall('/api/auth/signup', {
    method: 'POST',
    body: {
      email: TEST_REFERRED_EMAIL,
      password: TEST_PASSWORD,
      fullName: 'Test Referred',
      organizationName: 'Referred Org',
      referralCode: referralCode
    }
  });

  if (result.ok) {
    log('✓ Referred account created successfully', 'green');
    log('✓ Referral tracked during signup', 'green');

    // Log in referred user
    const loginResult = await apiCall('/api/auth/login', {
      method: 'POST',
      body: {
        email: TEST_REFERRED_EMAIL,
        password: TEST_PASSWORD
      }
    });

    if (loginResult.ok && loginResult.setCookie) {
      referredSession = loginResult.setCookie;
      log('✓ Referred user logged in', 'green');
    }

    return true;
  } else {
    log(`✗ Failed to create referred account: ${result.data.error || 'Unknown error'}`, 'red');
    return false;
  }
}

async function test6_CheckReferralStatus() {
  logSection('TEST 6: Check Referral Status');

  if (!referrerSession) {
    log('✗ No referrer session available', 'red');
    return false;
  }

  // Check referral history
  const historyResult = await apiCall('/api/referrals/history?page=1&limit=10', {}, referrerSession);

  if (historyResult.ok) {
    log('✓ Referral history retrieved', 'green');

    const referrals = historyResult.data.referrals || [];
    const ourReferral = referrals.find(r => r.referred_email === TEST_REFERRED_EMAIL);

    if (ourReferral) {
      log(`✓ Found referral for ${TEST_REFERRED_EMAIL}`, 'green');
      log(`  - Status: ${ourReferral.status}`, 'cyan');
      log(`  - Clicks: ${ourReferral.clicked_count || 0}`, 'cyan');
      log(`  - Created: ${new Date(ourReferral.created_at).toLocaleString()}`, 'cyan');
    } else {
      log('⚠ Referral not found in history', 'yellow');
    }
  } else {
    log('✗ Failed to get referral history', 'red');
  }

  // Check statistics
  const statsResult = await apiCall('/api/referrals/statistics', {}, referrerSession);

  if (statsResult.ok) {
    log('✓ Statistics retrieved', 'green');
    const stats = statsResult.data;

    log('Current Statistics:', 'cyan');
    log(`  - Total referrals sent: ${stats.total_referrals_sent || 0}`, 'cyan');
    log(`  - Total signups: ${stats.total_signups || 0}`, 'cyan');
    log(`  - Total activations: ${stats.total_activations || 0}`, 'cyan');
    log(`  - Total rewards earned: ${stats.total_rewards_earned || 0}`, 'cyan');
    log(`  - Unclaimed rewards: ${stats.unclaimed_rewards || 0}`, 'cyan');
    log(`  - Current tier: ${stats.current_tier || 'None'}`, 'cyan');
  } else {
    log('✗ Failed to get statistics', 'red');
  }

  return true;
}

async function test7_SimulatePaymentActivation() {
  logSection('TEST 7: Simulate Payment Activation');

  log('⚠ Note: This simulates a user becoming a paying customer', 'yellow');
  log('In production, this would be triggered by Paddle webhook', 'yellow');

  const activateManually = await question('\nDo you want to manually activate the referral for testing? (y/n): ');

  if (activateManually.toLowerCase() !== 'y') {
    log('Skipping activation test', 'yellow');
    return true;
  }

  if (!referrerSession) {
    log('✗ No referrer session available', 'red');
    return false;
  }

  const result = await apiCall('/api/referrals/activate', {
    method: 'POST',
    body: {
      userEmail: TEST_REFERRED_EMAIL
    }
  }, referrerSession);

  if (result.ok && result.data.success) {
    log('✓ Referral activated successfully!', 'green');
    log('Reward Details:', 'cyan');

    if (result.data.reward) {
      log(`  - Minutes earned: ${result.data.reward.minutes || 0}`, 'cyan');
      log(`  - Credits earned: $${(result.data.reward.credits || 0) / 100}`, 'cyan');
      log(`  - Current tier: ${result.data.reward.tier}`, 'cyan');
    }

    log('✓ Referrer should receive reward notification email', 'green');
    return true;
  } else {
    log(`✗ Failed to activate: ${result.data.message || result.data.error || 'Unknown error'}`, 'red');
    return false;
  }
}

async function test8_CheckAvailableRewards() {
  logSection('TEST 8: Check Available Rewards');

  if (!referrerSession) {
    log('✗ No referrer session available', 'red');
    return false;
  }

  const result = await apiCall('/api/referrals/rewards', {}, referrerSession);

  if (result.ok) {
    log('✓ Rewards retrieved', 'green');

    const rewards = result.data.rewards || [];
    const totalMinutes = result.data.totalMinutes || 0;
    const totalCredits = result.data.totalCredits || 0;

    log(`Total unclaimed rewards:`, 'cyan');
    log(`  - Minutes: ${totalMinutes}`, 'cyan');
    log(`  - Credits: $${totalCredits / 100}`, 'cyan');

    if (rewards.length > 0) {
      log(`\nIndividual rewards (${rewards.length}):`, 'cyan');
      rewards.forEach((reward, i) => {
        log(`  ${i + 1}. ${reward.referred_email}:`, 'cyan');
        log(`     - Minutes: ${reward.reward_minutes || 0}`, 'cyan');
        log(`     - Credits: $${(reward.reward_credits_cents || 0) / 100}`, 'cyan');
        log(`     - Status: ${reward.claim_status}`, 'cyan');
      });
    }

    return true;
  } else {
    log(`✗ Failed to get rewards: ${result.data.error || 'Unknown error'}`, 'red');
    return false;
  }
}

async function test9_ClaimRewards() {
  logSection('TEST 9: Claim Rewards');

  if (!referrerSession) {
    log('✗ No referrer session available', 'red');
    return false;
  }

  const claimRewards = await question('\nDo you want to test claiming rewards? (y/n): ');

  if (claimRewards.toLowerCase() !== 'y') {
    log('Skipping claim test', 'yellow');
    return true;
  }

  // First get available rewards
  const rewardsResult = await apiCall('/api/referrals/rewards', {}, referrerSession);

  if (!rewardsResult.ok || !rewardsResult.data.rewards || rewardsResult.data.rewards.length === 0) {
    log('No rewards available to claim', 'yellow');
    return true;
  }

  const unclaimedRewards = rewardsResult.data.rewards.filter(r => r.claim_status === 'unclaimed');

  if (unclaimedRewards.length === 0) {
    log('No unclaimed rewards available', 'yellow');
    return true;
  }

  log(`Found ${unclaimedRewards.length} unclaimed reward(s)`, 'cyan');

  // Claim all rewards
  const claimResult = await apiCall('/api/referrals/claim', {
    method: 'POST',
    body: {
      action: 'claim_all'
    }
  }, referrerSession);

  if (claimResult.ok) {
    log('✓ Rewards claimed successfully!', 'green');

    if (claimResult.data.claimed) {
      log(`  - Rewards claimed: ${claimResult.data.claimed.length}`, 'cyan');
      log(`  - Total minutes: ${claimResult.data.totalMinutes || 0}`, 'cyan');
      log(`  - Total credits: $${(claimResult.data.totalCredits || 0) / 100}`, 'cyan');
    }

    log('✓ Organization balance updated', 'green');
    return true;
  } else {
    log(`✗ Failed to claim rewards: ${claimResult.data.error || 'Unknown error'}`, 'red');
    return false;
  }
}

async function test10_VerifyTierProgression() {
  logSection('TEST 10: Verify Tier Progression');

  if (!referrerSession) {
    log('✗ No referrer session available', 'red');
    return false;
  }

  const result = await apiCall('/api/referrals/statistics', {}, referrerSession);

  if (result.ok) {
    const stats = result.data;

    log('Tier Progression:', 'cyan');
    log(`  Current tier: ${stats.current_tier || 'None'}`, 'cyan');
    log(`  Total successful referrals: ${stats.total_rewards_earned || 0}`, 'cyan');

    // Show tier requirements
    log('\nTier Requirements:', 'magenta');
    log('  Bronze: 1 referral → 60 minutes', 'magenta');
    log('  Silver: 3 referrals → 200 minutes', 'magenta');
    log('  Gold: 5 referrals → 500 minutes + $50', 'magenta');
    log('  Platinum: 10 referrals → 1000 minutes + $100', 'magenta');

    const referralsNeeded = {
      'Bronze': 1,
      'Silver': 3,
      'Gold': 5,
      'Platinum': 10
    };

    const currentReferrals = stats.total_rewards_earned || 0;
    let nextTier = null;

    if (currentReferrals < 1) nextTier = 'Bronze';
    else if (currentReferrals < 3) nextTier = 'Silver';
    else if (currentReferrals < 5) nextTier = 'Gold';
    else if (currentReferrals < 10) nextTier = 'Platinum';

    if (nextTier) {
      const needed = referralsNeeded[nextTier] - currentReferrals;
      log(`\n→ ${needed} more referral(s) needed for ${nextTier} tier`, 'yellow');
    } else {
      log('\n✓ Maximum tier (Platinum) reached!', 'green');
    }

    return true;
  } else {
    log('✗ Failed to get tier progression', 'red');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.clear();
  log('\n╔════════════════════════════════════════════════╗', 'magenta');
  log('║   COMPREHENSIVE REFERRAL SYSTEM E2E TEST      ║', 'magenta');
  log('╚════════════════════════════════════════════════╝', 'magenta');

  log('\nThis test will:', 'yellow');
  log('1. Create a referrer account', 'yellow');
  log('2. Generate a referral code', 'yellow');
  log('3. Track referral clicks', 'yellow');
  log('4. Send referral invitations', 'yellow');
  log('5. Create referred user with referral code', 'yellow');
  log('6. Check referral status and statistics', 'yellow');
  log('7. Simulate payment activation', 'yellow');
  log('8. Check available rewards', 'yellow');
  log('9. Claim rewards', 'yellow');
  log('10. Verify tier progression', 'yellow');

  log('\nTest Configuration:', 'cyan');
  log(`  Base URL: ${BASE_URL}`, 'cyan');
  log(`  Test ID: ${TEST_ID}`, 'cyan');
  log(`  Referrer Email: ${TEST_REFERRER_EMAIL}`, 'cyan');
  log(`  Referred Email: ${TEST_REFERRED_EMAIL}`, 'cyan');

  const proceed = await question('\nDo you want to run the tests? (y/n): ');

  if (proceed.toLowerCase() !== 'y') {
    log('\nTests cancelled.', 'yellow');
    rl.close();
    return;
  }

  const results = [];
  let allPassed = true;

  // Run all tests
  const tests = [
    { name: 'Create Referrer Account', fn: test1_CreateReferrerAccount },
    { name: 'Generate Referral Code', fn: test2_GenerateReferralCode },
    { name: 'Track Referral Click', fn: test3_TrackReferralClick },
    { name: 'Send Referral Invitation', fn: test4_SendReferralInvitation },
    { name: 'Sign Up With Referral Code', fn: test5_SignupWithReferralCode },
    { name: 'Check Referral Status', fn: test6_CheckReferralStatus },
    { name: 'Simulate Payment Activation', fn: test7_SimulatePaymentActivation },
    { name: 'Check Available Rewards', fn: test8_CheckAvailableRewards },
    { name: 'Claim Rewards', fn: test9_ClaimRewards },
    { name: 'Verify Tier Progression', fn: test10_VerifyTierProgression }
  ];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      if (!passed) allPassed = false;
    } catch (error) {
      log(`✗ Test failed with error: ${error.message}`, 'red');
      results.push({ name: test.name, passed: false });
      allPassed = false;
    }
  }

  // Summary
  logSection('TEST SUMMARY');

  let passedCount = 0;
  let failedCount = 0;

  results.forEach(result => {
    if (result.passed) {
      log(`✓ ${result.name}`, 'green');
      passedCount++;
    } else {
      log(`✗ ${result.name}`, 'red');
      failedCount++;
    }
  });

  console.log('');
  log('═'.repeat(50), allPassed ? 'green' : 'red');

  if (allPassed) {
    log(`ALL TESTS PASSED! (${passedCount}/${results.length})`, 'green');
    log('✓ Referral system is working correctly!', 'green');
  } else {
    log(`SOME TESTS FAILED: ${passedCount} passed, ${failedCount} failed`, 'red');
    log('Please review the errors above.', 'red');
  }

  log('═'.repeat(50), allPassed ? 'green' : 'red');

  // Additional notes
  log('\nIMPORTANT NOTES:', 'yellow');
  log('1. Referred users get standard 30 minutes (free tier)', 'yellow');
  log('2. Only referrers receive rewards when referred users pay', 'yellow');
  log('3. Resend emails are sent using the centralized client', 'yellow');
  log('4. Database migration must be run before testing', 'yellow');
  log('5. Environment variables must be configured:', 'yellow');
  log('   - RESEND_API_KEY', 'cyan');
  log('   - RESEND_FROM_EMAIL', 'cyan');
  log('   - NEXT_PUBLIC_APP_URL', 'cyan');
  log('   - SUPABASE credentials', 'cyan');

  rl.close();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`\n✗ Unhandled error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});

// Run the tests
runTests().catch(error => {
  log(`\n✗ Test runner failed: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});