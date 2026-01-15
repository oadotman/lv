const fs = require('fs');

// Fix onboarding page
let content = fs.readFileSync('app/onboarding/page.tsx', 'utf8');
// Replace smart quotes with regular quotes
content = content.replace(/"/g, '"').replace(/"/g, '"').replace(/'/g, "'").replace(/'/g, "'");
fs.writeFileSync('app/onboarding/page.tsx', content);
console.log('Fixed app/onboarding/page.tsx');