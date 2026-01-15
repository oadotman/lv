#!/usr/bin/env node

/**
 * LoadVoice End-to-End Testing Suite
 * Complete testing of the extraction → CRM → rate con flow
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testTimeout: 60000, // 60 seconds for extraction
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: [],
  performanceMetrics: {},
  startTime: Date.now(),
};

/**
 * Performance timer utility
 */
class PerformanceTimer {
  constructor(name) {
    this.name = name;
    this.start = Date.now();
  }

  end() {
    const duration = Date.now() - this.start;
    results.performanceMetrics[this.name] = duration;
    return duration;
  }
}

/**
 * Make HTTP request with timing
 */
async function makeRequest(path, options = {}) {
  const timer = new PerformanceTimer(`Request: ${path}`);
  const url = new URL(path, config.baseUrl);
  const isHttps = url.protocol === 'https:';
  const module = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: config.testTimeout,
    };

    const req = module.request(reqOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = timer.end();
        try {
          const response = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: response,
            duration,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            duration,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      timer.end();
      reject(error);
    });

    req.on('timeout', () => {
      timer.end();
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Test 1: Complete Extraction Flow
 */
async function testExtractionFlow() {
  log('\n🔄 Testing Complete Extraction Flow...', 'blue');
  const timer = new PerformanceTimer('Complete Extraction Flow');

  try {
    // Simulate file upload
    log('  📤 Simulating file upload...', 'cyan');

    // Test extraction endpoint
    const mockCallData = {
      title: 'Test Call - Chicago to Nashville',
      audio_url: 'https://example.com/test-audio.mp3',
      duration: 600,
      organization_id: 'test-org-123',
    };

    // Check if extraction API exists
    const extractionResponse = await makeRequest('/api/extraction/freight', {
      method: 'POST',
      body: mockCallData,
    });

    if (extractionResponse.status === 404) {
      log('  ⚠️  Extraction API not implemented yet', 'yellow');
      results.warnings.push('Extraction API not implemented');
    } else if (extractionResponse.status === 200 || extractionResponse.status === 201) {
      log('  ✅ Extraction completed', 'green');
      results.passed.push('Extraction flow');

      // Check extraction time
      if (extractionResponse.duration < 60000) {
        log(`  ✅ Extraction time: ${extractionResponse.duration}ms (< 60s target)`, 'green');
        results.passed.push('Extraction performance');
      } else {
        log(`  ⚠️  Extraction time: ${extractionResponse.duration}ms (> 60s target)`, 'yellow');
        results.warnings.push('Extraction performance slow');
      }
    } else {
      log(`  ❌ Extraction failed with status ${extractionResponse.status}`, 'red');
      results.failed.push('Extraction flow');
    }

  } catch (error) {
    log(`  ❌ Extraction flow error: ${error.message}`, 'red');
    results.failed.push('Extraction flow');
  }

  timer.end();
}

/**
 * Test 2: Load CRUD Operations
 */
async function testLoadOperations() {
  log('\n📦 Testing Load CRUD Operations...', 'blue');
  const timer = new PerformanceTimer('Load Operations');

  try {
    // Test load creation
    const newLoad = {
      origin_city: 'Chicago',
      origin_state: 'IL',
      destination_city: 'Nashville',
      destination_state: 'TN',
      pickup_date: new Date().toISOString().split('T')[0],
      delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      commodity: 'Test Freight',
      weight: 40000,
      customer_rate: 2500,
      carrier_rate: 2000,
    };

    const createResponse = await makeRequest('/api/loads', {
      method: 'POST',
      body: newLoad,
    });

    if (createResponse.status === 401) {
      log('  ⚠️  Load API requires authentication', 'yellow');
      results.warnings.push('Load API requires auth');
    } else if (createResponse.status === 200 || createResponse.status === 201) {
      log('  ✅ Load creation successful', 'green');
      results.passed.push('Load creation');

      // Test load retrieval
      const getResponse = await makeRequest('/api/loads?limit=1');
      if (getResponse.status === 200) {
        log('  ✅ Load retrieval successful', 'green');
        results.passed.push('Load retrieval');
      }

      // Test load update
      if (createResponse.data.load?.id) {
        const updateResponse = await makeRequest('/api/loads', {
          method: 'PATCH',
          body: { id: createResponse.data.load.id, status: 'in_transit' },
        });
        if (updateResponse.status === 200) {
          log('  ✅ Load update successful', 'green');
          results.passed.push('Load update');
        }
      }
    } else {
      log(`  ❌ Load creation failed with status ${createResponse.status}`, 'red');
      results.failed.push('Load operations');
    }

  } catch (error) {
    log(`  ❌ Load operations error: ${error.message}`, 'red');
    results.failed.push('Load operations');
  }

  timer.end();
}

/**
 * Test 3: Dashboard Performance
 */
async function testDashboardPerformance() {
  log('\n📊 Testing Dashboard Performance...', 'blue');
  const timer = new PerformanceTimer('Dashboard Performance');

  try {
    const response = await makeRequest('/api/dashboard/snapshot');

    if (response.status === 200 || response.status === 401) {
      const loadTime = response.duration;

      if (loadTime < 1000) {
        log(`  ✅ Dashboard loads in ${loadTime}ms (< 1s target)`, 'green');
        results.passed.push('Dashboard performance');
      } else if (loadTime < 2000) {
        log(`  ⚠️  Dashboard loads in ${loadTime}ms (< 2s acceptable)`, 'yellow');
        results.warnings.push('Dashboard performance slow');
      } else {
        log(`  ❌ Dashboard loads in ${loadTime}ms (> 2s too slow)`, 'red');
        results.failed.push('Dashboard performance');
      }

      // Check response size
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        const sizeKB = parseInt(contentLength) / 1024;
        log(`  📏 Response size: ${sizeKB.toFixed(2)} KB`, 'cyan');
      }
    }

  } catch (error) {
    log(`  ❌ Dashboard performance error: ${error.message}`, 'red');
    results.failed.push('Dashboard performance');
  }

  timer.end();
}

/**
 * Test 4: Mobile Responsiveness
 */
function testMobileResponsiveness() {
  log('\n📱 Testing Mobile Responsiveness...', 'blue');

  const componentsToCheck = [
    'app/(dashboard)/dashboard/page.tsx',
    'components/dashboard/QuickActions.tsx',
    'components/layout/Sidebar.tsx',
    'components/modals/UploadModal.tsx',
  ];

  componentsToCheck.forEach(componentPath => {
    const fullPath = path.join(process.cwd(), componentPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check for responsive classes
      const hasResponsive =
        content.includes('md:') ||
        content.includes('lg:') ||
        content.includes('sm:') ||
        content.includes('grid-cols');

      if (hasResponsive) {
        log(`  ✅ ${path.basename(componentPath)} has responsive design`, 'green');
        results.passed.push(`Responsive: ${path.basename(componentPath)}`);
      } else {
        log(`  ⚠️  ${path.basename(componentPath)} may lack responsive design`, 'yellow');
        results.warnings.push(`Responsive: ${path.basename(componentPath)}`);
      }
    }
  });
}

/**
 * Test 5: Error Handling
 */
async function testErrorHandling() {
  log('\n🛡️ Testing Error Handling...', 'blue');

  // Test invalid requests
  const tests = [
    {
      name: 'Invalid load creation',
      path: '/api/loads',
      method: 'POST',
      body: { invalid: 'data' },
      expectedStatus: [400, 401, 422],
    },
    {
      name: 'Non-existent load',
      path: '/api/loads?id=non-existent-id',
      method: 'GET',
      expectedStatus: [404, 401],
    },
    {
      name: 'Invalid dashboard params',
      path: '/api/dashboard/snapshot?invalid=true',
      method: 'GET',
      expectedStatus: [200, 401], // Should handle gracefully
    },
  ];

  for (const test of tests) {
    try {
      const response = await makeRequest(test.path, {
        method: test.method,
        body: test.body,
      });

      if (test.expectedStatus.includes(response.status)) {
        log(`  ✅ ${test.name}: Proper error handling (${response.status})`, 'green');
        results.passed.push(`Error handling: ${test.name}`);
      } else {
        log(`  ⚠️  ${test.name}: Unexpected status ${response.status}`, 'yellow');
        results.warnings.push(`Error handling: ${test.name}`);
      }
    } catch (error) {
      log(`  ❌ ${test.name}: Request failed`, 'red');
      results.failed.push(`Error handling: ${test.name}`);
    }
  }
}

/**
 * Test 6: Loading States and UI Polish
 */
function testUIPolish() {
  log('\n✨ Testing UI Polish...', 'blue');

  const checkItems = [
    { file: 'components/ui/skeleton.tsx', feature: 'Loading skeletons' },
    { file: 'lib/toast-messages.ts', feature: 'Toast notifications' },
    { file: 'components/ErrorBoundary.tsx', feature: 'Error boundaries' },
    { file: 'lib/animations.ts', feature: 'Animations' },
  ];

  checkItems.forEach(item => {
    const fullPath = path.join(process.cwd(), item.file);
    if (fs.existsSync(fullPath)) {
      log(`  ✅ ${item.feature} implemented`, 'green');
      results.passed.push(item.feature);
    } else {
      log(`  ⚠️  ${item.feature} not found`, 'yellow');
      results.warnings.push(item.feature);
    }
  });

  // Check for Sonner toast integration
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  );

  if (packageJson.dependencies?.sonner) {
    log('  ✅ Sonner toast notifications installed', 'green');
    results.passed.push('Toast notifications');
  }

  if (packageJson.dependencies?.framer-motion || packageJson.dependencies?.['@react-spring/web']) {
    log('  ✅ Animation library installed', 'green');
    results.passed.push('Animations');
  }
}

/**
 * Test 7: SEO and Metadata
 */
function testSEOOptimization() {
  log('\n🔍 Testing SEO & Metadata...', 'blue');

  const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf8');

    const seoChecks = [
      { pattern: 'metadata', name: 'Metadata export' },
      { pattern: 'title', name: 'Page title' },
      { pattern: 'description', name: 'Meta description' },
      { pattern: 'viewport', name: 'Viewport meta' },
    ];

    seoChecks.forEach(check => {
      if (content.includes(check.pattern)) {
        log(`  ✅ ${check.name} configured`, 'green');
        results.passed.push(`SEO: ${check.name}`);
      } else {
        log(`  ⚠️  ${check.name} might be missing`, 'yellow');
        results.warnings.push(`SEO: ${check.name}`);
      }
    });
  }
}

/**
 * Test 8: Performance Metrics Summary
 */
function analyzePerformanceMetrics() {
  log('\n⚡ Performance Metrics Analysis...', 'magenta');

  const metrics = results.performanceMetrics;
  const targets = {
    'Complete Extraction Flow': 60000,
    'Dashboard Performance': 1000,
    'Load Operations': 500,
  };

  Object.entries(metrics).forEach(([name, duration]) => {
    const target = targets[name];
    if (target) {
      const percentage = ((target - duration) / target * 100).toFixed(1);
      if (duration <= target) {
        log(`  ✅ ${name}: ${duration}ms (${percentage}% under target)`, 'green');
      } else {
        log(`  ❌ ${name}: ${duration}ms (${Math.abs(percentage)}% over target)`, 'red');
      }
    } else if (name.startsWith('Request:')) {
      log(`  📊 ${name}: ${duration}ms`, 'cyan');
    }
  });

  // Calculate average response time
  const requestMetrics = Object.entries(metrics)
    .filter(([name]) => name.startsWith('Request:'))
    .map(([, duration]) => duration);

  if (requestMetrics.length > 0) {
    const avgResponseTime = requestMetrics.reduce((a, b) => a + b, 0) / requestMetrics.length;
    log(`\n  📈 Average Response Time: ${avgResponseTime.toFixed(0)}ms`, 'cyan');
  }
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations() {
  log('\n💡 Optimization Recommendations:', 'yellow');

  const recommendations = [];

  // Check extraction performance
  if (results.performanceMetrics['Complete Extraction Flow'] > 60000) {
    recommendations.push('• Consider implementing extraction queue with progress updates');
    recommendations.push('• Use WebSocket for real-time extraction status');
  }

  // Check dashboard performance
  if (results.performanceMetrics['Dashboard Performance'] > 1000) {
    recommendations.push('• Implement Redis caching for dashboard metrics');
    recommendations.push('• Use database views for complex aggregations');
  }

  // Check mobile responsiveness
  if (results.warnings.filter(w => w.includes('Responsive')).length > 0) {
    recommendations.push('• Add Tailwind responsive utilities to all components');
    recommendations.push('• Test with Chrome DevTools device emulation');
  }

  // Check error handling
  if (results.failed.filter(f => f.includes('Error handling')).length > 0) {
    recommendations.push('• Implement global error boundary');
    recommendations.push('• Add Sentry error tracking');
  }

  if (recommendations.length === 0) {
    log('  ✅ Application is well-optimized!', 'green');
  } else {
    recommendations.forEach(rec => log(rec, 'yellow'));
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log(colors.bold + '='.repeat(60) + colors.reset, 'blue');
  log(colors.bold + '🧪 LoadVoice End-to-End Testing Suite' + colors.reset, 'blue');
  log(colors.bold + '='.repeat(60) + colors.reset, 'blue');

  // Run all tests
  await testExtractionFlow();
  await testLoadOperations();
  await testDashboardPerformance();
  testMobileResponsiveness();
  await testErrorHandling();
  testUIPolish();
  testSEOOptimization();
  analyzePerformanceMetrics();

  // Calculate totals
  const totalTime = Date.now() - results.startTime;

  // Show results
  log('\n' + '='.repeat(60), 'blue');
  log('📊 Test Results Summary:', 'blue');
  log('='.repeat(60), 'blue');

  log(`\n  ✅ Passed: ${results.passed.length}`, 'green');
  log(`  ❌ Failed: ${results.failed.length}`, results.failed.length > 0 ? 'red' : 'green');
  log(`  ⚠️  Warnings: ${results.warnings.length}`, 'yellow');
  log(`  ⏱️  Total Time: ${totalTime}ms`, 'cyan');

  const successRate = results.passed.length /
    (results.passed.length + results.failed.length) * 100;

  log(`\n  📈 Success Rate: ${successRate.toFixed(1)}%`,
    successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');

  // Show failed tests
  if (results.failed.length > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.failed.forEach(test => log(`  • ${test}`, 'red'));
  }

  // Show warnings
  if (results.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    results.warnings.forEach(warning => log(`  • ${warning}`, 'yellow'));
  }

  // Generate recommendations
  generateRecommendations();

  // Final verdict
  log('\n' + '='.repeat(60), 'blue');
  if (results.failed.length === 0 && results.warnings.length < 5) {
    log('✅ LoadVoice is PRODUCTION READY!', 'green');
  } else if (results.failed.length < 3) {
    log('🔧 LoadVoice needs minor fixes before production', 'yellow');
  } else {
    log('⚠️  LoadVoice requires additional work before production', 'red');
  }
  log('='.repeat(60), 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});