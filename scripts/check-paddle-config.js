#!/usr/bin/env node

/**
 * Paddle Configuration Checker
 * Run this script to verify your Paddle setup
 */

require('dotenv').config({ path: '.env.local' });

console.log('========================================');
console.log('PADDLE CONFIGURATION CHECK');
console.log('========================================\n');

// Check vendor ID
const vendorId = process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID;
console.log('1. VENDOR ID:');
if (vendorId) {
  console.log(`   ✓ Vendor ID is set: ${vendorId}`);
  if (vendorId.includes('sandbox')) {
    console.log('   ⚠️  WARNING: This appears to be a SANDBOX vendor ID');
  } else {
    console.log('   ✓ This appears to be a PRODUCTION vendor ID');
  }
} else {
  console.log('   ✗ NEXT_PUBLIC_PADDLE_VENDOR_ID is not set!');
}

console.log('\n2. PRICE IDs:');

// List of required price IDs
const priceIds = {
  'SOLO_MONTHLY': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO_MONTHLY,
  'STARTER_MONTHLY': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_MONTHLY,
  'PROFESSIONAL_MONTHLY': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL_MONTHLY,
  'ENTERPRISE_MONTHLY': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE_MONTHLY,
  'SOLO_ANNUAL': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SOLO_ANNUAL,
  'STARTER_ANNUAL': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER_ANNUAL,
  'PROFESSIONAL_ANNUAL': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PROFESSIONAL_ANNUAL,
  'ENTERPRISE_ANNUAL': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ENTERPRISE_ANNUAL,
  'OVERAGE_500': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_500,
  'OVERAGE_1000': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_1000,
  'OVERAGE_2500': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_2500,
  'OVERAGE_5000': process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_OVERAGE_5000,
};

let missingCount = 0;
let foundCount = 0;

for (const [name, value] of Object.entries(priceIds)) {
  const envKey = `NEXT_PUBLIC_PADDLE_PRICE_ID_${name}`;
  if (value) {
    console.log(`   ✓ ${envKey}: ${value}`);
    foundCount++;

    // Check if it looks like a valid price ID
    if (!value.startsWith('pri_')) {
      console.log(`     ⚠️  WARNING: This doesn't look like a valid Paddle price ID (should start with 'pri_')`);
    }
    if (value.includes('sandbox')) {
      console.log(`     ⚠️  WARNING: This appears to be a SANDBOX price ID`);
    }
  } else {
    console.log(`   ✗ ${envKey}: NOT SET`);
    missingCount++;
  }
}

console.log(`\n   Summary: ${foundCount} configured, ${missingCount} missing`);

// Check server-side keys
console.log('\n3. SERVER-SIDE KEYS:');

const apiKey = process.env.PADDLE_API_KEY;
const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

if (apiKey) {
  console.log(`   ✓ PADDLE_API_KEY is set (${apiKey.substring(0, 10)}...)`);
} else {
  console.log('   ✗ PADDLE_API_KEY is not set!');
}

if (webhookSecret) {
  console.log(`   ✓ PADDLE_WEBHOOK_SECRET is set (${webhookSecret.substring(0, 10)}...)`);
} else {
  console.log('   ✗ PADDLE_WEBHOOK_SECRET is not set!');
}

// Check environment
console.log('\n4. ENVIRONMENT:');
const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'production';
console.log(`   Environment: ${environment}`);
if (environment === 'sandbox' && vendorId && !vendorId.includes('sandbox')) {
  console.log('   ⚠️  WARNING: Environment is sandbox but vendor ID appears to be production');
}
if (environment === 'production' && vendorId && vendorId.includes('sandbox')) {
  console.log('   ⚠️  WARNING: Environment is production but vendor ID appears to be sandbox');
}

// Recommendations
console.log('\n========================================');
console.log('RECOMMENDATIONS:');
console.log('========================================');

if (missingCount > 0) {
  console.log('\n⚠️  You have missing price IDs. To fix this:');
  console.log('1. Log into your Paddle dashboard');
  console.log('2. Go to Catalog → Prices');
  console.log('3. Create/find prices for each plan');
  console.log('4. Copy the price IDs (they start with "pri_")');
  console.log('5. Add them to your .env.local file');
  console.log('6. Run "npm run build" and restart your application');
}

if (!apiKey || !webhookSecret) {
  console.log('\n⚠️  You have missing server-side keys. To fix this:');
  console.log('1. Log into your Paddle dashboard');
  console.log('2. Go to Developer → Authentication');
  console.log('3. Generate an API key');
  console.log('4. Go to Developer → Notifications → Webhooks');
  console.log('5. Get your webhook signing secret');
  console.log('6. Add them to your .env.local file');
}

if (foundCount === 12 && apiKey && webhookSecret) {
  console.log('\n✅ All configuration appears to be set!');
  console.log('If you\'re still getting 403 errors, verify that:');
  console.log('1. The price IDs match your vendor account');
  console.log('2. The prices are activated/published in Paddle');
  console.log('3. You\'re using production price IDs with production vendor ID');
}

console.log('\n========================================');
console.log('Current working price ID being tested:');
console.log('pri_01kbd7wgeb2q3h7f9acqgn31f5');
console.log('\nThis price ID is returning 403, which means:');
console.log('- It doesn\'t exist in your Paddle account');
console.log('- OR it\'s not associated with vendor ID:', vendorId);
console.log('- OR it\'s not activated/published');
console.log('========================================\n');