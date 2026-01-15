const fs = require('fs');
const path = require('path');

// Directory containing agent implementations
const agentsDir = path.join(__dirname, 'lib', 'agents', 'implementations');

// Read all TypeScript files in the directory
const files = fs.readdirSync(agentsDir).filter(file => file.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(agentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if the file has a class that extends BaseAgent
  if (content.includes('extends BaseAgent')) {
    // Check if getPrompt method exists
    if (!content.includes('getPrompt(')) {
      console.log(`Missing getPrompt in: ${file}`);

      // Find the class declaration
      const classMatch = content.match(/export class (\w+) extends BaseAgent/);
      if (classMatch) {
        // Find where to insert (after constructor or at the beginning of class)
        const constructorEnd = content.lastIndexOf('  }', content.indexOf('constructor'));

        if (constructorEnd > 0) {
          // Add the getPrompt method after constructor
          const insertion = `

  getPrompt(context: AgentContextData): string {
    // Default implementation - override as needed
    return this.buildPrompt ? this.buildPrompt(context) : '';
  }`;

          content = content.slice(0, constructorEnd + 3) + insertion + content.slice(constructorEnd + 3);

          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`Added getPrompt to: ${file}`);
        }
      }
    }
  }
});

console.log('Done adding missing getPrompt methods');