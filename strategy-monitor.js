/**
 * strategy-monitor.js - Real-time monitoring of the strategy system
 * Shows live updates of money tracking and strategy coordination
 */

import { MoneyTracker } from "/core/process/money-tracker.js";
import { StrategyCoordinator } from "/core/process/strategy-coordinator.js";
import { formatMoney } from "./core/utils/common.js";

/** @param {NS} ns */
export async function main(ns) {
  const continuous = ns.args[0] !== "once";

  ns.disableLog("ALL");
  ns.ui.openTail();

  // Initialize systems
  const moneyTracker = new MoneyTracker(ns);
  const strategyCoordinator = new StrategyCoordinator(ns);

  let lastMoney = ns.getServerMoneyAvailable("home");
  let cycleCount = 0;

  do {
    ns.clearLog();
    cycleCount++;

    ns.print("💰 === STRATEGY SYSTEM MONITOR ===");
    ns.print(`Time: ${new Date().toLocaleTimeString()}`);
    ns.print(`Cycle: ${cycleCount}`);
    ns.print("");

    // Update tracking
    moneyTracker.updateTracking();
    const moneyStatus = moneyTracker.getStatus();

    // Check for strategy changes
    const strategyChanged = strategyCoordinator.checkAndApplyStrategyChanges();
    const currentStrategy = strategyCoordinator.getCurrentStrategy();

    // Money tracking info
    const currentMoney = ns.getServerMoneyAvailable("home");
    const moneyDiff = currentMoney - lastMoney;

    ns.print("=== MONEY TRACKING ===");
    ns.print(`Current Money: ${formatMoney(currentMoney)}`);
    ns.print(
      `Money Change: ${moneyDiff >= 0 ? "+" : ""}${formatMoney(moneyDiff)}`
    );
    ns.print(`Current Rate: ${moneyStatus.formattedCurrentRate}/sec`);
    ns.print(`Average Rate: ${moneyStatus.formattedAverageRate}/sec`);
    ns.print(`Best Rate: ${moneyStatus.formattedBestRate}/sec`);
    ns.print(`Samples: ${moneyStatus.sampleCount}/${moneyStatus.maxSamples}`);
    ns.print(`Stagnant: ${moneyStatus.isStagnant ? "🔴 YES" : "🟢 NO"}`);
    ns.print(
      `Should Change Strategy: ${
        moneyTracker.shouldChangeStrategy() ? "🔴 YES" : "🟢 NO"
      }`
    );
    ns.print("");

    // Strategy info
    ns.print("=== STRATEGY COORDINATION ===");
    ns.print(`Current Strategy: ${currentStrategy}`);
    ns.print(`Strategy Changed: ${strategyChanged ? "🔄 YES" : "➖ NO"}`);
    ns.print(
      `Recommended Strategy: ${strategyCoordinator.getRecommendedStrategy()}`
    );
    ns.print("");

    // Strategy history
    const strategyHistory = strategyCoordinator.getStrategyHistory();
    if (strategyHistory.length > 0) {
      ns.print("=== RECENT STRATEGY CHANGES ===");
      strategyHistory.slice(-3).forEach((change) => {
        const time = new Date(change.timestamp).toLocaleTimeString();
        ns.print(`${time}: ${change.from} → ${change.to} (${change.reason})`);
      });
      ns.print("");
    }

    // Performance metrics
    if (
      moneyStatus.performanceHistory &&
      moneyStatus.performanceHistory.length > 0
    ) {
      ns.print("=== STRATEGY PERFORMANCE ===");
      const perfData = {};

      moneyStatus.performanceHistory.forEach((perf) => {
        if (!perfData[perf.strategy]) {
          perfData[perf.strategy] = { total: 0, count: 0, avg: 0 };
        }
        perfData[perf.strategy].total += perf.rate;
        perfData[perf.strategy].count++;
        perfData[perf.strategy].avg =
          perfData[perf.strategy].total / perfData[perf.strategy].count;
      });

      Object.entries(perfData).forEach(([strategy, data]) => {
        ns.print(
          `${strategy}: Avg ${formatMoney(data.avg)}/sec (${
            data.count
          } samples)`
        );
      });
      ns.print("");
    }

    // System warnings
    const warnings = [];
    if (moneyStatus.isStagnant) {
      warnings.push("💸 Money generation is stagnant");
    }
    if (moneyTracker.shouldChangeStrategy()) {
      warnings.push("🔄 Strategy change recommended");
    }
    if (moneyStatus.currentRate < 0) {
      warnings.push("📉 Negative money rate detected");
    }

    if (warnings.length > 0) {
      ns.print("=== WARNINGS ===");
      warnings.forEach((warning) => ns.print(warning));
      ns.print("");
    }

    lastMoney = currentMoney;

    if (continuous) {
      await ns.sleep(5000); // Update every 5 seconds
    }
  } while (continuous);
}
