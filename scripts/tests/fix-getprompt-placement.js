const fs = require('fs');
const path = require('path');

// Files that had getPrompt incorrectly added
const filesToFix = [
  'rate-negotiation-agent.ts',
  'reference-resolution-agent.ts',
  'summary-agent.ts',
  'temporal-resolution-agent.ts',
  'validation-agent.ts'
];

const agentsDir = path.join(__dirname, 'lib', 'agents', 'implementations');

filesToFix.forEach(file => {
  const filePath = path.join(agentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove incorrectly placed getPrompt method (likely in an interface)
  const incorrectPattern = /}\s*getPrompt\(context: AgentContextData\): string {\s*\/\/ Default implementation.*?\s*return this\.buildPrompt \? this\.buildPrompt\(context\) : '';\s*};?\s*}/gs;

  if (content.match(incorrectPattern)) {
    console.log(`Removing incorrect getPrompt from: ${file}`);
    content = content.replace(incorrectPattern, '}');
  }

  // Check if the file has a class that extends BaseAgent and doesn't have getPrompt
  const classMatch = content.match(/export class (\w+) extends BaseAgent/);
  if (classMatch && !content.includes('getPrompt(context: AgentContextData): string {')) {
    const className = classMatch[1];
    console.log(`Adding getPrompt to ${className} in ${file}`);

    // Find constructor end and add getPrompt method after it
    const constructorEndPattern = /constructor\(\) {\s*super\([^)]*\);\s*}/;

    if (content.match(constructorEndPattern)) {
      // Find what prompt builder method this class uses
      let promptMethod = 'buildPrompt';

      // Look for specific prompt builder methods
      if (content.includes('buildNegotiationPrompt')) {
        promptMethod = 'buildNegotiationPrompt';
      } else if (content.includes('buildReferencePrompt')) {
        promptMethod = 'buildReferencePrompt';
      } else if (content.includes('buildSummaryPrompt')) {
        promptMethod = 'buildSummaryPrompt';
      } else if (content.includes('buildTemporalPrompt')) {
        promptMethod = 'buildTemporalPrompt';
      } else if (content.includes('buildValidationPrompt')) {
        promptMethod = 'buildValidationPrompt';
      }

      // Check what parameters the prompt method needs
      let getPromptImpl = '';
      if (file === 'rate-negotiation-agent.ts') {
        getPromptImpl = `
  getPrompt(context: AgentContextData): string {
    const classification = context.getAgentOutput<any>('classification');
    const loads = context.getAgentOutput<any>('load_extraction');
    return this.buildNegotiationPrompt(context, classification, loads);
  }`;
      } else if (file === 'reference-resolution-agent.ts') {
        getPromptImpl = `
  getPrompt(context: AgentContextData): string {
    const entities = context.getAgentOutput<any>('entity_extraction');
    return this.buildReferencePrompt(context, entities);
  }`;
      } else if (file === 'summary-agent.ts') {
        getPromptImpl = `
  getPrompt(context: AgentContextData): string {
    return this.buildSummaryPrompt(context);
  }`;
      } else if (file === 'temporal-resolution-agent.ts') {
        getPromptImpl = `
  getPrompt(context: AgentContextData): string {
    const classification = context.getAgentOutput<any>('classification');
    return this.buildTemporalPrompt(context, classification);
  }`;
      } else if (file === 'validation-agent.ts') {
        getPromptImpl = `
  getPrompt(context: AgentContextData): string {
    const allOutputs = this.getAllAgentOutputs(context);
    return this.buildValidationPrompt(context, allOutputs);
  }`;
      }

      content = content.replace(constructorEndPattern, (match) => {
        return match + getPromptImpl;
      });

      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${file}`);
    }
  }
});

console.log('Done fixing getPrompt placements');