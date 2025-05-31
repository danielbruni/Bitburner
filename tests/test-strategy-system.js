/**
 * test-strategy-system.js - Test the money tracking and strategy coordination system
 * This script tests the integration between money tracking and strategy changes
 */

import { MoneyTracker } from "/core/process/money-tracker.js";
import { createStrategyCoordinator } from "/core/process/strategy-coordinator.js";
import { getConfig } from "../core/config/system-config.js";

/** @param {NS} ns */
export async function main(ns) {
  const testType = ns.args[0] || "basic"; // basic, manual, stagnation

  ns.disableLog("ALL");
  ns.tprint("🧪 === STRATEGY SYSTEM TEST ===");

  try {
    // Initialize systems
    ns.tprint("🔧 Initializing money tracker and strategy coordinator...");
    const moneyTracker = new MoneyTracker(ns);
    const strategyCoordinator = createStrategyCoordinator(ns);

    if (testType === "basic") {
      await testBasicFunctionality(ns, moneyTracker, strategyCoordinator);
    } else if (testType === "manual") {
      await testManualStrategyChange(ns, strategyCoordinator);
    } else if (testType === "stagnation") {
      await testStagnationDetection(ns, moneyTracker);
    } else {
      ns.tprint("❌ Invalid test type. Use: basic, manual, or stagnation");
    }
  } catch (error) {
    ns.tprint(`❌ Test failed: ${error.toString()}`);
  }
}

/**
 * Test basic functionality
 */
async function testBasicFunctionality(ns, moneyTracker, strategyCoordinator) {
  ns.tprint("📊 Testing basic functionality...");

  // Test money tracker status
  const moneyStatus = moneyTracker.getStatus();
  ns.tprint(`💰 Current money rate: ${moneyStatus.formattedCurrentRate}/sec`);
  ns.tprint(`📈 Is stagnant: ${moneyStatus.isStagnant ? "YES" : "NO"}`);

  // Test strategy coordinator
  const currentStrategy = strategyCoordinator.getCurrentStrategy();
  ns.tprint(`🎯 Current strategy: ${currentStrategy}`);

  // Test strategy recommendations
  const recommended = strategyCoordinator.getRecommendedStrategy();
  ns.tprint(`💡 Recommended strategy: ${recommended}`);

  // Test configuration loading
  const config = getConfig("moneyTracking");
  ns.tprint(
    `⚙️ Money tracking config loaded: ${JSON.stringify(config, null, 2)}`
  );

  ns.tprint("✅ Basic functionality test completed");
}

/**
 * Test manual strategy change
 */
async function testManualStrategyChange(ns, strategyCoordinator) {
  ns.tprint("🔄 Testing manual strategy changes...");

  const strategies = ["balanced", "aggressive", "conservative", "emergency"];
  const currentStrategy = strategyCoordinator.getCurrentStrategy();

  ns.tprint(`📍 Starting strategy: ${currentStrategy}`);

  for (const strategy of strategies) {
    if (strategy === currentStrategy) continue;

    ns.tprint(`🔄 Attempting to change to ${strategy}...`);

    const result = await strategyCoordinator.changeStrategy(
      strategy,
      "test_manual_change"
    );

    if (result.success) {
      ns.tprint(`✅ Successfully changed to ${strategy}`);

      // Wait a moment then check if it was applied
      await ns.sleep(1000);
      const newStrategy = strategyCoordinator.getCurrentStrategy();

      if (newStrategy === strategy) {
        ns.tprint(`✅ Strategy change confirmed: ${newStrategy}`);
      } else {
        ns.tprint(
          `❌ Strategy change not applied: expected ${strategy}, got ${newStrategy}`
        );
      }
    } else {
      ns.tprint(`❌ Strategy change failed: ${result.reason}`);
    }

    await ns.sleep(2000); // Cooldown between changes
  }

  ns.tprint("✅ Manual strategy change test completed");
}

/**
 * Test stagnation detection
 */
async function testStagnationDetection(ns, moneyTracker) {
  ns.tprint("⏱️ Testing stagnation detection...");

  // Get current money for baseline
  const startMoney = ns.getServerMoneyAvailable("home");
  ns.tprint(`💰 Starting money: $${ns.formatNumber(startMoney)}`);

  // Track for a few cycles
  for (let i = 0; i < 5; i++) {
    moneyTracker.updateTracking();
    const status = moneyTracker.getStatus();

    ns.tprint(
      `📊 Cycle ${i + 1}: Rate ${status.formattedCurrentRate}/sec, Stagnant: ${
        status.isStagnant ? "YES" : "NO"
      }`
    );

    if (moneyTracker.shouldChangeStrategy()) {
      ns.tprint("🚨 Money tracker suggests strategy change!");
    }

    await ns.sleep(2000);
  }

  ns.tprint("✅ Stagnation detection test completed");
}
