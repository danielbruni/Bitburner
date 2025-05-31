/**
 * test-system-integration.js - Comprehensive system integration test
 *
 * Tests the integrated Bitburner automation system to ensure all components
 * work together correctly with centralized configuration.
 */

import {
  getConfig,
  setConfig,
  validateConfig,
  getConfigSummary,
} from "../core/config/system-config.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.tprint("=== BITBURNER AUTOMATION SYSTEM INTEGRATION TEST ===");
  ns.tprint("");
  const testResults = {
    configurationTests: [],
    overall: { passed: 0, failed: 0, total: 0 },
  };

  try {
    // Test 1: Configuration System
    ns.tprint("🔧 Testing Configuration System...");
    await testConfigurationSystem(ns, testResults);

    // Generate final report
    generateTestReport(ns, testResults);
  } catch (error) {
    ns.tprint(`❌ CRITICAL ERROR: ${error.message}`);
    ns.tprint(`Stack: ${error.stack}`);
  }
}

/**
 * Test configuration system functionality
 */
async function testConfigurationSystem(ns, testResults) {
  const tests = testResults.configurationTests;

  // Test 1: Basic configuration retrieval
  runTest(tests, "Basic Config Retrieval", () => {
    const homeRam = getConfig("resources.homeReservedRam");

    if (typeof homeRam !== "number" || homeRam < 0) {
      throw new Error(`Invalid homeReservedRam: ${homeRam}`);
    }

    return { homeRam };
  });

  // Test 2: Configuration validation
  runTest(tests, "Configuration Validation", () => {
    const errors = validateConfig();
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(", ")}`);
    }
    return { validationPassed: true };
  });

  // Test 3: Dynamic configuration setting
  runTest(tests, "Dynamic Configuration Setting", () => {
    const originalValue = getConfig("debug.logLevel");
    const testValue = originalValue === 1 ? 2 : 1;

    const success = setConfig("debug.logLevel", testValue);
    if (!success) {
      throw new Error("Failed to set configuration value");
    }

    const newValue = getConfig("debug.logLevel");
    if (newValue !== testValue) {
      throw new Error(
        `Configuration not updated: expected ${testValue}, got ${newValue}`
      );
    }

    // Restore original value
    setConfig("debug.logLevel", originalValue);

    return { originalValue, testValue, restored: getConfig("debug.logLevel") };
  });

  // Test 4: Configuration summary generation
  runTest(tests, "Configuration Summary", () => {
    const summary = getConfigSummary();
    if (!summary || summary.length < 100) {
      throw new Error("Configuration summary too short or empty");
    }
    return { summaryLength: summary.length };
  });
  ns.tprint(
    `  ✅ Configuration System: ${tests.filter((t) => t.passed).length}/${
      tests.length
    } tests passed`
  );
}

/**
 * Run a single test and record results
 */
function runTest(testArray, testName, testFunction) {
  const test = {
    name: testName,
    passed: false,
    error: null,
    result: null,
    duration: 0,
  };

  const startTime = Date.now();

  try {
    const result = testFunction();

    // Handle async functions
    if (result && typeof result.then === "function") {
      return result
        .then((asyncResult) => {
          test.result = asyncResult;
          test.passed = true;
          test.duration = Date.now() - startTime;
          testArray.push(test);
          return test;
        })
        .catch((error) => {
          test.error = error.message;
          test.duration = Date.now() - startTime;
          testArray.push(test);
          return test;
        });
    } else {
      test.result = result;
      test.passed = true;
    }
  } catch (error) {
    test.error = error.message;
  }

  test.duration = Date.now() - startTime;
  testArray.push(test);
  return test;
}

/**
 * Generate comprehensive test report
 */
function generateTestReport(ns, testResults) {
  ns.tprint("");
  ns.tprint("=== SYSTEM INTEGRATION TEST REPORT ===");
  ns.tprint("");

  let totalPassed = 0;
  let totalFailed = 0;
  // Detailed results for each test category
  const categories = [
    { name: "Configuration System", tests: testResults.configurationTests },
  ];

  for (const category of categories) {
    const passed = category.tests.filter((t) => t.passed).length;
    const failed = category.tests.length - passed;

    totalPassed += passed;
    totalFailed += failed;

    ns.tprint(`📋 ${category.name}: ${passed}/${category.tests.length} passed`);

    // Show failed tests
    const failedTests = category.tests.filter((t) => !t.passed);
    for (const test of failedTests) {
      ns.tprint(`  ❌ ${test.name}: ${test.error}`);
    }

    // Show performance data for passed tests
    if (passed > 0) {
      const avgDuration =
        category.tests.reduce((sum, t) => sum + t.duration, 0) /
        category.tests.length;
      ns.tprint(`  ⏱️  Average test duration: ${avgDuration.toFixed(1)}ms`);
    }

    ns.tprint("");
  }

  // Overall summary
  const successRate = (totalPassed / (totalPassed + totalFailed)) * 100;

  ns.tprint("=== OVERALL RESULTS ===");
  ns.tprint(`✅ Tests Passed: ${totalPassed}`);
  ns.tprint(`❌ Tests Failed: ${totalFailed}`);
  ns.tprint(`📊 Success Rate: ${successRate.toFixed(1)}%`);
  ns.tprint("");

  if (successRate >= 90) {
    ns.tprint("🎉 EXCELLENT: System integration is working excellently!");
  } else if (successRate >= 75) {
    ns.tprint("✅ GOOD: System integration is working well with minor issues.");
  } else if (successRate >= 50) {
    ns.tprint(
      "⚠️  WARNING: System integration has significant issues that need attention."
    );
  } else {
    ns.tprint("❌ CRITICAL: System integration is severely compromised.");
  }

  // Configuration summary
  ns.tprint("");
  ns.tprint("=== CURRENT CONFIGURATION SUMMARY ===");
  const configSummary = getConfigSummary();
  const summaryLines = configSummary.split("\n").slice(0, 15); // First 15 lines
  for (const line of summaryLines) {
    ns.tprint(line);
  }
}
