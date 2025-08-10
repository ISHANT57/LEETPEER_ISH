#!/usr/bin/env node

/**
 * Deployment Verification Script for LeetCode Progress Tracker
 * Tests all critical endpoints and caching functionality after deployment
 */

const http = require('http');
const https = require('https');

const baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:10000';
const isHttps = baseUrl.startsWith('https');
const httpModule = isHttps ? https : http;

console.log('🚀 Starting deployment verification...');
console.log(`Testing: ${baseUrl}`);

// Test configuration
const tests = [
  {
    name: 'Health Check',
    path: '/healthcheck',
    expectedStatus: 200,
    critical: true
  },
  {
    name: 'Static Assets',
    path: '/',
    expectedStatus: 200,
    critical: true
  },
  {
    name: 'Cache Status API',
    path: '/api/cache/status',
    expectedStatus: 200,
    critical: false
  },
  {
    name: 'Admin Dashboard API',
    path: '/api/dashboard/admin',
    expectedStatus: 200,
    critical: false
  },
  {
    name: 'University Dashboard API',
    path: '/api/dashboard/university',
    expectedStatus: 200,
    critical: false
  },
  {
    name: 'Students API',
    path: '/api/students',
    expectedStatus: 200,
    critical: false
  },
  {
    name: 'Leaderboard API',
    path: '/api/leaderboard',
    expectedStatus: 200,
    critical: false
  }
];

// Test results
let passed = 0;
let failed = 0;
let warnings = 0;

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Deployment-Verification/1.0'
      }
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          responseTime: Date.now() - startTime
        });
      });
    });

    const startTime = Date.now();
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function runTest(test) {
  process.stdout.write(`Testing ${test.name}... `);
  
  try {
    const response = await makeRequest(test.path);
    
    if (response.status === test.expectedStatus) {
      console.log(`✅ PASS (${response.responseTime}ms)`);
      passed++;
      
      // Additional checks for specific endpoints
      if (test.path === '/healthcheck') {
        try {
          const health = JSON.parse(response.data);
          if (health.status === 'healthy') {
            console.log(`   Database: ${health.database}`);
            console.log(`   Cache: ${health.cache.status} (${health.cache.entriesCount} entries)`);
            console.log(`   Environment: ${health.environment}`);
          } else {
            console.log(`   ⚠️  Health check reports unhealthy: ${health.error || 'Unknown'}`);
            warnings++;
          }
        } catch (e) {
          console.log(`   ⚠️  Invalid health check response format`);
          warnings++;
        }
      }
      
      if (test.path === '/api/cache/status') {
        try {
          const cacheData = JSON.parse(response.data);
          if (cacheData.cacheStatus && cacheData.cacheStatus.length > 0) {
            const activeCache = cacheData.cacheStatus.filter(c => !c.expired);
            console.log(`   Cache entries: ${activeCache.length} active, ${cacheData.cacheStatus.length} total`);
          }
        } catch (e) {
          console.log(`   ⚠️  Could not parse cache status`);
          warnings++;
        }
      }
      
    } else {
      console.log(`❌ FAIL (Expected ${test.expectedStatus}, got ${response.status})`);
      if (test.critical) {
        failed++;
      } else {
        warnings++;
      }
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(response.data);
        if (errorData.error) {
          console.log(`   Error: ${errorData.error}`);
        }
      } catch (e) {
        // Not JSON, show first 100 chars
        const preview = response.data.substring(0, 100).replace(/\n/g, ' ');
        if (preview) {
          console.log(`   Response: ${preview}...`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ ERROR (${error.message})`);
    if (test.critical) {
      failed++;
    } else {
      warnings++;
    }
  }
}

async function testCachePerformance() {
  console.log('\n🏃 Testing cache performance...');
  
  const testEndpoints = [
    '/api/dashboard/admin',
    '/api/dashboard/university',
    '/api/leaderboard'
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      process.stdout.write(`  ${endpoint}... `);
      
      // First request (cache miss or stale)
      const start1 = Date.now();
      await makeRequest(endpoint);
      const time1 = Date.now() - start1;
      
      // Second request (should be cached)
      const start2 = Date.now();
      await makeRequest(endpoint);
      const time2 = Date.now() - start2;
      
      const improvement = time1 > time2 ? Math.round(((time1 - time2) / time1) * 100) : 0;
      
      if (time2 < 500) {
        console.log(`✅ ${time1}ms → ${time2}ms (${improvement}% faster)`);
      } else {
        console.log(`⚠️  ${time1}ms → ${time2}ms (cache may not be effective)`);
        warnings++;
      }
      
    } catch (error) {
      console.log(`❌ ${error.message}`);
      warnings++;
    }
  }
}

async function main() {
  console.log('');
  
  // Run all tests
  for (const test of tests) {
    await runTest(test);
  }
  
  // Test cache performance
  await testCachePerformance();
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  
  if (failed === 0) {
    console.log('\n🎉 Deployment verification completed successfully!');
    console.log('Your application is ready for production use.');
    
    if (warnings > 0) {
      console.log(`\n⚠️  ${warnings} warnings detected - check logs above for details.`);
    }
    
    console.log('\n📝 Next steps:');
    console.log('1. Visit the admin dashboard to initialize student data');
    console.log('2. Test the cache warm-up functionality');
    console.log('3. Monitor performance in production');
    
    process.exit(0);
  } else {
    console.log(`\n💥 Deployment verification failed with ${failed} critical errors.`);
    console.log('Please check the application logs and fix the issues before proceeding.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n💥 Unhandled rejection:', reason);
  process.exit(1);
});

main().catch(error => {
  console.error('\n💥 Verification script failed:', error.message);
  process.exit(1);
});