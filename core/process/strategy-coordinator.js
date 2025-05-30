/**
 * strategy-coordinator.js - Strategy Change Coordination System
 * Handles strategy changes and coordinates updates across all system components
 */

import { getConfig } from "../config/system-config.js";
import { formatMoney } from "../utils/common.js";

/**
 * Strategy coordinator class that manages strategy changes across the system
 */
export class StrategyCoordinator {
  constructor(ns) {
    this.ns = ns;
    this.strategyFile = "/data/strategy-change.json";
    this.appliedStrategiesFile = "/data/applied-strategies.json";
    this.lastStrategyCheck = 0;
    this.currentStrategy = "balanced";
    this.appliedStrategies = this.loadAppliedStrategies();
  }

  /**
   * Load applied strategies history
   * @returns {Object} Applied strategies data
   */
  loadAppliedStrategies() {
    try {
      const data = this.ns.read(this.appliedStrategiesFile);
      return data
        ? JSON.parse(data)
        : { strategies: [], lastUpdate: Date.now() };
    } catch {
      return { strategies: [], lastUpdate: Date.now() };
    }
  }

  /**
   * Check for strategy changes and apply them
   * @returns {boolean} True if strategy was changed
   */
  checkAndApplyStrategyChanges() {
    try {
      if (!this.ns.fileExists(this.strategyFile)) {
        return false;
      }

      const strategyData = JSON.parse(this.ns.read(this.strategyFile));

      // Only process if this is a new strategy change
      if (strategyData.timestamp <= this.lastStrategyCheck) {
        return false;
      }

      this.lastStrategyCheck = strategyData.timestamp;

      if (strategyData.strategy !== this.currentStrategy) {
        this.ns.print(
          `🎯 Applying strategy change: ${this.currentStrategy} → ${strategyData.strategy}`
        );
        this.applyStrategyChange(strategyData);
        this.currentStrategy = strategyData.strategy;

        // Record the applied strategy
        this.recordAppliedStrategy(strategyData);

        return true;
      }
    } catch (error) {
      this.ns.print(`❌ Error checking strategy changes: ${error}`);
    }

    return false;
  }

  /**
   * Apply a strategy change to all system components
   * @param {Object} strategyData - Strategy change data
   */
  applyStrategyChange(strategyData) {
    const { strategy, reason, config } = strategyData;

    this.ns.print(`📋 Applying ${strategy} strategy (reason: ${reason})`);

    // Apply to resource manager
    this.updateResourceManagerStrategy(config);

    // Apply to server manager
    this.updateServerManagerStrategy(config);

    // Apply to worker coordination
    this.updateWorkerStrategy(config);

    // Update system coordination
    this.updateSystemCoordination(strategy, reason);

    this.ns.print(`✅ Strategy ${strategy} applied successfully`);
  }

  /**
   * Update resource manager with new strategy parameters
   * @param {Object} config - Strategy configuration
   */
  updateResourceManagerStrategy(config) {
    try {
      const resourceConfig = {
        moneyThreshold:
          config.moneyThreshold || getConfig("resources.moneyThreshold"),
        securityThreshold:
          config.securityThreshold || getConfig("resources.securityThreshold"),
        hackPercentPerCycle:
          config.hackPercentPerCycle ||
          getConfig("resources.hackPercentPerCycle"),
        workerDensity: config.workerDensity || 1.0,
        focusTopTargets: config.focusTopTargets || null,
        prioritizeHighValue: config.prioritizeHighValue !== false,
        timestamp: Date.now(),
      };

      this.ns.write(
        "/data/resource-strategy.json",
        JSON.stringify(resourceConfig),
        "w"
      );
      this.ns.print(`📊 Resource manager strategy updated`);

      // Signal resource manager to reload configuration
      if (this.ns.scriptRunning("/core/resource-manager/index.js", "home")) {
        this.sendCoordinationMessage(
          "resource_manager",
          "strategy_update",
          resourceConfig
        );
      }
    } catch (error) {
      this.ns.print(`❌ Failed to update resource manager strategy: ${error}`);
    }
  }

  /**
   * Update server manager with new strategy parameters
   * @param {Object} config - Strategy configuration
   */
  updateServerManagerStrategy(config) {
    try {
      const serverConfig = {
        aggressiveUpgrade: config.workerDensity > 1.1,
        conservativeUpgrade: config.workerDensity < 0.9,
        emergencyMode: config.focusTopTargets !== undefined,
        maxRamUtilization: config.workerDensity || 1.0,
        timestamp: Date.now(),
      };

      this.ns.write(
        "/data/server-strategy.json",
        JSON.stringify(serverConfig),
        "w"
      );
      this.ns.print(`🖥️ Server manager strategy updated`);

      // Signal server manager to adjust behavior
      if (this.ns.scriptRunning("/core/server-manager/index.js", "home")) {
        this.sendCoordinationMessage(
          "server_manager",
          "strategy_update",
          serverConfig
        );
      }
    } catch (error) {
      this.ns.print(`❌ Failed to update server manager strategy: ${error}`);
    }
  }

  /**
   * Update worker strategy and coordination
   * @param {Object} config - Strategy configuration
   */
  updateWorkerStrategy(config) {
    try {
      const workerConfig = {
        aggressiveHacking: config.hackPercentPerCycle > 0.3,
        conservativeHacking: config.hackPercentPerCycle < 0.2,
        emergencyMode: config.focusTopTargets !== undefined,
        securityTolerance: config.securityThreshold,
        moneyThreshold: config.moneyThreshold,
        workerDensityMultiplier: config.workerDensity || 1.0,
        focusTargets: config.focusTopTargets,
        timestamp: Date.now(),
      };

      this.ns.write(
        "/data/worker-strategy.json",
        JSON.stringify(workerConfig),
        "w"
      );
      this.ns.print(`👷 Worker strategy updated`);
    } catch (error) {
      this.ns.print(`❌ Failed to update worker strategy: ${error}`);
    }
  }

  /**
   * Update system coordination with strategy change
   * @param {string} strategy - New strategy name
   * @param {string} reason - Reason for change
   */
  updateSystemCoordination(strategy, reason) {
    try {
      const coordination = {
        currentStrategy: strategy,
        reason: reason,
        timestamp: Date.now(),
        systemwide: true,
      };

      this.ns.write(
        "/data/system-coordination.json",
        JSON.stringify(coordination),
        "w"
      );
      this.sendCoordinationMessage(
        "all_systems",
        "strategy_change",
        coordination
      );

      this.ns.print(`🔗 System coordination updated`);
    } catch (error) {
      this.ns.print(`❌ Failed to update system coordination: ${error}`);
    }
  }

  /**
   * Send coordination message to specific system component
   * @param {string} target - Target component
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  sendCoordinationMessage(target, type, data) {
    try {
      const message = {
        target: target,
        type: type,
        data: data,
        timestamp: Date.now(),
        sender: "strategy_coordinator",
      };

      // Write to component-specific files for better coordination
      const messageFile = `/data/messages-${target}.json`;

      let messages = [];
      if (this.ns.fileExists(messageFile)) {
        try {
          messages = JSON.parse(this.ns.read(messageFile));
        } catch {
          messages = [];
        }
      }

      messages.push(message);

      // Keep only last 20 messages per component
      if (messages.length > 20) {
        messages = messages.slice(-20);
      }

      this.ns.write(messageFile, JSON.stringify(messages), "w");
      this.ns.print(`📤 Message sent to ${target}: ${type}`);
    } catch (error) {
      this.ns.print(`❌ Failed to send coordination message: ${error}`);
    }
  }

  /**
   * Record applied strategy for history tracking
   * @param {Object} strategyData - Strategy data
   */
  recordAppliedStrategy(strategyData) {
    try {
      this.appliedStrategies.strategies.push({
        strategy: strategyData.strategy,
        reason: strategyData.reason,
        config: strategyData.config,
        appliedAt: Date.now(),
        moneyAtApplication: this.ns.getPlayer().money,
      });

      // Keep only last 50 applied strategies
      if (this.appliedStrategies.strategies.length > 50) {
        this.appliedStrategies.strategies.shift();
      }

      this.appliedStrategies.lastUpdate = Date.now();
      this.ns.write(
        this.appliedStrategiesFile,
        JSON.stringify(this.appliedStrategies),
        "w"
      );
    } catch (error) {
      this.ns.print(`❌ Failed to record applied strategy: ${error}`);
    }
  }

  /**
   * Get strategy effectiveness analysis
   * @returns {Object} Effectiveness analysis
   */
  getStrategyEffectiveness() {
    const strategies = this.appliedStrategies.strategies;
    if (strategies.length < 2) {
      return { insufficient_data: true };
    }

    const analysis = {};
    const strategyTypes = [
      "balanced",
      "aggressive",
      "conservative",
      "emergency",
    ];

    for (const strategyType of strategyTypes) {
      const strategyApplications = strategies.filter(
        (s) => s.strategy === strategyType
      );

      if (strategyApplications.length > 0) {
        let totalDuration = 0;
        let totalEarnings = 0;
        let applicationCount = strategyApplications.length;

        for (let i = 0; i < strategyApplications.length; i++) {
          const current = strategyApplications[i];
          const next =
            i < strategyApplications.length - 1
              ? strategyApplications[i + 1]
              : null;

          const duration = next
            ? next.appliedAt - current.appliedAt
            : Date.now() - current.appliedAt;
          const earnings = next
            ? next.moneyAtApplication - current.moneyAtApplication
            : this.ns.getPlayer().money - current.moneyAtApplication;

          totalDuration += duration;
          totalEarnings += Math.max(0, earnings); // Only count positive earnings
        }

        analysis[strategyType] = {
          applications: applicationCount,
          totalDuration: totalDuration,
          totalEarnings: totalEarnings,
          averageDuration: totalDuration / applicationCount,
          averageEarnings: totalEarnings / applicationCount,
          earningsRate:
            totalDuration > 0 ? (totalEarnings / totalDuration) * 1000 : 0, // $/sec
        };
      }
    }

    return analysis;
  }

  /**
   * Get recommended strategy based on historical performance
   * @returns {string} Recommended strategy
   */
  getRecommendedStrategy() {
    const effectiveness = this.getStrategyEffectiveness();

    if (effectiveness.insufficient_data) {
      return "balanced"; // Default when no data
    }

    let bestStrategy = "balanced";
    let bestRate = 0;

    for (const [strategy, stats] of Object.entries(effectiveness)) {
      if (stats.earningsRate > bestRate && stats.applications >= 2) {
        bestRate = stats.earningsRate;
        bestStrategy = strategy;
      }
    }

    return bestStrategy;
  }

  /**
   * Get current strategy status
   * @returns {Object} Strategy status
   */
  getStatus() {
    const effectiveness = this.getStrategyEffectiveness();
    const recommended = this.getRecommendedStrategy();

    return {
      currentStrategy: this.currentStrategy,
      recommendedStrategy: recommended,
      lastStrategyCheck: this.lastStrategyCheck,
      appliedStrategiesCount: this.appliedStrategies.strategies.length,
      effectiveness: effectiveness,
      isOptimal: this.currentStrategy === recommended,
    };
  }

  /**
   * Get formatted status for display
   * @returns {string} Formatted status
   */
  getFormattedStatus() {
    const status = this.getStatus();
    const effectiveness = status.effectiveness;

    let statusStr = `🎯 Strategy Coordinator Status:\n`;
    statusStr += `  Current Strategy: ${status.currentStrategy}\n`;
    statusStr += `  Recommended: ${status.recommendedStrategy}\n`;
    statusStr += `  Applied Strategies: ${status.appliedStrategiesCount}\n`;

    if (!effectiveness.insufficient_data) {
      statusStr += `  Strategy Performance:\n`;
      for (const [strategy, stats] of Object.entries(effectiveness)) {
        statusStr += `    ${strategy}: $${formatMoney(
          stats.earningsRate
        )}/sec (${stats.applications} uses)\n`;
      }
    }

    if (!status.isOptimal) {
      statusStr += `  💡 Consider switching to ${status.recommendedStrategy} strategy\n`;
    }

    return statusStr;
  }

  /**
   * Force a strategy change (for manual intervention)
   * @param {string} strategy - Strategy to apply
   * @param {string} reason - Reason for change
   */
  forceStrategyChange(strategy, reason = "manual_override") {
    const strategyData = {
      type: "strategy_change",
      strategy: strategy,
      reason: reason,
      timestamp: Date.now(),
      config: this.getStrategyConfig(strategy),
    };

    this.ns.write(this.strategyFile, JSON.stringify(strategyData), "w");
    this.ns.print(`🔧 Forced strategy change to ${strategy} (${reason})`);
  }

  /**
   * Get strategy configuration for a given strategy type
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
          moneyThreshold: 0.5,
          securityThreshold: 10,
          hackPercentPerCycle: 0.5,
          workerDensity: 1.2,
          prioritizeHighValue: true,
        };

      case "conservative":
        return {
          ...baseConfig,
          moneyThreshold: 0.9,
          securityThreshold: 2,
          hackPercentPerCycle: 0.1,
          workerDensity: 0.8,
          prioritizeHighValue: false,
        };

      case "emergency":
        return {
          ...baseConfig,
          moneyThreshold: 0.3,
          securityThreshold: 20,
          hackPercentPerCycle: 0.8,
          workerDensity: 1.5,
          focusTopTargets: 3,
          prioritizeHighValue: true,
        };

      default: // balanced
        return baseConfig;
    }
  }
}

/**
 * Create and return a StrategyCoordinator instance
 * @param {NS} ns - NetScript API
 * @returns {StrategyCoordinator} StrategyCoordinator instance
 */
export function createStrategyCoordinator(ns) {
  return new StrategyCoordinator(ns);
}
