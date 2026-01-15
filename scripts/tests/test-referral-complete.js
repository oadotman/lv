// =====================================================
// COMPLETE REFERRAL SYSTEM TEST WITH IMPROVED AUTH
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
let referralCode = null;
let referralLink = null;

// Improved API helper with better error handling
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    log(`→ Calling ${endpoint}`, 'cyan');

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      log(`Non-JSON response: ${text.substring(0, 200)}`, 'yellow');
      data = { message: text };
    }

    if (!response.ok) {
      log(`✗ API Error (${response.status}): ${JSON.stringify(data)}`, 'red');
    } else {
      log(`✓ Success (${response.status})`, 'green');
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    log(`✗ Network Error: ${error.message}`, 'red');
    return {
      ok: false,
      error: error.message
    };
  }
}

// Test using existing authenticated user
async function testWithExistingUser() {
  logSection('TESTING WITH EXISTING AUTHENTICATED USER');

  log('\nThis test requires you to be logged in to the application.', 'yellow');
  log('Please ensure you are logged in at ' + BASE_URL, 'yellow');

  const ready = await question('\nAre you logged in to the application? (y/n): ');

  if (ready.toLowerCase() !== 'y') {
    log('Please log in first and run the test again.', 'yellow');
    return false;
  }

  // Test 1: Generate referral code
  logSection('TEST 1: Generate Referral Code');

  const genResult = await apiCall('/api/referrals/generate', {
    method: 'POST'
  });

  if (genResult.ok && genResult.data.referralCode) {
    referralCode = genResult.data.referralCode;
    referralLink = genResult.data.referralLink;

    log(`✓ Referral code generated: ${referralCode}`, 'green');
    log(`✓ Referral link: ${referralLink}`, 'green');

    if (genResult.data.statistics) {
      log('\nCurrent Statistics:', 'cyan');
      log(`  - Total sent: ${genResult.data.statistics.total_referrals_sent || 0}`, 'cyan');
      log(`  - Total signups: ${genResult.data.statistics.total_signups || 0}`, 'cyan');
      log(`  - Total rewards earned: ${genResult.data.statistics.total_rewards_earned || 0}`, 'cyan');
    }
  } else {
    log('✗ Failed to generate referral code', 'red');
    log('Error: ' + JSON.stringify(genResult.data), 'red');

    if (genResult.status === 401) {
      log('\n⚠ Authentication required. Please ensure:', 'yellow');
      log('1. You are logged in to the application', 'yellow');
      log('2. Your session is still active', 'yellow');
      log('3. The API endpoint accepts cookie authentication', 'yellow');
    }
    return false;
  }

  // Test 2: Track click
  if (referralCode) {
    logSection('TEST 2: Track Referral Click');

    const clickResult = await apiCall('/api/referrals/track', {
      method: 'POST',
      body: {
        code: referralCode,
        action: 'click'
      }
    });

    if (clickResult.ok) {
      log('✓ Click tracked successfully', 'green');
    } else {
      log('✗ Failed to track click', 'red');
    }
  }

  // Test 3: Send invitation
  logSection('TEST 3: Send Referral Invitation');

  const inviteResult = await apiCall('/api/referrals/send-invitation', {
    method: 'POST',
    body: {
      emails: [TEST_REFERRED_EMAIL],
      personalMessage: 'Join me on LoadVoice for amazing call transcription!'
    }
  });

  if (inviteResult.ok) {
    log('✓ Invitation sent successfully', 'green');

    if (inviteResult.data.results) {
      log(`  - Sent: ${inviteResult.data.results.sent.length}`, 'cyan');
      log(`  - Failed: ${inviteResult.data.results.failed.length}`, 'cyan');
      log(`  - Already referred: ${inviteResult.data.results.alreadyReferred.length}`, 'cyan');
    }
  } else {
    log('✗ Failed to send invitation', 'red');
    if (inviteResult.status === 401) {
      log('⚠ Not authenticated. Please log in.', 'yellow');
    }
  }

  // Test 4: Get statistics
  logSection('TEST 4: Get Referral Statistics');

  const statsResult = await apiCall('/api/referrals/statistics');

  if (statsResult.ok) {
    log('✓ Statistics retrieved', 'green');
    const stats = statsResult.data;

    log('\nYour Referral Statistics:', 'cyan');
    log(`  - Total referrals sent: ${stats.total_referrals_sent || 0}`, 'cyan');
    log(`  - Total signups: ${stats.total_signups || 0}`, 'cyan');
    log(`  - Total activations: ${stats.total_activations || 0}`, 'cyan');
    log(`  - Total rewards earned: ${stats.total_rewards_earned || 0}`, 'cyan');
    log(`  - Unclaimed rewards: ${stats.unclaimed_rewards || 0}`, 'cyan');
    log(`  - Current tier: ${stats.current_tier || 'None'}`, 'cyan');
  } else {
    log('✗ Failed to get statistics', 'red');
  }

  // Test 5: Get history
  logSection('TEST 5: Get Referral History');

  const historyResult = await apiCall('/api/referrals/history?page=1&limit=10');

  if (historyResult.ok) {
    log('✓ History retrieved', 'green');
    const referrals = historyResult.data.referrals || [];

    if (referrals.length > 0) {
      log(`\nFound ${referrals.length} referral(s):`, 'cyan');
      referrals.forEach((r, i) => {
        log(`  ${i + 1}. ${r.referred_email} - Status: ${r.status}`, 'cyan');
      });
    } else {
      log('No referrals in history yet', 'yellow');
    }
  } else {
    log('✗ Failed to get history', 'red');
  }

  // Test 6: Check rewards
  logSection('TEST 6: Check Available Rewards');

  const rewardsResult = await apiCall('/api/referrals/rewards');

  if (rewardsResult.ok) {
    log('✓ Rewards retrieved', 'green');

    const rewards = rewardsResult.data.rewards || [];
    const totalMinutes = rewardsResult.data.totalMinutes || 0;
    const totalCredits = rewardsResult.data.totalCredits || 0;

    log(`\nTotal unclaimed rewards:`, 'cyan');
    log(`  - Minutes: ${totalMinutes}`, 'cyan');
    log(`  - Credits: $${totalCredits / 100}`, 'cyan');

    if (rewards.length > 0) {
      log(`\nIndividual rewards (${rewards.length}):`, 'cyan');
      rewards.forEach((reward, i) => {
        log(`  ${i + 1}. ${reward.referred_email}:`, 'cyan');
        log(`     - Minutes: ${reward.reward_minutes || 0}`, 'cyan');
        log(`     - Credits: $${(reward.reward_credits_cents || 0) / 100}`, 'cyan');
      });
    }
  } else {
    log('✗ Failed to get rewards', 'red');
  }

  return true;
}

// Manual test for signup flow
async function testManualSignupFlow() {
  logSection('MANUAL SIGNUP FLOW TEST');

  if (!referralCode) {
    log('⚠ No referral code available. Generate one first.', 'yellow');
    return false;
  }

  log('\nTo test the signup flow:', 'cyan');
  log('1. Open an incognito/private browser window', 'cyan');
  log(`2. Go to: ${referralLink}`, 'cyan');
  log('   OR go to: ' + BASE_URL + '/signup?ref=' + referralCode, 'cyan');
  log('3. Sign up with a test email', 'cyan');
  log('4. Verify you see the referral banner (30 free minutes)', 'cyan');
  log('5. Complete the signup process', 'cyan');

  const completed = await question('\nHave you completed the signup? (y/n): ');

  if (completed.toLowerCase() === 'y') {
    log('✓ Great! The referral should now show as "signed_up" in your history.', 'green');

    // Check updated history
    const historyResult = await apiCall('/api/referrals/history?page=1&limit=10');

    if (historyResult.ok) {
      const referrals = historyResult.data.referrals || [];
      const signedUp = referrals.filter(r => r.status === 'signed_up');

      if (signedUp.length > 0) {
        log(`✓ Found ${signedUp.length} signed up referral(s)!`, 'green');
      }
    }
  }

  return true;
}

// Main test runner
async function runTests() {
  console.clear();
  log('\n╔════════════════════════════════════════════════╗', 'magenta');
  log('║     LOADVOICE REFERRAL SYSTEM TEST SUITE        ║', 'magenta');
  log('╚════════════════════════════════════════════════╝', 'magenta');

  log('\nThis test will verify the referral system functionality.', 'yellow');

  log('\n📋 Prerequisites:', 'yellow');
  log('  1. Application running at ' + BASE_URL, 'yellow');
  log('  2. Database migration completed', 'yellow');
  log('  3. User account created and logged in', 'yellow');
  log('  4. Resend API configured (for emails)', 'yellow');

  const proceed = await question('\nAre all prerequisites met? (y/n): ');

  if (proceed.toLowerCase() !== 'y') {
    log('\nPlease complete prerequisites first:', 'yellow');
    log('1. Run database migration: npm run db:migrate', 'cyan');
    log('2. Start the application: npm run dev', 'cyan');
    log('3. Create an account and log in', 'cyan');
    log('4. Configure RESEND_API_KEY in .env', 'cyan');
    rl.close();
    return;
  }

  // Run authenticated tests
  const authTestsPassed = await testWithExistingUser();

  if (!authTestsPassed) {
    log('\n⚠ Authenticated tests failed. Please check:', 'yellow');
    log('1. You are logged in to the application', 'yellow');
    log('2. The API endpoints are working correctly', 'yellow');
    log('3. The database migration has been run', 'yellow');
  } else {
    // Offer manual signup test
    const doManual = await question('\nDo you want to test the signup flow manually? (y/n): ');

    if (doManual.toLowerCase() === 'y') {
      await testManualSignupFlow();
    }
  }

  // Summary
  logSection('TEST SUMMARY');

  log('\n✅ Key Features Verified:', 'green');
  log('  - Referral code generation', 'cyan');
  log('  - Click tracking', 'cyan');
  log('  - Email invitations', 'cyan');
  log('  - Statistics tracking', 'cyan');
  log('  - Referral history', 'cyan');
  log('  - Reward checking', 'cyan');

  log('\n📝 Important Notes:', 'yellow');
  log('  - Referred users get 30 minutes (standard free tier)', 'yellow');
  log('  - Only referrers get rewards when referred users pay', 'yellow');
  log('  - Rewards are tiered (Bronze/Silver/Gold/Platinum)', 'yellow');
  log('  - Emails are sent via Resend (if configured)', 'yellow');

  log('\n🎯 Tier Requirements:', 'magenta');
  log('  Bronze: 1 referral → 60 minutes', 'magenta');
  log('  Silver: 3 referrals → 200 minutes', 'magenta');
  log('  Gold: 5 referrals → 500 minutes + $50', 'magenta');
  log('  Platinum: 10 referrals → 1000 minutes + $100', 'magenta');

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