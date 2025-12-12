#!/usr/bin/env node

/**
 * Validate Paddle Price IDs via API
 * This script checks if your price IDs are valid and active
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const vendorId = process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID || '258271';
const apiKey = process.env.PADDLE_API_KEY;

if (!apiKey) {
  console.error('❌ PADDLE_API_KEY not set in .env.local');
  console.error('Cannot validate prices without API key');
  process.exit(1);
}

// Price IDs from your configuration
const priceIds = [
  'pri_01kbd6t7n4pavhtwxk4483eg18', // solo_monthly
  'pri_01kbd7q5kn2wsbvq216a8bw0cf', // starter_monthly
  'pri_01kbd7wgeb2q3h7f9acqgn31f5', // professional_monthly
  'pri_01kbd82knpjar2w6znvm1d86f8', // enterprise_monthly
  'pri_01kbd71e3jnvbe4nfy3epy6w9v', // solo_annual
  'pri_01kbd7rtkf0vtc2g0azv9dgs7c', // starter_annual
  'pri_01kbd7y7kydgw4m88enb9ghzds', // professional_annual
  'pri_01kbd83k8cw4dw6hv9etgt61kb', // enterprise_annual
  'pri_01kbd9fhqpvajt7s08vntc11tc', // overage_500
  'pri_01kbd9gm3ngqtwmqnb6vrfwfe0', // overage_1000
  'pri_01kbd9hqg41ytdydrykg1hc244', // overage_2500
  'pri_01kbd9jrnwr8cbn9zdrwv7t2g1', // overage_5000
];

console.log('========================================');
console.log('VALIDATING PADDLE PRICES');
console.log('========================================');
console.log('Vendor ID:', vendorId);
console.log('API Key:', apiKey.substring(0, 20) + '...');
console.log('');

// Function to check a single price
async function checkPrice(priceId) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.paddle.com',
      path: `/v1/prices/${priceId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (res.statusCode === 200) {
            const price = result.data;
            console.log(`✅ ${priceId}:`);
            console.log(`   Status: ${price.status || 'Unknown'}`);
            console.log(`   Amount: ${price.unit_price?.amount ? price.unit_price.amount / 100 : 'N/A'} ${price.unit_price?.currency_code || ''}`);
            console.log(`   Description: ${price.description || 'No description'}`);

            if (price.status !== 'active') {
              console.log(`   ⚠️  WARNING: Price is not active!`);
            }
          } else if (res.statusCode === 404) {
            console.log(`❌ ${priceId}: NOT FOUND`);
            console.log(`   This price ID does not exist for vendor ${vendorId}`);
          } else if (res.statusCode === 401) {
            console.log(`❌ ${priceId}: UNAUTHORIZED`);
            console.log(`   API key is invalid or doesn't have permission`);
          } else {
            console.log(`❌ ${priceId}: ERROR ${res.statusCode}`);
            if (result.error) {
              console.log(`   ${result.error.message || result.error}`);
            }
          }
        } catch (error) {
          console.log(`❌ ${priceId}: Failed to parse response`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 200)}`);
        }

        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${priceId}: Request failed`);
      console.log(`   ${error.message}`);
      resolve();
    });

    req.end();
  });
}

// Check all prices
async function validateAllPrices() {
  for (const priceId of priceIds) {
    await checkPrice(priceId);
    console.log('');
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('========================================');
  console.log('VALIDATION COMPLETE');
  console.log('========================================');
  console.log('');
  console.log('If prices show as NOT FOUND or have wrong status:');
  console.log('1. Log into Paddle dashboard');
  console.log('2. Go to Catalog → Prices');
  console.log('3. Create new prices for your Synqall product');
  console.log('4. Make sure they are ACTIVE status');
  console.log('5. Update .env.local with the correct price IDs');
}

validateAllPrices();