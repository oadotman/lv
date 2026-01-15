/**
 * Script to create a placeholder Open Graph image
 * This creates a simple branded OG image for social sharing
 * For production, replace with a professionally designed image
 */

const fs = require('fs');
const path = require('path');

// Create a simple SVG as a placeholder OG image
const ogImageSVG = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#581c87;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Logo/Brand -->
  <text x="600" y="200" font-family="Arial, sans-serif" font-size="72" font-weight="bold" text-anchor="middle" fill="white">
    LoadVoice
  </text>

  <!-- Tagline -->
  <text x="600" y="280" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="white" opacity="0.9">
    Voice-Powered CRM for Freight Brokers
  </text>

  <!-- Features -->
  <text x="600" y="380" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white" opacity="0.8">
    Automatically capture load details from every call
  </text>

  <!-- Call to action -->
  <rect x="450" y="450" width="300" height="60" rx="30" fill="white" opacity="0.9"/>
  <text x="600" y="490" font-family="Arial, sans-serif" font-size="24" font-weight="600" text-anchor="middle" fill="#7c3aed">
    Get Started Free
  </text>
</svg>`;

// Create a simple logo SVG if it doesn't exist
const logoSVG = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="20" fill="url(#logoGrad)"/>
  <text x="100" y="110" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">
    LV
  </text>
</svg>`;

// Save the OG image SVG as a placeholder
fs.writeFileSync(path.join(__dirname, '../public/og-image.svg'), ogImageSVG);
fs.writeFileSync(path.join(__dirname, '../public/logo.svg'), logoSVG);

console.log('✅ Created placeholder OG image at public/og-image.svg');
console.log('✅ Created placeholder logo at public/logo.svg');
console.log('\n⚠️  Note: For production, convert these to optimized PNG/WebP images:');
console.log('   - OG Image should be 1200x630px PNG');
console.log('   - Logo should be square, minimum 512x512px');