const fs = require('fs');
const path = require('path');

// Fix all Paddle SDK property names to camelCase
const files = [
  'lib/paddle-config.ts',
  'lib/paddle-loadvoice.ts',
  'lib/overage-billing.ts'
];

const replacements = [
  // Common Paddle property replacements
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
  { from: /billing_address_collection:/g, to: 'billingAddressCollection:' }
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
  }
});

console.log('Paddle camelCase fixes complete!');