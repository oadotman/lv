const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to process
const files = [
  'components/carriers/NaturalLanguageSearch.tsx',
  'app/api/carriers/nl-search/route.ts',
  'components/carriers/LaneSearchPanel.tsx',
  'app/carriers/[id]/edit/page.tsx',
  'app/carriers/[id]/page.tsx',
  'components/carriers/CarrierProfileNew.tsx',
  'app/api/carriers/route.ts',
  'components/calls/GenerateRateConButton.tsx',
  'app/api/extraction/save-to-load/route.ts',
  'lib/rate-confirmation/pdf-template.tsx',
  'app/api/calls/[id]/generate-rate-confirmation/route.ts',
  'lib/rate-confirmation/workflow-integration.ts',
  'app/api/rate-confirmations/send-email/route.ts',
  'lib/rate-confirmation/generator.ts',
  'app/api/extraction/save-to-crm/route.ts',
  'lib/openai-freight.ts',
  'lib/openai-freight-prompts.ts',
  'lib/openai-freight-negotiation.ts',
  'lib/openai-freight-simplified.ts',
  'app/api/calls/[id]/extract-freight/route.ts',
  'lib/clipboard.ts',
  'lib/openai.ts'
];

const replacements = [
  { from: /dispatcher_name/g, to: 'primary_contact' },
  { from: /dispatcher_phone/g, to: 'dispatch_phone' },
  { from: /dispatcher_email/g, to: 'dispatch_email' }
];

let totalReplacements = 0;

files.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileReplacements = 0;

  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      const count = matches.length;
      content = content.replace(from, to);
      fileReplacements += count;
      console.log(`  Replaced ${count} occurrences of "${from.source}" with "${to}"`);
    }
  });

  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${file} (${fileReplacements} replacements)`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`⏭️  Skipped ${file} (no changes needed)`);
  }
});

console.log(`\n✨ Total replacements made: ${totalReplacements}`);