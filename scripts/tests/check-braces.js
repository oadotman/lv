const fs = require('fs');

const content = fs.readFileSync('components/modals/UploadModal.tsx', 'utf8');
const lines = content.split('\n');

let braceStack = [];
let parenStack = [];
let bracketStack = [];
let jsxStack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1];

    if (char === '{') braceStack.push({ line: i + 1, col: j + 1 });
    if (char === '}') {
      if (braceStack.length === 0) {
        console.log(`Unmatched } at line ${i + 1}, col ${j + 1}`);
      } else {
        braceStack.pop();
      }
    }

    if (char === '(') parenStack.push({ line: i + 1, col: j + 1 });
    if (char === ')') {
      if (parenStack.length === 0) {
        console.log(`Unmatched ) at line ${i + 1}, col ${j + 1}`);
      } else {
        parenStack.pop();
      }
    }

    if (char === '[') bracketStack.push({ line: i + 1, col: j + 1 });
    if (char === ']') {
      if (bracketStack.length === 0) {
        console.log(`Unmatched ] at line ${i + 1}, col ${j + 1}`);
      } else {
        bracketStack.pop();
      }
    }

    // Check for JSX tags
    if (char === '<' && nextChar && nextChar !== '=' && nextChar !== ' ') {
      // Check if it's a closing tag
      if (nextChar === '/') {
        if (jsxStack.length === 0) {
          console.log(`Unmatched closing JSX tag at line ${i + 1}, col ${j + 1}`);
        } else {
          jsxStack.pop();
        }
      } else if (line.substring(j, j + 2) !== '<>') {
        // Not a fragment, probably an opening tag
        if (!line.substring(j).match(/^<\w/)) continue;
        jsxStack.push({ line: i + 1, col: j + 1 });
      }
    }

    // Check for JSX fragments
    if (char === '<' && nextChar === '>') {
      jsxStack.push({ line: i + 1, col: j + 1, type: 'fragment' });
      j++; // Skip the next character
    }

    if (char === '<' && nextChar === '/' && line[j + 2] === '>') {
      const last = jsxStack[jsxStack.length - 1];
      if (!last || last.type !== 'fragment') {
        console.log(`Unmatched fragment closing at line ${i + 1}, col ${j + 1}`);
      } else {
        jsxStack.pop();
      }
      j += 2; // Skip the next characters
    }
  }
}

console.log('\n=== Final Stack Status ===');
if (braceStack.length > 0) {
  console.log(`Unclosed braces: ${braceStack.length}`);
  braceStack.slice(0, 5).forEach(b => console.log(`  - Line ${b.line}, col ${b.col}`));
}
if (parenStack.length > 0) {
  console.log(`Unclosed parentheses: ${parenStack.length}`);
  parenStack.slice(0, 5).forEach(p => console.log(`  - Line ${p.line}, col ${p.col}`));
}
if (bracketStack.length > 0) {
  console.log(`Unclosed brackets: ${bracketStack.length}`);
  bracketStack.slice(0, 5).forEach(b => console.log(`  - Line ${b.line}, col ${b.col}`));
}
if (jsxStack.length > 0) {
  console.log(`Unclosed JSX tags: ${jsxStack.length}`);
  jsxStack.slice(0, 5).forEach(j => console.log(`  - Line ${j.line}, col ${j.col}${j.type ? ' (fragment)' : ''}`));
}

if (braceStack.length === 0 && parenStack.length === 0 && bracketStack.length === 0 && jsxStack.length === 0) {
  console.log('All brackets appear to be balanced!');
}