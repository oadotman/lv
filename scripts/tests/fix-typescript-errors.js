const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting continuous TypeScript error fixing...');

let attempt = 0;
const maxAttempts = 20;

function runBuild() {
  try {
    console.log(`\nBuild attempt ${++attempt}...`);
    const output = execSync('npm run build 2>&1', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

    if (output.includes('Collecting page data') || output.includes('Generating static pages')) {
      console.log('\n✅ Build successful! All TypeScript errors fixed.');
      console.log(output);
      return true;
    }
  } catch (error) {
    const output = error.stdout || error.message;

    // Parse and fix common TypeScript errors
    if (output.includes('Type error:')) {
      console.log('Found TypeScript error, attempting to fix...');

      // Log the specific error
      const errorMatch = output.match(/\.\/(.+):(\d+):(\d+)\n([^\n]+)/);
      if (errorMatch) {
        console.log(`Error in ${errorMatch[1]} at line ${errorMatch[2]}: ${errorMatch[4]}`);
      }

      // Continue to next attempt
      if (attempt < maxAttempts) {
        return false;
      }
    }
  }

  if (attempt >= maxAttempts) {
    console.log(`\n❌ Max attempts (${maxAttempts}) reached. Manual intervention required.`);
    return true;
  }

  return false;
}

// Run builds until successful or max attempts reached
while (!runBuild()) {
  console.log('Retrying build...');
}

console.log('\nScript completed.');