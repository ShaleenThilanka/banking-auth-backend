// Security Testing Utilities
// Tests authentication failures, fraud detection, and security measures

const axios = require('axios');
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

/**
 * Test suite for security validation
 */
class SecurityTests {
  constructor() {
    this.results = [];
  }

  /**
   * Test 1: Multiple failed login attempts
   */
  async testMultipleFailedLogins() {
    console.log('\n🔒 Test 1: Multiple Failed Login Attempts');
    try {
      const email = `test${Date.now()}@example.com`;
      let fraudDetected = false;

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        try {
          await axios.post(`${BASE_URL}/api/auth/login`, {
            email,
            password: 'wrongpassword'
          });
        } catch (error) {
          if (error.response?.status === 401) {
            console.log(`  ✓ Failed login attempt ${i + 1}`);
          }
        }
      }

      // Check if account is locked
      try {
        await axios.post(`${BASE_URL}/api/auth/login`, {
          email,
          password: 'wrongpassword'
        });
      } catch (error) {
        if (error.response?.data?.error?.includes('locked')) {
          fraudDetected = true;
          console.log('  ✓ Account lockout triggered after multiple failed attempts');
        }
      }

      this.results.push({
        test: 'Multiple Failed Logins',
        passed: fraudDetected,
        description: 'Account should be locked after 5 failed attempts'
      });
    } catch (error) {
      console.error('  ✗ Test failed:', error.message);
      this.results.push({
        test: 'Multiple Failed Logins',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test 2: Rate limiting
   */
  async testRateLimiting() {
    console.log('\n🔒 Test 2: Rate Limiting');
    try {
      let rateLimited = false;
      const requests = [];

      // Make 10 rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'test@example.com',
            password: 'test'
          }).catch(err => err.response)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitResponses = responses.filter(r => r?.status === 429);

      if (rateLimitResponses.length > 0) {
        rateLimited = true;
        console.log(`  ✓ Rate limiting active (${rateLimitResponses.length} requests blocked)`);
      }

      this.results.push({
        test: 'Rate Limiting',
        passed: rateLimited,
        description: 'Rate limiting should block excessive requests'
      });
    } catch (error) {
      console.error('  ✗ Test failed:', error.message);
      this.results.push({
        test: 'Rate Limiting',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test 3: Input validation
   */
  async testInputValidation() {
    console.log('\n🔒 Test 3: Input Validation');
    try {
      const invalidInputs = [
        { email: 'invalid-email', password: 'test123' },
        { email: 'test@example.com', password: 'weak' },
        { email: '', password: 'test123' }
      ];

      let allValidated = true;
      for (const input of invalidInputs) {
        try {
          await axios.post(`${BASE_URL}/api/auth/register`, input);
          allValidated = false;
          console.log(`  ✗ Invalid input accepted: ${JSON.stringify(input)}`);
        } catch (error) {
          if (error.response?.status === 400) {
            console.log(`  ✓ Invalid input rejected: ${input.email || 'empty email'}`);
          }
        }
      }

      this.results.push({
        test: 'Input Validation',
        passed: allValidated,
        description: 'Invalid inputs should be rejected'
      });
    } catch (error) {
      console.error('  ✗ Test failed:', error.message);
      this.results.push({
        test: 'Input Validation',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test 4: JWT token validation
   */
  async testJWTValidation() {
    console.log('\n🔒 Test 4: JWT Token Validation');
    try {
      // Try to access protected route without token
      try {
        await axios.get(`${BASE_URL}/api/auth/profile`);
        console.log('  ✗ Protected route accessible without token');
        this.results.push({
          test: 'JWT Validation',
          passed: false,
          description: 'Protected routes should require valid token'
        });
        return;
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('  ✓ Protected route requires authentication');
        }
      }

      // Try with invalid token
      try {
        await axios.get(`${BASE_URL}/api/auth/profile`, {
          headers: { Authorization: 'Bearer invalid_token' }
        });
        console.log('  ✗ Invalid token accepted');
        this.results.push({
          test: 'JWT Validation',
          passed: false,
          description: 'Invalid tokens should be rejected'
        });
        return;
      } catch (error) {
        if (error.response?.status === 403) {
          console.log('  ✓ Invalid token rejected');
        }
      }

      this.results.push({
        test: 'JWT Validation',
        passed: true,
        description: 'JWT tokens are properly validated'
      });
    } catch (error) {
      console.error('  ✗ Test failed:', error.message);
      this.results.push({
        test: 'JWT Validation',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('\n🚀 Starting Security Tests...\n');
    console.log('='.repeat(50));

    await this.testInputValidation();
    await this.testJWTValidation();
    await this.testRateLimiting();
    await this.testMultipleFailedLogins();

    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} - ${result.test}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log(`\nTotal: ${passed}/${total} tests passed\n`);

    return {
      passed,
      total,
      results: this.results
    };
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tests = new SecurityTests();
  tests.runAll().catch(console.error);
}

module.exports = SecurityTests;

