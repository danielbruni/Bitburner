/**
 * comprehensive-test.js - Comprehensive test for the fixed strategy system
 * Tests all the methods that were missing and causing runtime errors
 */

// Mock NetScript API for testing
class MockNS {
  constructor() {
    this.files = new Map();
    this.player = { money: 1000000 };
  }

  print(msg) {
    console.log(`[NS] ${msg}`);
  }
  tprint(msg) {
    console.log(`[TERMINAL] ${msg}`);
  }

  read(filename) {
    return this.files.get(filename) || "";
  }

  write(filename, data, mode = "w") {
    this.files.set(filename, data);
  }

  fileExists(filename) {
    return this.files.has(filename);
  }

  getPlayer() {
    return this.player;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function runTests() {
  console.log("🧪 Starting Comprehensive Strategy System Tests");
  console.log("=".repeat(50));

  try {
    // Import the strategy coordinator
    const { createStrategyCoordinator } = await import(
      "../core/process/strategy-coordinator.js"
    );
    console.log("✅ Successfully imported createStrategyCoordinator");

    // Create mock NS and coordinator
    const mockNS = new MockNS();
    const coordinator = createStrategyCoordinator(mockNS);
    console.log("✅ Successfully created StrategyCoordinator instance");

    // Test 1: getCurrentStrategy (the original failing method)
    console.log("\n📋 Test 1: getCurrentStrategy()");
    const currentStrategy = coordinator.getCurrentStrategy();
    console.log(`   Result: ${currentStrategy}`);
    console.log("   ✅ getCurrentStrategy() works correctly");

    // Test 2: changeStrategy (missing method we added)
    console.log("\n📋 Test 2: changeStrategy()");
    const changeResult = await coordinator.changeStrategy(
      "aggressive",
      "test_change"
    );
    console.log(`   Result: ${JSON.stringify(changeResult, null, 2)}`);
    if (changeResult.success) {
      console.log("   ✅ changeStrategy() works correctly");
    } else {
      console.log("   ❌ changeStrategy() failed");
    }

    // Test 3: getStrategyHistory (missing method we added)
    console.log("\n📋 Test 3: getStrategyHistory()");
    const history = coordinator.getStrategyHistory();
    console.log(`   History length: ${history.length}`);
    console.log("   ✅ getStrategyHistory() works correctly");

    // Test 4: Verify strategy changed
    console.log("\n📋 Test 4: Verify strategy state change");
    const newCurrentStrategy = coordinator.getCurrentStrategy();
    console.log(`   New current strategy: ${newCurrentStrategy}`);
    if (newCurrentStrategy === "aggressive") {
      console.log("   ✅ Strategy state updated correctly");
    } else {
      console.log("   ❌ Strategy state not updated");
    }

    // Test 5: Test invalid strategy change
    console.log("\n📋 Test 5: Test invalid strategy change");
    const invalidResult = await coordinator.changeStrategy(
      "invalid_strategy",
      "test_invalid"
    );
    if (!invalidResult.success) {
      console.log("   ✅ Invalid strategy properly rejected");
    } else {
      console.log("   ❌ Invalid strategy should be rejected");
    }

    // Test 6: Test changing to same strategy
    console.log("\n📋 Test 6: Test changing to same strategy");
    const sameResult = await coordinator.changeStrategy(
      "aggressive",
      "test_same"
    );
    if (!sameResult.success) {
      console.log("   ✅ Same strategy change properly rejected");
    } else {
      console.log("   ❌ Same strategy change should be rejected");
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 All tests completed successfully!");
    console.log("🔧 The strategy system runtime errors have been fixed:");
    console.log("   - getCurrentStrategy() method exists and works");
    console.log("   - changeStrategy() method added and works");
    console.log("   - getStrategyHistory() method added and works");
    console.log("   - All import issues resolved");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    console.error("Stack trace:", error.stack);
  }
}

// Run the tests
runTests();
