const fs = require('fs');
const path = require('path');

// Fix ALL Paddle SDK property names to camelCase
const files = [
  'lib/paddle-config.ts',
  'lib/paddle-loadvoice.ts',
  'lib/overage-billing.ts'
];

// More comprehensive replacements
const replacements = [
  // In object literals (keys)
  { from: /price_id:/g, to: 'priceId:' },
  { from: /customer_id:/g, to: 'customerId:' },
  { from: /subscription_id:/g, to: 'subscriptionId:' },
  { from: /custom_data:/g, to: 'customData:' },
  { from: /product_id:/g, to: 'productId:' },
  { from: /unit_price:/g, to: 'unitPrice:' },
  { from: /currency_code:/g, to: 'currencyCode:' },
  { from: /return_url:/g, to: 'returnUrl:' },
  { from: /cancel_url:/g, to: 'cancelUrl:' },
  { from: /payment_method_types:/g, to: 'paymentMethodTypes:' },
  { from: /billing_address_collection:/g, to: 'billingAddressCollection:' },
  { from: /effective_from:/g, to: 'effectiveFrom:' },
  { from: /proration_billing_mode:/g, to: 'prorationBillingMode:' },

  // In interfaces and types (when defining types)
  { from: /organization_id:/g, to: 'organization_id:' }, // Keep snake_case for metadata
  { from: /plan_type:/g, to: 'plan_type:' }, // Keep snake_case for metadata
  { from: /billing_cycle:/g, to: 'billing_cycle:' }, // Keep snake_case for metadata
  { from: /included_minutes:/g, to: 'included_minutes:' }, // Keep snake_case for metadata
  { from: /included_users:/g, to: 'included_users:' }, // Keep snake_case for metadata
  { from: /overage_rate:/g, to: 'overage_rate:' }, // Keep snake_case for metadata
  { from: /white_label\?:/g, to: 'white_label?:' }, // Keep snake_case for metadata
  { from: /api_access\?:/g, to: 'api_access?:' }, // Keep snake_case for metadata
  { from: /custom_ai\?:/g, to: 'custom_ai?:' }, // Keep snake_case for metadata
  { from: /priority_support\?:/g, to: 'priority_support?:' }, // Keep snake_case for metadata
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      console.log(`Fixed ${from} -> ${to} in ${file}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`No changes needed in ${file}`);
  }
});

console.log('All Paddle property fixes complete!');