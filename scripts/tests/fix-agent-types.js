const fs = require('fs');
const path = require('path');

// Directory containing agent implementations
const agentsDir = path.join(__dirname, 'lib', 'agents', 'implementations');

// Read all TypeScript files in the directory
const files = fs.readdirSync(agentsDir).filter(file => file.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(agentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace getAgentOutput calls without type parameter with typed version
  // Match pattern: context.getAgentOutput('something') where there's no < after getAgentOutput
  content = content.replace(
    /context\.getAgentOutput\((['"`][^'"`]+['"`])\)(?![\s\S]*?<)/g,
    'context.getAgentOutput<any>($1)'
  );

  // Write back the modified content
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed types in: ${file}`);
});

console.log('Done fixing agent type annotations');