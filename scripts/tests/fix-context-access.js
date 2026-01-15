const fs = require('fs');
const path = require('path');

// Directory containing agent implementations
const agentsDir = path.join(__dirname, 'lib', 'agents', 'implementations');

// Read all TypeScript files in the directory
const files = fs.readdirSync(agentsDir).filter(file => file.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(agentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix direct access to context.classification
  if (content.includes('context.classification')) {
    console.log(`Fixing context.classification in: ${file}`);

    // Check if classification is already retrieved
    const hasClassificationVar = content.includes('const classification = context.getAgentOutput');

    if (!hasClassificationVar) {
      // Need to add the variable at the beginning of the method
      content = content.replace(
        /(\s+parseResponse\(response: any, context: AgentContextData\)[^{]*{)/g,
        (match) => {
          return match + '\n    const classification = context.getAgentOutput<any>(\'classification\');';
        }
      );
    }

    // Replace direct access with variable or getAgentOutput
    content = content.replace(/context\.classification\??\./g, 'classification?.');
    content = content.replace(/context\.classification/g, 'classification');

    // Special case for inline checks that might not have the variable
    content = content.replace(
      /if \(loads\.length === 0 && classification\?\.primaryType !== 'check_call'\)/g,
      "if (loads.length === 0 && context.getAgentOutput<any>('classification')?.primaryType !== 'check_call')"
    );

    modified = true;
  }

  // Fix direct access to context.negotiation
  if (content.includes('context.negotiation')) {
    console.log(`Fixing context.negotiation in: ${file}`);
    content = content.replace(/context\.negotiation/g, "context.getAgentOutput<any>('rate_negotiation')");
    modified = true;
  }

  // Fix direct access to context.entities
  if (content.includes('context.entities')) {
    console.log(`Fixing context.entities in: ${file}`);
    content = content.replace(/context\.entities/g, "context.getAgentOutput<any>('entity_extraction')");
    modified = true;
  }

  // Fix direct access to context.speakers
  if (content.includes('context.speakers')) {
    console.log(`Fixing context.speakers in: ${file}`);
    content = content.replace(/context\.speakers/g, "context.getAgentOutput<any>('speaker_identification')");
    modified = true;
  }

  // Fix direct access to context.loads
  if (content.includes('context.loads')) {
    console.log(`Fixing context.loads in: ${file}`);
    content = content.replace(/context\.loads/g, "context.getAgentOutput<any>('load_extraction')");
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});

console.log('Done fixing context access issues');