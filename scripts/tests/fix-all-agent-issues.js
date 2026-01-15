const fs = require('fs');
const path = require('path');

// Files that need fixing
const filesToFix = [
  'reference-resolution-agent.ts',
  'temporal-resolution-agent.ts'
];

const agentsDir = path.join(__dirname, 'lib', 'agents', 'implementations');

filesToFix.forEach(file => {
  const filePath = path.join(agentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove incorrectly placed getPrompt with bad syntax
  content = content.replace(/  getPrompt\(context: AgentContextData\): string {\s*\/\/ Default implementation.*?\s*return this\.buildPrompt \? this\.buildPrompt\(context\) : '';\s*}>;/gs, '');

  // Fix the closing of the interface (missing > for Array types)
  content = content.replace(/severity: 'minor' \| 'moderate' \| 'severe';\s*}\s*}/g, "severity: 'minor' | 'moderate' | 'severe';\n  }>\n}");

  // Add getPrompt method to the class if missing
  const classMatch = content.match(/export class (\w+) extends BaseAgent/);
  if (classMatch && !content.includes('getPrompt(context: AgentContextData): string {')) {
    const className = classMatch[1];
    console.log(`Adding getPrompt to ${className} in ${file}`);

    // Find the constructor and add getPrompt after it
    const constructorEndPattern = /constructor\(\) {\s*super\([^)]*\);\s*}/;

    let getPromptImpl = '';
    if (file === 'reference-resolution-agent.ts') {
      // Check if it has buildReferencePrompt
      if (content.includes('buildReferencePrompt')) {
        getPromptImpl = `
  getPrompt(context: AgentContextData): string {
    const entities = context.getAgentOutput<any>('entity_extraction');
    const simpleEntities = context.getAgentOutput<any>('simple_entity_extraction');
    return this.buildReferencePrompt(context, entities || simpleEntities);
  }`;
      }
    } else if (file === 'temporal-resolution-agent.ts') {
      // Check if it has buildTemporalPrompt
      if (content.includes('buildTemporalPrompt')) {
        getPromptImpl = `
  getPrompt(context: AgentContextData): string {
    const classification = context.getAgentOutput<any>('classification');
    return this.buildTemporalPrompt(context, classification);
  }`;
      }
    }

    if (getPromptImpl) {
      content = content.replace(constructorEndPattern, (match) => {
        return match + getPromptImpl;
      });
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${file}`);
});

console.log('Done fixing all agent issues');