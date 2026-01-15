const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color mappings from purple/violet to blue
const colorMappings = {
  // Violet to blue mappings
  'violet-50': 'blue-50',
  'violet-100': 'blue-100',
  'violet-200': 'blue-200',
  'violet-300': 'blue-300',
  'violet-400': 'blue-400',
  'violet-500': 'blue-500',
  'violet-600': 'blue-600',
  'violet-700': 'blue-700',
  'violet-800': 'blue-800',
  'violet-900': 'blue-900',
  'violet-950': 'blue-950',

  // Purple to sky/cyan mappings for gradients
  'purple-50': 'sky-50',
  'purple-100': 'sky-100',
  'purple-200': 'sky-200',
  'purple-300': 'sky-300',
  'purple-400': 'sky-400',
  'purple-500': 'sky-500',
  'purple-600': 'sky-600',
  'purple-700': 'sky-700',
  'purple-800': 'sky-800',
  'purple-900': 'sky-900',
  'purple-950': 'sky-950',
};

function replaceColors(content) {
  let modified = content;

  // Replace each color mapping
  Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
    const regex = new RegExp(oldColor.replace('-', '\\-'), 'g');
    modified = modified.replace(regex, newColor);
  });

  return modified;
}

// Find all TSX and TS files
const files = glob.sync('**/*.{tsx,ts,css}', {
  ignore: ['node_modules/**', '.next/**', 'scripts/**']
});

let totalReplacements = 0;

files.forEach(file => {
  const filePath = path.resolve(file);
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = replaceColors(content);

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    const replacements = (content.match(/violet|purple/gi) || []).length;
    totalReplacements += replacements;
    console.log(`✓ Updated ${file} (${replacements} replacements)`);
  }
});

console.log(`\n✨ Color replacement complete!`);
console.log(`Total files updated: ${files.filter(f => {
  const content = fs.readFileSync(path.resolve(f), 'utf8');
  return content.includes('blue') || content.includes('sky');
}).length}`);
console.log(`Total replacements made: ${totalReplacements}`);