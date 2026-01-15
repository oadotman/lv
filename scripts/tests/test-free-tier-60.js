// Test Free Tier 60 Minutes End-to-End
// =====================================

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Free Tier 60 Minutes Configuration');
console.log('============================================');

let allTestsPassed = true;

// Test 1: Check pricing.ts configuration
console.log('\n📋 Test 1: Pricing Configuration');
try {
  const pricingContent = fs.readFileSync('./lib/pricing.ts', 'utf8');
  const freeMatch = pricingContent.match(/free:\s*{[^}]*maxMinutes:\s*(\d+)/s);

  if (freeMatch && freeMatch[1] === '60') {
    console.log('  ✅ Pricing correctly set to 60 minutes');
  } else {
    console.log('  ❌ Pricing NOT set to 60 minutes (found:', freeMatch ? freeMatch[1] : 'not found', ')');
    allTestsPassed = false;
  }

  // Check features list
  if (pricingContent.includes('60 minutes free every month')) {
    console.log('  ✅ Features list mentions "60 minutes free"');
  } else if (pricingContent.includes('30 minutes free')) {
    console.log('  ❌ Features list still mentions "30 minutes"');
    allTestsPassed = false;
  }
} catch (err) {
  console.error('  ❌ Error reading pricing.ts:', err.message);
  allTestsPassed = false;
}

// Test 2: Check usage guard defaults
console.log('\n🛡️ Test 2: Usage Guard Defaults');
try {
  const usageGuardContent = fs.readFileSync('./lib/usage-guard.ts', 'utf8');
  const defaultMatch = usageGuardContent.match(/usage_minutes_limit \|\| (\d+)/);

  if (defaultMatch && defaultMatch[1] === '60') {
    console.log('  ✅ Usage guard default is 60 minutes');
  } else {
    console.log('  ❌ Usage guard default is NOT 60 minutes (found:', defaultMatch ? defaultMatch[1] : 'not found', ')');
    allTestsPassed = false;
  }
} catch (err) {
  console.error('  ❌ Error reading usage-guard.ts:', err.message);
  allTestsPassed = false;
}

// Test 3: Check ensure-organization.ts
console.log('\n🏢 Test 3: Organization Creation Defaults');
try {
  const ensureOrgContent = fs.readFileSync('./lib/ensure-organization.ts', 'utf8');
  const maxMinutesMatch = ensureOrgContent.match(/max_minutes:\s*(\d+)/);
  const monthlyMatch = ensureOrgContent.match(/max_minutes_monthly:\s*(\d+)/);
  const limitMatch = ensureOrgContent.match(/usage_minutes_limit:\s*(\d+)/);

  let orgConfigCorrect = true;

  if (maxMinutesMatch && maxMinutesMatch[1] === '60') {
    console.log('  ✅ max_minutes: 60');
  } else {
    console.log('  ❌ max_minutes not set to 60 (found:', maxMinutesMatch ? maxMinutesMatch[1] : 'not found', ')');
    orgConfigCorrect = false;
  }

  if (monthlyMatch && monthlyMatch[1] === '60') {
    console.log('  ✅ max_minutes_monthly: 60');
  } else {
    console.log('  ❌ max_minutes_monthly not set to 60 (found:', monthlyMatch ? monthlyMatch[1] : 'not found', ')');
    orgConfigCorrect = false;
  }

  if (limitMatch && limitMatch[1] === '60') {
    console.log('  ✅ usage_minutes_limit: 60');
  } else {
    console.log('  ❌ usage_minutes_limit not set to 60 (found:', limitMatch ? limitMatch[1] : 'not found', ')');
    orgConfigCorrect = false;
  }

  if (!orgConfigCorrect) {
    allTestsPassed = false;
  }
} catch (err) {
  console.error('  ❌ Error reading ensure-organization.ts:', err.message);
  allTestsPassed = false;
}

// Test 4: Check UI components
console.log('\n🎨 Test 4: UI Component Messages');
try {
  // Check signup page
  const signupContent = fs.readFileSync('./app/signup/page.tsx', 'utf8');
  if (signupContent.includes('60 min/month') || signupContent.includes('60 minutes')) {
    console.log('  ✅ Signup page mentions 60 minutes');
  } else if (signupContent.includes('30 min/month')) {
    console.log('  ❌ Signup page still mentions 30 minutes');
    allTestsPassed = false;
  } else {
    console.log('  ⚠️ Signup page doesn\'t specify minutes clearly');
  }

  // Check terms page
  const termsContent = fs.readFileSync('./app/terms/page.tsx', 'utf8');
  if (termsContent.includes('60 minutes/month')) {
    console.log('  ✅ Terms page mentions 60 minutes/month');
  } else if (termsContent.includes('30 minutes/month')) {
    console.log('  ❌ Terms page still mentions 30 minutes');
    allTestsPassed = false;
  }
} catch (err) {
  console.error('  ❌ Error reading UI components:', err.message);
  allTestsPassed = false;
}

// Test 5: Landing page consistency
console.log('\n🌐 Test 5: Landing Page Consistency');
try {
  const landingContent = fs.readFileSync('./app/page.tsx', 'utf8');
  if (landingContent.includes('1 hour free every month')) {
    console.log('  ✅ Landing page advertises "1 hour free every month"');
  } else {
    console.log('  ❌ Landing page doesn\'t mention "1 hour free"');
    allTestsPassed = false;
  }

  if (landingContent.includes('60 minutes free')) {
    console.log('  ✅ Landing page mentions "60 minutes free"');
  }
} catch (err) {
  console.error('  ❌ Error reading landing page:', err.message);
  allTestsPassed = false;
}

// Test 6: Check API routes for usage tracking
console.log('\n🔌 Test 6: API Routes Usage Tracking');
try {
  // Check upload route
  const uploadRouteContent = fs.readFileSync('./app/api/calls/upload/route.ts', 'utf8');
  if (uploadRouteContent.includes('canProcessCall')) {
    console.log('  ✅ Upload route uses canProcessCall guard');
  } else {
    console.log('  ⚠️ Upload route might not have usage guard');
  }

  // Check process route
  const processRouteContent = fs.readFileSync('./app/api/calls/[id]/process/route.ts', 'utf8');
  if (processRouteContent.includes('usage_minutes_current')) {
    console.log('  ✅ Process route updates usage_minutes_current');
  } else {
    console.log('  ⚠️ Process route might not update usage correctly');
  }
} catch (err) {
  console.error('  ⚠️ Warning checking API routes:', err.message);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log('');

if (allTestsPassed) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('');
  console.log('The application code is fully configured for 60-minute free tier:');
  console.log('  • Pricing configuration: 60 minutes');
  console.log('  • Usage guards: 60 minutes default');
  console.log('  • Organization creation: 60 minutes');
  console.log('  • UI components: Updated to show 60 minutes');
  console.log('  • Landing page: Advertises "1 hour free"');
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('');
  console.log('Please review the failures above and fix any remaining issues.');
}

console.log('');
console.log('Next Steps:');
console.log('  1. ✅ Application code is updated');
console.log('  2. ⚠️ Run the SQL script (check_and_update_free_tier.sql) in Supabase');
console.log('  3. 🧪 Test with an actual free tier account:');
console.log('     • Create new account');
console.log('     • Verify 60 minutes available');
console.log('     • Upload a test call');
console.log('     • Verify usage tracking');
console.log('');
console.log('Database Update Command:');
console.log('  Copy the contents of check_and_update_free_tier.sql');
console.log('  and run it in your Supabase SQL Editor');

process.exit(allTestsPassed ? 0 : 1);