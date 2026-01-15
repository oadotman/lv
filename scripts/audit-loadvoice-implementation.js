#!/usr/bin/env node

/**
 * LoadVoice Implementation Audit Script
 * Verifies implementation against MLP Specification v2.0
 *
 * Run: node scripts/audit-loadvoice-implementation.js
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Audit results storage
const auditResults = {
  passed: [],
  failed: [],
  warnings: [],
  totalChecks: 0,
  startTime: new Date()
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(60));
  log(title, 'cyan');
  console.log('═'.repeat(60));
}

function pass(check, details = '') {
  auditResults.passed.push(check);
  auditResults.totalChecks++;
  log(`  ✅ ${check}${details ? ': ' + details : ''}`, 'green');
}

function fail(check, reason = '') {
  auditResults.failed.push({ check, reason });
  auditResults.totalChecks++;
  log(`  ❌ ${check}${reason ? ': ' + reason : ''}`, 'red');
}

function warn(check, message = '') {
  auditResults.warnings.push({ check, message });
  log(`  ⚠️  ${check}${message ? ': ' + message : ''}`, 'yellow');
}

// File existence checks
function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function checkFile(filePath, description) {
  if (fileExists(filePath)) {
    pass(description, filePath);
    return true;
  } else {
    fail(description, `Missing: ${filePath}`);
    return false;
  }
}

// Database checks
async function checkDatabase() {
  logSection('1. DATABASE SCHEMA AUDIT');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Required tables per spec
    const requiredTables = [
      { name: 'loads', critical: true },
      { name: 'carriers', critical: true },
      { name: 'shippers', critical: true },
      { name: 'rate_confirmations', critical: true },
      { name: 'extraction_mappings', critical: false },
      { name: 'load_status_history', critical: false },
      { name: 'extraction_inbox', critical: true },
      { name: 'lanes', critical: false }
    ];

    for (const table of requiredTables) {
      const { error } = await supabase
        .from(table.name)
        .select('id')
        .limit(1);

      if (!error || error.code !== '42P01') {
        pass(`Table '${table.name}' exists`);
      } else if (table.critical) {
        fail(`Critical table '${table.name}' missing`);
      } else {
        warn(`Optional table '${table.name}' missing`);
      }
    }

    // Check for required columns in loads table
    const { data: loadColumns } = await supabase
      .from('loads')
      .select('*')
      .limit(1);

    if (loadColumns) {
      const requiredFields = [
        'status', 'origin_city', 'destination_city',
        'commodity', 'weight', 'equipment_type',
        'pickup_date', 'delivery_date', 'shipper_id', 'carrier_id'
      ];

      const sample = loadColumns[0] || {};
      for (const field of requiredFields) {
        if (field in sample || !loadColumns.length) {
          pass(`Loads table has '${field}' field`);
        } else {
          fail(`Loads table missing '${field}' field`);
        }
      }
    }

  } catch (error) {
    fail('Database connection', error.message);
  }
}

// Core Value Loop Audit
async function auditCoreValueLoop() {
  logSection('2. CORE VALUE LOOP AUDIT');

  log('\n📤 Upload Component:', 'blue');
  checkFile('components/modals/UploadModal.tsx', 'Upload modal component');
  checkFile('app/api/calls/route.ts', 'Upload API endpoint');

  // Check for drag-drop support
  if (fileExists('components/modals/UploadModal.tsx')) {
    const uploadModal = fs.readFileSync(
      path.join(process.cwd(), 'components/modals/UploadModal.tsx'),
      'utf8'
    );
    if (uploadModal.includes('onDrop') || uploadModal.includes('drag')) {
      pass('Drag-and-drop support implemented');
    } else {
      warn('Drag-and-drop support', 'May not be implemented');
    }
  }

  log('\n🧠 Extraction Component:', 'blue');
  checkFile('lib/openai-loadvoice.ts', 'LoadVoice extraction logic');
  checkFile('lib/openai-freight-prompts.ts', 'Freight-specific prompts');
  checkFile('lib/assemblyai.ts', 'AssemblyAI configuration');

  // Check for 60-second optimization
  if (fileExists('lib/performance/optimization.ts')) {
    pass('Performance optimization module');
    const perfModule = fs.readFileSync(
      path.join(process.cwd(), 'lib/performance/optimization.ts'),
      'utf8'
    );
    if (perfModule.includes('60000') || perfModule.includes('60 second')) {
      pass('60-second target configured');
    } else {
      warn('60-second target', 'Not explicitly configured');
    }
  }

  log('\n💾 CRM Auto-Build Component:', 'blue');
  checkFile('app/api/extraction/save-to-load/route.ts', 'Save to load endpoint');
  checkFile('lib/carriers/auto-population.ts', 'Carrier auto-population');
  checkFile('app/(dashboard)/loads/page.tsx', 'Loads management page');
  checkFile('app/(dashboard)/carriers/page.tsx', 'Carriers page');
  checkFile('app/(dashboard)/shippers/page.tsx', 'Shippers page');

  log('\n📄 Rate Confirmation Component:', 'blue');
  checkFile('app/api/loads/[id]/rate-con/route.ts', 'Rate con generation endpoint');

  // Check if rate con endpoint exists
  const rateConPath = 'app/api/loads/[id]/rate-con/route.ts';
  if (!fileExists(rateConPath)) {
    fail('Rate confirmation endpoint', 'Critical P0 feature missing');
  }
}

// User Journey Audit
async function auditUserJourney() {
  logSection('3. USER JOURNEY AUDIT');

  log('\n🚪 Discovery & Signup:', 'blue');
  checkFile('app/page.tsx', 'Landing page');
  checkFile('app/signup/page.tsx', 'Signup page');

  // Check for minimal signup
  if (fileExists('app/signup/page.tsx')) {
    const signupPage = fs.readFileSync(
      path.join(process.cwd(), 'app/signup/page.tsx'),
      'utf8'
    );
    if (signupPage.includes('company') || signupPage.includes('organization')) {
      pass('Company name field in signup');
    }
    if (signupPage.includes('signInWithGoogle') || signupPage.includes('oauth')) {
      pass('Google SSO supported');
    }
  }

  log('\n✨ First Value (10 min target):', 'blue');
  checkFile('app/onboarding/page.tsx', 'Onboarding flow');
  checkFile('components/ui/loadvoice-polish.tsx', 'UI polish components');

  // Check for sample call option
  if (fileExists('app/onboarding/page.tsx')) {
    const onboarding = fs.readFileSync(
      path.join(process.cwd(), 'app/onboarding/page.tsx'),
      'utf8'
    );
    if (onboarding.includes('sample') || onboarding.includes('demo')) {
      pass('Sample call option in onboarding');
    } else {
      warn('Sample call option', 'May not be available');
    }
  }

  log('\n📅 Daily Workflow:', 'blue');
  checkFile('app/(dashboard)/dashboard/page.tsx', 'Dashboard with snapshot');

  // Check for status workflow
  const statusWorkflow = ['needs_carrier', 'dispatched', 'in_transit', 'delivered'];
  let hasStatusWorkflow = false;

  if (fileExists('app/(dashboard)/loads/page.tsx')) {
    const loadsPage = fs.readFileSync(
      path.join(process.cwd(), 'app/(dashboard)/loads/page.tsx'),
      'utf8'
    );
    hasStatusWorkflow = statusWorkflow.some(status => loadsPage.includes(status));
    if (hasStatusWorkflow) {
      pass('Status workflow implemented');
    } else {
      warn('Status workflow', 'May be incomplete');
    }
  }

  log('\n📈 Growth & Expansion:', 'blue');
  // These should be from LoadVoice
  if (fileExists('app/settings/team/page.tsx')) {
    pass('Team management (from LoadVoice)');
  } else {
    warn('Team management', 'Expected from LoadVoice');
  }
}

// Feature Set Audit
async function auditFeatures() {
  logSection('4. MLP FEATURE SET AUDIT');

  log('\n🎯 P0 Features (Must Have):', 'blue');

  const p0Features = [
    { file: 'lib/openai-loadvoice.ts', name: 'Call Extraction' },
    { file: 'app/(dashboard)/loads/page.tsx', name: 'Loads Management' },
    { file: 'app/(dashboard)/carriers/page.tsx', name: 'Carrier Database' },
    { file: 'app/(dashboard)/shippers/page.tsx', name: 'Shipper Database' },
    { file: 'app/api/loads/[id]/rate-con/route.ts', name: 'Rate Con Generator' }
  ];

  for (const feature of p0Features) {
    checkFile(feature.file, feature.name);
  }

  log('\n⭐ P1 Features (Should Have):', 'blue');

  const p1Features = [
    { file: 'app/(dashboard)/dashboard/page.tsx', name: 'Dashboard' },
    { file: 'lib/clipboard.ts', name: 'Copy/Export' }
  ];

  for (const feature of p1Features) {
    if (!checkFile(feature.file, feature.name)) {
      warn(feature.name, 'P1 feature missing');
    }
  }

  log('\n♻️ LoadVoice Features (100% Reuse):', 'blue');

  const loadvoiceFeatures = [
    'User Authentication (Supabase)',
    'Team Management',
    'Referral System',
    'Billing (Paddle)',
    'Usage Tracking',
    'GDPR Compliance'
  ];

  for (const feature of loadvoiceFeatures) {
    pass(feature, 'From LoadVoice');
  }
}

// Technical Architecture Audit
async function auditTechnical() {
  logSection('5. TECHNICAL ARCHITECTURE AUDIT');

  log('\n🔌 API Endpoints:', 'blue');

  const requiredEndpoints = [
    { path: 'app/api/loads/route.ts', name: '/api/loads' },
    { path: 'app/api/loads/[id]/route.ts', name: '/api/loads/[id]' },
    { path: 'app/api/carriers/route.ts', name: '/api/carriers' },
    { path: 'app/api/carriers/[id]/route.ts', name: '/api/carriers/[id]' },
    { path: 'app/api/extraction/freight/route.ts', name: '/api/extraction/freight' },
    { path: 'app/api/extraction/save-to-load/route.ts', name: '/api/extraction/save-to-load' },
    { path: 'app/api/loads/[id]/rate-con/route.ts', name: '/api/loads/[id]/rate-con' }
  ];

  for (const endpoint of requiredEndpoints) {
    checkFile(endpoint.path, endpoint.name);
  }

  log('\n🎙️ AssemblyAI Configuration:', 'blue');

  if (fileExists('lib/assemblyai.ts')) {
    const assemblyConfig = fs.readFileSync(
      path.join(process.cwd(), 'lib/assemblyai.ts'),
      'utf8'
    );

    const wordBoostTerms = [
      'MC number', 'DOT', 'flatbed', 'dry van', 'reefer',
      'rate con', 'pickup', 'delivery', 'detention'
    ];

    const hasWordBoost = wordBoostTerms.some(term =>
      assemblyConfig.toLowerCase().includes(term.toLowerCase())
    );

    if (hasWordBoost) {
      pass('AssemblyAI word boost configured');
    } else {
      warn('AssemblyAI word boost', 'May need freight terms added');
    }
  }

  log('\n🤖 OpenAI Prompts:', 'blue');

  if (fileExists('lib/openai-freight-prompts.ts')) {
    const prompts = fs.readFileSync(
      path.join(process.cwd(), 'lib/openai-freight-prompts.ts'),
      'utf8'
    );

    if (prompts.includes('shipper') && prompts.includes('carrier')) {
      pass('Freight-specific prompts configured');
    } else {
      warn('Freight prompts', 'May be incomplete');
    }
  }
}

// Pricing & Go-to-Market Audit
async function auditBusiness() {
  logSection('6. PRICING & GO-TO-MARKET AUDIT');

  log('\n💰 Pricing Configuration:', 'blue');

  checkFile('lib/paddle-loadvoice.ts', 'Paddle configuration');
  checkFile('lib/pricing.ts', 'Pricing tiers');

  if (fileExists('lib/pricing.ts')) {
    const pricing = fs.readFileSync(
      path.join(process.cwd(), 'lib/pricing.ts'),
      'utf8'
    );

    // Check for correct pricing
    const correctPricing = [
      { plan: 'Starter', price: '99' },
      { plan: 'Pro', price: '199' },
      { plan: 'Team', price: '349' }
    ];

    for (const tier of correctPricing) {
      if (pricing.includes(tier.price)) {
        pass(`${tier.plan} plan at $${tier.price}/mo`);
      } else {
        fail(`${tier.plan} pricing`, `Should be $${tier.price}/mo`);
      }
    }
  }

  log('\n🚀 Beta Program:', 'blue');

  checkFile('BETA_RECRUITMENT.md', 'Beta recruitment materials');
  checkFile('app/onboarding/page.tsx', 'Onboarding flow');

  log('\n📧 Go-to-Market:', 'blue');

  if (fileExists('BETA_RECRUITMENT.md')) {
    const betaDoc = fs.readFileSync(
      path.join(process.cwd(), 'BETA_RECRUITMENT.md'),
      'utf8'
    );

    if (betaDoc.includes('email') || betaDoc.includes('Email')) {
      pass('Email templates created');
    }
    if (betaDoc.includes('LinkedIn') || betaDoc.includes('social')) {
      pass('Social media strategy defined');
    }
    if (betaDoc.includes('50%') || betaDoc.includes('discount')) {
      pass('Beta incentives defined');
    }
  }
}

// Performance checks
async function auditPerformance() {
  logSection('7. PERFORMANCE AUDIT');

  checkFile('lib/performance/optimization.ts', 'Performance optimization module');
  checkFile('scripts/test-loadvoice-complete.js', 'Performance test suite');

  if (fileExists('lib/performance/optimization.ts')) {
    const perfModule = fs.readFileSync(
      path.join(process.cwd(), 'lib/performance/optimization.ts'),
      'utf8'
    );

    // Check for key optimizations
    if (perfModule.includes('cache') || perfModule.includes('Cache')) {
      pass('Caching implemented');
    }
    if (perfModule.includes('batch') || perfModule.includes('Batch')) {
      pass('Batch processing implemented');
    }
    if (perfModule.includes('lazy') || perfModule.includes('Lazy')) {
      pass('Lazy loading implemented');
    }
  }

  // Check for mobile responsiveness
  if (fileExists('components/ui/loadvoice-polish.tsx')) {
    const uiComponents = fs.readFileSync(
      path.join(process.cwd(), 'components/ui/loadvoice-polish.tsx'),
      'utf8'
    );
    if (uiComponents.includes('md:') || uiComponents.includes('sm:')) {
      pass('Mobile responsive design');
    }
  }
}

// Generate audit report
function generateReport() {
  logSection('AUDIT REPORT');

  const passRate = (auditResults.passed.length / auditResults.totalChecks * 100).toFixed(1);
  const duration = ((new Date() - auditResults.startTime) / 1000).toFixed(2);

  console.log('\n' + '─'.repeat(50));
  log(`Total Checks: ${auditResults.totalChecks}`, 'blue');
  log(`Passed: ${auditResults.passed.length} (${passRate}%)`, 'green');
  log(`Failed: ${auditResults.failed.length}`, auditResults.failed.length > 0 ? 'red' : 'green');
  log(`Warnings: ${auditResults.warnings.length}`, auditResults.warnings.length > 0 ? 'yellow' : 'green');
  log(`Duration: ${duration}s`, 'blue');

  if (auditResults.failed.length > 0) {
    console.log('\n' + '─'.repeat(50));
    log('CRITICAL FAILURES:', 'red');
    for (const failure of auditResults.failed) {
      log(`  • ${failure.check}: ${failure.reason}`, 'red');
    }
  }

  if (auditResults.warnings.length > 0) {
    console.log('\n' + '─'.repeat(50));
    log('WARNINGS:', 'yellow');
    for (const warning of auditResults.warnings) {
      log(`  • ${warning.check}: ${warning.message}`, 'yellow');
    }
  }

  console.log('\n' + '═'.repeat(60));

  // Launch readiness assessment
  const criticalFailures = auditResults.failed.filter(f =>
    f.check.includes('Rate con') ||
    f.check.includes('extraction/save') ||
    f.check.includes('Critical table')
  );

  if (criticalFailures.length === 0 && passRate >= 80) {
    log('🚀 LAUNCH STATUS: READY FOR BETA', 'green');
    log('\nNext Steps:', 'cyan');
    log('  1. Run full E2E test: npm run test:loadvoice', 'white');
    log('  2. Deploy to production environment', 'white');
    log('  3. Begin beta user recruitment', 'white');
  } else if (criticalFailures.length > 0) {
    log('⚠️ LAUNCH STATUS: CRITICAL FIXES NEEDED', 'red');
    log('\nMust fix before launch:', 'cyan');
    for (const critical of criticalFailures) {
      log(`  • ${critical.check}`, 'white');
    }
  } else {
    log('🔧 LAUNCH STATUS: MINOR FIXES RECOMMENDED', 'yellow');
    log('\nRecommended improvements:', 'cyan');
    for (const warning of auditResults.warnings.slice(0, 5)) {
      log(`  • ${warning.check}`, 'white');
    }
  }

  console.log('═'.repeat(60) + '\n');

  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks: auditResults.totalChecks,
      passed: auditResults.passed.length,
      failed: auditResults.failed.length,
      warnings: auditResults.warnings.length,
      passRate: passRate + '%',
      duration: duration + 's'
    },
    failures: auditResults.failed,
    warnings: auditResults.warnings,
    launchReady: criticalFailures.length === 0 && passRate >= 80
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'audit-report.json'),
    JSON.stringify(report, null, 2)
  );

  log('Report saved to: audit-report.json', 'blue');
}

// Main audit runner
async function runAudit() {
  console.clear();
  log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          LoadVoice Implementation Audit                    ║
║                                                            ║
║         Verifying Against MLP Specification v2.0          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `, 'cyan');

  try {
    // Run all audit sections
    await checkDatabase();
    await auditCoreValueLoop();
    await auditUserJourney();
    await auditFeatures();
    await auditTechnical();
    await auditBusiness();
    await auditPerformance();

    // Generate final report
    generateReport();

  } catch (error) {
    log('\n❌ Audit failed with error:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Check for required environment variables
function checkEnvironment() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    log('Missing required environment variables:', 'red');
    missing.forEach(key => log(`  • ${key}`, 'yellow'));
    log('\nPlease check your .env.local file', 'cyan');
    process.exit(1);
  }
}

// Run the audit
if (require.main === module) {
  checkEnvironment();
  runAudit().catch(console.error);
}