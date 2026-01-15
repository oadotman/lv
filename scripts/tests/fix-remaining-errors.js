const fs = require('fs');
const path = require('path');

// Fix the validation-agent.ts type errors
function fixValidationAgent() {
  const filePath = path.join(__dirname, 'lib', 'agents', 'implementations', 'validation-agent.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix the type error at line 715 - add type annotation for check
  content = content.replace(
    /for \(const \[key, check\] of Object\.entries\(consistencyChecks\)\) \{/g,
    'for (const [key, check] of Object.entries(consistencyChecks) as [string, any][]) {'
  );

  // Fix any other similar type issues with unknown types
  content = content.replace(
    /if \(!check\.isConsistent && check\.conflicts\)/g,
    'if (check && !check.isConsistent && check.conflicts)'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed validation-agent.ts type errors');
}

// Run the fixes
try {
  fixValidationAgent();
  console.log('All fixes applied successfully');
} catch (error) {
  console.error('Error applying fixes:', error);
}