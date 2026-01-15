const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Keep running build and fixing errors until successful
let attempt = 0;
const maxAttempts = 20;

async function runBuildAndFix() {
  while (attempt < maxAttempts) {
    attempt++;
    console.log(`\n========== Build Attempt ${attempt} ==========`);

    try {
      // Try to build
      execSync('npm run build', {
        stdio: 'pipe',
        encoding: 'utf8'
      });

      console.log('✅ Build succeeded!');
      return true;

    } catch (error) {
      const output = error.stdout + error.stderr;
      console.log('Build failed, analyzing errors...');

      // Parse the error output
      const errorMatch = output.match(/(.+\.ts):(\d+):(\d+)\s*\n\s*Type error: (.+)/);

      if (!errorMatch) {
        console.log('Could not parse error. Full output:');
        console.log(output.substring(0, 500));
        return false;
      }

      const [, filePath, line, col, errorMsg] = errorMatch;
      console.log(`Error in ${filePath} at line ${line}: ${errorMsg}`);

      // Try to auto-fix common errors
      if (errorMsg.includes("Property 'getAllAgentOutputs' does not exist")) {
        console.log('Fixing getAllAgentOutputs reference...');
        fixGetAllAgentOutputs(filePath);
      } else if (errorMsg.includes("'>' expected") || errorMsg.includes("Property or signature expected")) {
        console.log('Fixing syntax error...');
        // This usually means a missing semicolon or closing brace
        // Manual fix needed
        console.log('Manual fix required for syntax error');
        return false;
      } else if (errorMsg.includes("is missing in type")) {
        console.log('Fixing missing property...');
        // Extract what's missing and add it
        const missingProp = errorMsg.match(/Property '(.+)' is missing/)?.[1];
        if (missingProp) {
          console.log(`Need to add property: ${missingProp}`);
        }
        // Manual fix needed for now
        return false;
      } else {
        console.log('Unknown error type, manual fix needed');
        return false;
      }
    }
  }

  console.log(`Reached maximum attempts (${maxAttempts})`);
  return false;
}

function fixGetAllAgentOutputs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace getAllAgentOutputs with proper implementation
  content = content.replace(
    /const allOutputs = this\.getAllAgentOutputs\(context\);/g,
    `// Get all agent outputs from context
    const allOutputs: Record<string, any> = {};
    // Validation agent runs last, so it can see all other agent outputs
    const agentNames = ['classification', 'speaker_identification', 'load_extraction', 'rate_negotiation', 'conditional_agreement', 'summary', 'temporal_resolution'];
    for (const agentName of agentNames) {
      const output = context.getAgentOutput<any>(agentName);
      if (output) {
        allOutputs[agentName] = output;
      }
    }`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
}

// Run the fixer
runBuildAndFix().then(success => {
  if (success) {
    console.log('\n🎉 All errors fixed, build successful!');
  } else {
    console.log('\n❌ Could not fix all errors automatically');
    console.log('Please review the remaining errors and fix manually');
  }
});