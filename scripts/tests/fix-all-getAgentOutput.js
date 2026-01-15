const fs = require('fs');
const path = require('path');

// Directory containing agent implementations
const agentsDir = path.join(__dirname, 'lib', 'agents', 'implementations');

// Read all TypeScript files in the directory
const files = fs.readdirSync(agentsDir).filter(file => file.endsWith('.ts'));

let totalFixed = 0;

files.forEach(file => {
  const filePath = path.join(agentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Find all getAgentOutput calls without type annotation
  const regex = /context\.getAgentOutput\(['"]([^'"]+)['"]\)/g;
  let match;
  let replacements = [];

  while ((match = regex.exec(content)) !== null) {
    // Check if it already has a type annotation by looking at the character before the opening paren
    const beforeParen = content.substring(match.index - 5, match.index);
    if (!beforeParen.includes('<')) {
      replacements.push({
        original: match[0],
        replacement: `context.getAgentOutput<any>('${match[1]}')`
      });
    }
  }

  // Apply replacements in reverse order to maintain correct positions
  replacements.reverse().forEach(r => {
    const newContent = content.replace(r.original, r.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      console.log(`Fixed in ${file}: ${r.original} -> ${r.replacement}`);
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed++;
    console.log(`Fixed ${file}`);
  }
});

console.log(`\nTotal files fixed: ${totalFixed}`);