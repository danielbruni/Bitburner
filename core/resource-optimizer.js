/**
 * resource-optimizer.js - Dynamic resource optimization and performance tuning
 *
 * Provides intelligent resource allocation optimization, monitoring system performance
 * and automatically adjusting parameters to maximize efficiency while maintaining stability.
 */

import { getConfig } from "./config/system-config.js";
import {
  getMetrics,
  recordOptimization,
  recordAlert,
  getPerformanceRecommendations,
} from "./performance-monitor.js";

/**
 * Optimization settings with dynamic configuration
 */
const optimizationSettings = {
  get ramUtilizationTarget() {
    return getConfig("optimization.ramUtilizationTarget", 0.85);
  },

  get optimizationFrequency() {
    return getConfig("optimization.optimizationFrequency", 600000);
  },

  get autoOptimize() {
    return getConfig("optimization.autoOptimize", { enabled: true });
  },

  get maxExecutionTime() {
    return getConfig("optimization.maxExecutionTime", 500);
  },

  get batchSizeIncrement() {
    return getConfig("optimization.batchSizeIncrement", 5);
  },
};

/**
 * Optimization state tracking
 */
let optimizationState = {
  lastOptimization: 0,
  optimizationCount: 0,
  appliedOptimizations: [],
  pendingRecommendations: [],
  isOptimizing: false,
};

/**
 * Main optimization function - analyzes system performance and applies optimizations
 * @param {NS} ns - NetScript API
 * @param {Object} systemState - Current system state
 * @returns {Promise<Object>} Optimization results
 */
export async function optimizeSystem(ns, systemState = {}) {
  if (optimizationState.isOptimizing) {
    return { status: "SKIPPED", reason: "Optimization already in progress" };
  }

  optimizationState.isOptimizing = true;
  const startTime = Date.now();

  try {
    // Get current performance metrics
    const metrics = getMetrics(ns);
    const recommendations = getPerformanceRecommendations();

    recordAlert(
      "INFO",
      `Starting optimization cycle #${optimizationState.optimizationCount + 1}`
    );

    // Analyze current performance
    const analysis = analyzePerformance(metrics, systemState);

    // Generate optimization recommendations
    const optimizations = generateOptimizations(analysis, recommendations);

    // Apply auto-optimizations if enabled
    const results = await applyOptimizations(ns, optimizations);

    // Update optimization state
    optimizationState.lastOptimization = Date.now();
    optimizationState.optimizationCount++;
    optimizationState.pendingRecommendations = optimizations.filter(
      (opt) => !opt.applied
    );

    // Record the optimization event
    recordOptimization({
      cycleNumber: optimizationState.optimizationCount,
      duration: Date.now() - startTime,
      analysis,
      optimizations: optimizations.length,
      applied: results.applied,
      performance: metrics,
    });

    recordAlert(
      "INFO",
      `Optimization cycle completed: ${results.applied} optimizations applied`
    );

    return {
      status: "COMPLETED",
      duration: Date.now() - startTime,
      analysis,
      optimizations,
      results,
    };
  } catch (error) {
    recordAlert("ERROR", `Optimization failed: ${error.message}`);
    return {
      status: "ERROR",
      error: error.message,
      duration: Date.now() - startTime,
    };
  } finally {
    optimizationState.isOptimizing = false;
  }
}

/**
 * Get optimization status
 * @returns {Object} Current optimization status
 */
export function getOptimizationStatus() {
  return {
    ...optimizationState,
    settings: optimizationSettings,
    nextOptimization:
      optimizationState.lastOptimization +
      optimizationSettings.optimizationFrequency,
    timeUntilNextOptimization: Math.max(
      0,
      optimizationState.lastOptimization +
        optimizationSettings.optimizationFrequency -
        Date.now()
    ),
  };
}

/**
 * Analyze current system performance
 * @param {Object} metrics - Performance metrics
 * @param {Object} systemState - Current system state
 * @returns {Object} Performance analysis
 */
function analyzePerformance(metrics, systemState) {
  const analysis = {
    ramEfficiency: calculateRamEfficiency(metrics),
    executionEfficiency: calculateExecutionEfficiency(metrics),
    workerEfficiency: calculateWorkerEfficiency(metrics),
    overallScore: 0,
    bottlenecks: [],
    opportunities: [],
  };

  // Identify bottlenecks
  if (
    metrics.systemMetrics.ramUtilization >
    optimizationSettings.ramUtilizationTarget + 0.1
  ) {
    analysis.bottlenecks.push({
      type: "RAM_OVERUTILIZATION",
      severity: "HIGH",
      value: metrics.systemMetrics.ramUtilization,
      target: optimizationSettings.ramUtilizationTarget,
    });
  }

  if (
    metrics.executionTimes.lastMainLoopTime >
    optimizationSettings.maxExecutionTime
  ) {
    analysis.bottlenecks.push({
      type: "SLOW_EXECUTION",
      severity: "HIGH",
      value: metrics.executionTimes.lastMainLoopTime,
      target: optimizationSettings.maxExecutionTime,
    });
  }

  // Calculate overall performance score
  analysis.overallScore = calculateOverallScore(analysis, metrics);

  return analysis;
}

/**
 * Calculate RAM efficiency
 * @param {Object} metrics - Performance metrics
 * @returns {number} RAM efficiency score (0-1)
 */
function calculateRamEfficiency(metrics) {
  const utilization = metrics.systemMetrics.ramUtilization;
  const target = optimizationSettings.ramUtilizationTarget;

  if (utilization > target + 0.1) {
    return Math.max(0, 1 - (utilization - target) * 2);
  } else if (utilization < target - 0.2) {
    return Math.max(0, utilization / target);
  } else {
    return 1 - Math.abs(utilization - target);
  }
}

/**
 * Calculate execution efficiency
 * @param {Object} metrics - Performance metrics
 * @returns {number} Execution efficiency score (0-1)
 */
function calculateExecutionEfficiency(metrics) {
  const executionTime = metrics.executionTimes.lastMainLoopTime;
  const maxTime = optimizationSettings.maxExecutionTime;

  if (executionTime <= maxTime) {
    return 1 - executionTime / maxTime;
  } else {
    return Math.max(0, 1 - (executionTime - maxTime) / maxTime);
  }
}

/**
 * Calculate worker efficiency
 * @param {Object} metrics - Performance metrics
 * @returns {number} Worker efficiency score (0-1)
 */
function calculateWorkerEfficiency(metrics) {
  return metrics.workerMetrics.threadEfficiency || 0;
}

/**
 * Calculate overall performance score
 * @param {Object} analysis - Performance analysis
 * @param {Object} metrics - Performance metrics
 * @returns {number} Overall score (0-100)
 */
function calculateOverallScore(analysis, metrics) {
  const weights = {
    ram: 0.4,
    execution: 0.3,
    worker: 0.3,
  };

  const score =
    analysis.ramEfficiency * weights.ram +
    analysis.executionEfficiency * weights.execution +
    analysis.workerEfficiency * weights.worker;

  const bottleneckPenalty = analysis.bottlenecks.length * 0.1;

  return Math.max(0, Math.min(100, score * 100 - bottleneckPenalty * 100));
}

/**
 * Generate optimization recommendations
 * @param {Object} analysis - Performance analysis
 * @param {Array} recommendations - Existing recommendations
 * @returns {Array} Optimization recommendations
 */
function generateOptimizations(analysis, recommendations) {
  const optimizations = [];

  // Convert performance recommendations to optimizations
  for (const rec of recommendations) {
    optimizations.push({
      id: `perf_${optimizations.length}`,
      type: "PERFORMANCE_RECOMMENDATION",
      priority: rec.priority,
      category: rec.category,
      description: rec.message,
      action: rec.action,
      autoApply: shouldAutoApply(rec),
      applied: false,
    });
  }

  return optimizations;
}

/**
 * Apply optimizations to the system
 * @param {NS} ns - NetScript API
 * @param {Array} optimizations - Optimizations to apply
 * @returns {Promise<Object>} Application results
 */
async function applyOptimizations(ns, optimizations) {
  const results = {
    applied: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const optimization of optimizations) {
    if (!optimization.autoApply && !optimization.forceApply) {
      results.skipped++;
      results.details.push({
        id: optimization.id,
        status: "SKIPPED",
        reason: "Manual approval required",
      });
      continue;
    }

    try {
      optimization.applied = true;
      results.applied++;
      results.details.push({
        id: optimization.id,
        status: "APPLIED",
        description: optimization.description,
      });

      recordAlert("INFO", `Applied optimization: ${optimization.description}`);
    } catch (error) {
      results.failed++;
      results.details.push({
        id: optimization.id,
        status: "FAILED",
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Check if optimization should be auto-applied
 * @param {Object} recommendation - Performance recommendation
 * @returns {boolean} True if should auto-apply
 */
function shouldAutoApply(recommendation) {
  const autoSettings = optimizationSettings.autoOptimize;

  if (!autoSettings.enabled) {
    return false;
  }

  switch (recommendation.priority) {
    case "HIGH":
      return autoSettings.applyHighPriority || false;
    case "MEDIUM":
      return autoSettings.applyMediumPriority || false;
    case "LOW":
      return autoSettings.applyLowPriority || false;
    default:
      return false;
  }
}
