#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to fix
const filesToFix = [
  'app/api/carriers/route-optimized.ts',
  'app/api/carriers/route.ts',
  'app/api/carriers/nl-search/route.ts',
  'app/api/carriers/lane-search/route.ts',
  'app/api/carriers/[id]/route.ts',
  'app/api/carriers/search-by-lane/route.ts',
  'app/api/carriers/[id]/interactions/route.ts'
];

let totalFixed = 0;

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;

    // Remove cookies import if it exists
    content = content.replace(/import { cookies } from 'next\/headers';\n?/g, '');

    // Replace createClient(cookies()) with createClient()
    content = content.replace(/createClient\(cookies\(\)\)/g, 'createClient()');

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✓ Fixed: ${filePath}`);
      totalFixed++;
    } else {
      console.log(`  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n✅ Fixed ${totalFixed} files`);