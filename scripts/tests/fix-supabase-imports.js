const fs = require('fs');
const path = require('path');

// Files with wrong Supabase imports
const filesToFix = [
  'app/onboarding/page.tsx',
  'app/api/agents/monitoring/route.ts',
  'app/api/billing/summary/route.ts',
  'app/api/subscription/upgrade/route.ts',
  'app/billing/page.tsx',
  'app/api/subscription/create-checkout/route.ts',
  'app/api/performance/metrics/route.ts',
  'app/api/loads/route.ts',
  'app/api/loads/[id]/rate-con/route.ts',
  'app/api/extraction/save-to-load/route.ts',
  'app/(dashboard)/dashboard/loadvoice-page.tsx',
  'app/api/extraction/save-to-crm/route.ts'
];

filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Replace old auth-helpers-nextjs import with supabase-js
    if (content.includes("from '@supabase/auth-helpers-nextjs'")) {
      // For API routes, use createClient from supabase-js
      if (file.includes('/api/')) {
        content = content.replace(
          /import\s*{\s*createRouteHandlerClient\s*}\s*from\s*'@supabase\/auth-helpers-nextjs';?/g,
          "import { createClient } from '@supabase/supabase-js';"
        );

        // Replace createRouteHandlerClient usage with createClient
        content = content.replace(
          /const\s+supabase\s*=\s*createRouteHandlerClient\(\s*{\s*cookies\s*}\s*\);?/g,
          `const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );`
        );

        // Remove cookies imports if not used elsewhere
        if (!content.includes('cookies') || content.match(/cookies/g).length <= 2) {
          content = content.replace(/import\s*{\s*cookies\s*}\s*from\s*'next\/headers';?\n?/g, '');
        }

        modified = true;
      }
      // For client components, use createBrowserClient from ssr
      else {
        content = content.replace(
          /import\s*{\s*createClientComponentClient\s*}\s*from\s*'@supabase\/auth-helpers-nextjs';?/g,
          "import { createBrowserClient } from '@supabase/ssr';"
        );

        content = content.replace(
          /const\s+supabase\s*=\s*createClientComponentClient\(\);?/g,
          `const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );`
        );

        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Fixed Supabase imports in ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});

console.log('Supabase import fixes complete');