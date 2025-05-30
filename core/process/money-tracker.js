/**
 * money-tracker.js - Money Generation Tracking and Strategy Management
 * Monitors money generation rates and triggers strategy changes when income stagnates
 */

import { getConfig } from "../config/system-config.js";
import { formatMoney } from "../utils/common.js";

/**
 * Money tracking and strategy management class
 */
export class MoneyTracker {
  constructor(ns) {
    this.ns = ns;
    this.trackingFile = "/data/money-tracking.json";
    this.strategyFile = "/data/strategy-state.json";

    // Configuration from system config
    this.config = {
      trackingInterval: getConfig("moneyTracking.interval", 10000), // 10 seconds
      sampleSize: getConfig("moneyTracking.sampleSize", 30), // Keep 30 samples (5 minutes)
      minRateThreshold: getConfig("moneyTracking.minRateThreshold", 1000), // $1k/sec minimum
      stagnationTime: getConfig("moneyTracking.stagnationTime", 300000), // 5 minutes
      strategyChangeThreshold: getConfig(
        "moneyTracking.strategyChangeThreshold",
        180000
      ), // 3 minutes
      recoveryTime: getConfig("moneyTracking.recoveryTime", 600000), // 10 minutes before retry
    };

    this.trackingData = this.loadTrackingData();
    this.strategyState = this.loadStrategyState();
  }

  /**
   * Load tracking data from file
   * @returns {Object} Tracking data
   */
  loadTrackingData() {
    try {
      const data = this.ns.read(this.trackingFile);
      return data ? JSON.parse(data) : this.getDefaultTrackingData();
    } catch {
      return this.getDefaultTrackingData();
    }
  }

  /**
   * Get default tracking data structure
   * @returns {Object} Default tracking data
   */
  getDefaultTrackingData() {
    return {
      samples: [],
      lastMoney: this.ns.getPlayer().money,
      lastUpdate: Date.now(),
      totalEarnings: 0,
      startTime: Date.now(),
      averageRate: 0,
      currentRate: 0,
      bestRate: 0,
      worstRate: 0,
      stagnationStart: null,
      lastPositiveEarnings: Date.now(),
    };
  }

  /**
   * Load strategy state from file
   * @returns {Object} Strategy state
   */
  loadStrategyState() {
    try {
      const data = this.ns.read(this.strategyFile);
      return data ? JSON.parse(data) : this.getDefaultStrategyState();
    } catch {
      return this.getDefaultStrategyState();
    }
  }

  /**
   * Get default strategy state
   * @returns {Object} Default strategy state
   */
  getDefaultStrategyState() {
    return {
      currentStrategy: "balanced", // balanced, aggressive, conservative, emergency
      lastStrategyChange: Date.now(),
      strategyChangeReason: "initial",
      strategiesTriedToday: ["balanced"],
      emergencyModeActive: false,
      emergencyModeStart: null,
      recoveryAttempts: 0,
      performanceHistory: [],
    };
  }

  /**
   * Update money tracking with current state
   */
  updateTracking() {
    const now = Date.now();
    const currentMoney = this.ns.getPlayer().money;
    const timeDiff = (now - this.trackingData.lastUpdate) / 1000; // seconds

    if (timeDiff > 0) {
      const moneyDiff = currentMoney - this.trackingData.lastMoney;
      const rate = moneyDiff / timeDiff; // $/second

      // Add new sample
      this.trackingData.samples.push({
        timestamp: now,
        money: currentMoney,
        rate: rate,
        timeDiff: timeDiff,
      });

      // Keep only recent samples
      if (this.trackingData.samples.length > this.config.sampleSize) {
        this.trackingData.samples.shift();
      }

      // Calculate statistics
      this.calculateStatistics();

      // Update tracking data
      this.trackingData.lastMoney = currentMoney;
      this.trackingData.lastUpdate = now;
      this.trackingData.totalEarnings += Math.max(0, moneyDiff);

      // Track positive earnings
      if (moneyDiff > 0) {
        this.trackingData.lastPositiveEarnings = now;
        if (this.trackingData.stagnationStart) {
          this.trackingData.stagnationStart = null; // Reset stagnation
        }
      } else if (!this.trackingData.stagnationStart && moneyDiff <= 0) {
        this.trackingData.stagnationStart = now; // Start tracking stagnation
      }

      this.saveTrackingData();
    }
  }

  /**
   * Calculate statistics from samples
   */
  calculateStatistics() {
    if (this.trackingData.samples.length === 0) return;

    const rates = this.trackingData.samples.map((s) => s.rate);
    const recentRates = rates.slice(-10); // Last 10 samples for current rate

    this.trackingData.currentRate =
      recentRates.reduce((a, b) => a + b, 0) / recentRates.length;
    this.trackingData.averageRate =
      rates.reduce((a, b) => a + b, 0) / rates.length;
    this.trackingData.bestRate = Math.max(...rates);
    this.trackingData.worstRate = Math.min(...rates);
  }

  /**
   * Check if money generation has stagnated
   * @returns {Object} Stagnation analysis
   */
  checkStagnation() {
    const now = Date.now();
    const timeSincePositiveEarnings =
      now - this.trackingData.lastPositiveEarnings;
    const isStagnant = timeSincePositiveEarnings > this.config.stagnationTime;
    const isLowRate =
      this.trackingData.currentRate < this.config.minRateThreshold;

    return {
      isStagnant,
      isLowRate,
      timeSincePositiveEarnings,
      stagnationDuration: this.trackingData.stagnationStart
        ? now - this.trackingData.stagnationStart
        : 0,
      needsStrategyChange:
        isStagnant ||
        (isLowRate &&
          timeSincePositiveEarnings > this.config.strategyChangeThreshold),
    };
  }

  /**
   * Trigger a strategy change based on current performance
   * @param {string} reason - Reason for strategy change
   * @returns {string} New strategy name
   */
  triggerStrategyChange(reason = "poor_performance") {
    const now = Date.now();
    const timeSinceLastChange = now - this.strategyState.lastStrategyChange;

    // Prevent strategy thrashing - wait at least recovery time between changes
    if (timeSinceLastChange < this.config.recoveryTime) {
      this.ns.print(
        `⏳ Strategy change cooldown active (${Math.floor(
          (this.config.recoveryTime - timeSinceLastChange) / 1000
        )}s remaining)`
      );
      return this.strategyState.currentStrategy;
    }

    // Record current strategy performance
    this.recordStrategyPerformance();

    // Determine next strategy
    const newStrategy = this.selectNextStrategy(reason);

    if (newStrategy !== this.strategyState.currentStrategy) {
      this.ns.print(
        `🔄 Strategy change: ${this.strategyState.currentStrategy} → ${newStrategy} (${reason})`
      );

      // Update strategy state
      this.strategyState.currentStrategy = newStrategy;
      this.strategyState.lastStrategyChange = now;
      this.strategyState.strategyChangeReason = reason;
      this.strategyState.recoveryAttempts++;

      // Track strategies tried today
      if (!this.strategyState.strategiesTriedToday.includes(newStrategy)) {
        this.strategyState.strategiesTriedToday.push(newStrategy);
      }

      // Reset daily strategies if it's a new day
      const daysSinceLastChange =
        (now - this.strategyState.lastStrategyChange) / (24 * 60 * 60 * 1000);
      if (daysSinceLastChange > 1) {
        this.strategyState.strategiesTriedToday = [newStrategy];
        this.strategyState.recoveryAttempts = 0;
      }

      this.saveStrategyState();
      this.applyStrategy(newStrategy, reason);
    }

    return newStrategy;
  }

  /**
   * Record performance of current strategy
   */
  recordStrategyPerformance() {
    const performance = {
      strategy: this.strategyState.currentStrategy,
      duration: Date.now() - this.strategyState.lastStrategyChange,
      averageRate: this.trackingData.averageRate,
      bestRate: this.trackingData.bestRate,
      totalEarnings: this.trackingData.totalEarnings,
      timestamp: Date.now(),
    };

    this.strategyState.performanceHistory.push(performance);

    // Keep only last 20 performance records
    if (this.strategyState.performanceHistory.length > 20) {
      this.strategyState.performanceHistory.shift();
    }
  }

  /**
   * Select the next strategy based on current situation and history
   * @param {string} reason - Reason for strategy change
   * @returns {string} Next strategy name
   */
  selectNextStrategy(reason) {
    const strategies = ["balanced", "aggressive", "conservative", "emergency"];
    const current = this.strategyState.currentStrategy;
    const tried = this.strategyState.strategiesTriedToday;

    // Emergency mode if we've tried multiple strategies and still failing
    if (
      this.strategyState.recoveryAttempts >= 3 &&
      !tried.includes("emergency")
    ) {
      return "emergency";
    }

    // If in emergency mode and things aren't improving, try conservative
    if (current === "emergency" && reason === "poor_performance") {
      return "conservative";
    }

    // Strategy progression based on performance
    switch (current) {
      case "balanced":
        // Try aggressive if stagnant, conservative if low performance
        return this.trackingData.currentRate < this.config.minRateThreshold / 2
          ? "conservative"
          : "aggressive";

      case "aggressive":
        // Scale back to balanced or conservative
        return tried.includes("conservative") ? "balanced" : "conservative";

      case "conservative":
        // Try emergency if conservative isn't working
        return tried.includes("emergency") ? "balanced" : "emergency";

      case "emergency":
        // Cycle back to balanced after emergency
        return "balanced";

      default:
        return "balanced";
    }
  }

  /**
   * Apply the selected strategy by coordinating with other systems
   * @param {string} strategy - Strategy to apply
   * @param {string} reason - Reason for change
   */
  applyStrategy(strategy, reason) {
    this.ns.print(`🎯 Applying ${strategy} strategy due to ${reason}`);

    // Send coordination messages to other systems
    const message = {
      type: "strategy_change",
      strategy: strategy,
      reason: reason,
      timestamp: Date.now(),
      config: this.getStrategyConfig(strategy),
    };

    // Write strategy change to coordination file
    try {
      this.ns.write("/data/strategy-change.json", JSON.stringify(message), "w");
      this.ns.print(`📤 Strategy change message sent to all systems`);
    } catch (error) {
      this.ns.print(`❌ Failed to send strategy change message: ${error}`);
    }
  }

  /**
   * Get configuration parameters for a specific strategy
   * @param {string} strategy - Strategy name
   * @returns {Object} Strategy configuration
   */
  getStrategyConfig(strategy) {
    const baseConfig = {
      moneyThreshold: getConfig("resources.moneyThreshold"),
      securityThreshold: getConfig("resources.securityThreshold"),
      hackPercentPerCycle: getConfig("resources.hackPercentPerCycle"),
    };

    switch (strategy) {
      case "aggressive":
        return {
          ...baseConfig,
          moneyThreshold: 0.5, // Hack with less money
          securityThreshold: 10, // Tolerate more security
          hackPercentPerCycle: 0.5, // Hack more per cycle
          workerDensity: 1.2, // 20% more workers
        };

      case "conservative":
        return {
          ...baseConfig,
          moneyThreshold: 0.9, // Wait for more money
          securityThreshold: 2, // Be more strict about security
          hackPercentPerCycle: 0.1, // Hack less per cycle
          workerDensity: 0.8, // 20% fewer workers
        };

      case "emergency":
        return {
          ...baseConfig,
          moneyThreshold: 0.3, // Hack with minimal money
          securityThreshold: 20, // Ignore security concerns
          hackPercentPerCycle: 0.8, // Hack aggressively
          workerDensity: 1.5, // 50% more workers
          focusTopTargets: 3, // Focus only on top 3 targets
        };

      default: // balanced
        return baseConfig;
    }
  }

  /**
   * Get current tracking status
   * @returns {Object} Status summary
   */
  getStatus() {
    const stagnation = this.checkStagnation();
    const now = Date.now();

    return {
      currentMoney: this.ns.getPlayer().money,
      currentRate: this.trackingData.currentRate,
      averageRate: this.trackingData.averageRate,
      totalEarnings: this.trackingData.totalEarnings,
      uptime: Math.floor((now - this.trackingData.startTime) / 1000),
      samplesCollected: this.trackingData.samples.length,
      stagnation: stagnation,
      strategy: this.strategyState.currentStrategy,
      timeSinceStrategyChange: Math.floor(
        (now - this.strategyState.lastStrategyChange) / 1000
      ),
      strategiesTriedToday: this.strategyState.strategiesTriedToday,
      recoveryAttempts: this.strategyState.recoveryAttempts,
    };
  }

  /**
   * Get formatted status string for display
   * @returns {string} Formatted status
   */
  getFormattedStatus() {
    const status = this.getStatus();
    const stagnation = status.stagnation;

    let statusStr = `💰 Money Tracker Status:\n`;
    statusStr += `  Current: $${formatMoney(status.currentMoney)}\n`;
    statusStr += `  Rate: $${formatMoney(
      status.currentRate
    )}/sec (avg: $${formatMoney(status.averageRate)}/sec)\n`;
    statusStr += `  Total Earned: $${formatMoney(status.totalEarnings)}\n`;
    statusStr += `  Strategy: ${status.strategy} (${status.timeSinceStrategyChange}s ago)\n`;

    if (stagnation.isStagnant) {
      statusStr += `  ⚠️ STAGNANT: ${Math.floor(
        stagnation.timeSincePositiveEarnings / 1000
      )}s since positive earnings\n`;
    }

    if (stagnation.needsStrategyChange) {
      statusStr += `  🔄 Strategy change recommended\n`;
    }

    return statusStr;
  }

  /**
   * Save tracking data to file
   */
  saveTrackingData() {
    try {
      this.ns.write(this.trackingFile, JSON.stringify(this.trackingData), "w");
    } catch (error) {
      this.ns.print(`❌ Failed to save tracking data: ${error}`);
    }
  }

  /**
   * Save strategy state to file
   */
  saveStrategyState() {
    try {
      this.ns.write(this.strategyFile, JSON.stringify(this.strategyState), "w");
    } catch (error) {
      this.ns.print(`❌ Failed to save strategy state: ${error}`);
    }
  }

  /**
   * Reset tracking data (useful for testing or after major system changes)
   */
  resetTracking() {
    this.trackingData = this.getDefaultTrackingData();
    this.saveTrackingData();
    this.ns.print("🔄 Money tracking data reset");
  }

  /**
   * Reset strategy state
   */
  resetStrategy() {
    this.strategyState = this.getDefaultStrategyState();
    this.saveStrategyState();
    this.ns.print("🔄 Strategy state reset");
  }
}

/**
 * Create and return a MoneyTracker instance
 * @param {NS} ns - NetScript API
 * @returns {MoneyTracker} MoneyTracker instance
 */
export function createMoneyTracker(ns) {
  return new MoneyTracker(ns);
}
