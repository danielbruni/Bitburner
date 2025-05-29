/**
 * performance-monitor.js - System performance monitoring and metrics collection
 *
 * Provides centralized performance tracking for the Bitburner automation system,
 * monitoring RAM usage, execution times, worker efficiency, and system health.
 */

import { getConfig } from "./config/system-config.js";

/**
 * Performance data storage
 */
let performanceData = {
  systemMetrics: {
    totalRamUsed: 0,
    totalRamAvailable: 0,
    ramUtilization: 0,
    activeWorkers: 0,
    activeProcesses: 0,
    lastUpdate: Date.now(),
  },

  executionTimes: {
    lastMainLoopTime: 0,
    averageMainLoopTime: 0,
    maxMainLoopTime: 0,
    apiCallsPerSecond: 0,
    lastUpdateTime: Date.now(),
  },

  workerMetrics: {
    totalThreads: 0,
    activeThreads: 0,
    threadEfficiency: 0,
    completedTasks: 0,
    failedTasks: 0,
    lastWorkerUpdate: Date.now(),
  },

  optimizationHistory: [],

  alerts: [],
};

/**
 * Get current system performance metrics
 * @param {NS} ns - NetScript API
 * @returns {Object} Current performance metrics
 */
export function getMetrics(ns = null) {
  if (ns) {
    updateSystemMetrics(ns);
  }

  return {
    ...performanceData,
    timestamp: Date.now(),
    uptime: Date.now() - performanceData.systemMetrics.lastUpdate,
  };
}

/**
 * Update system metrics with current data
 * @param {NS} ns - NetScript API
 */
function updateSystemMetrics(ns) {
  try {
    const now = Date.now();

    // Update system metrics
    const homeRam = ns.getServerMaxRam("home");
    const homeRamUsed = ns.getServerUsedRam("home");

    performanceData.systemMetrics = {
      totalRamUsed: homeRamUsed,
      totalRamAvailable: homeRam,
      ramUtilization: homeRam > 0 ? homeRamUsed / homeRam : 0,
      activeWorkers: getActiveWorkerCount(ns),
      activeProcesses: getActiveProcessCount(ns),
      lastUpdate: now,
    };

    // Update API call tracking
    updateApiCallTracking();
  } catch (error) {
    recordAlert("ERROR", `Failed to update system metrics: ${error.message}`);
  }
}

/**
 * Record execution time for performance tracking
 * @param {string} operation - Name of the operation
 * @param {number} executionTime - Time taken in milliseconds
 */
export function recordExecutionTime(operation, executionTime) {
  const now = Date.now();

  if (operation === "mainLoop") {
    performanceData.executionTimes.lastMainLoopTime = executionTime;

    // Update average (simple moving average)
    if (performanceData.executionTimes.averageMainLoopTime === 0) {
      performanceData.executionTimes.averageMainLoopTime = executionTime;
    } else {
      performanceData.executionTimes.averageMainLoopTime =
        performanceData.executionTimes.averageMainLoopTime * 0.9 +
        executionTime * 0.1;
    }

    // Update max
    if (executionTime > performanceData.executionTimes.maxMainLoopTime) {
      performanceData.executionTimes.maxMainLoopTime = executionTime;
    }

    performanceData.executionTimes.lastUpdateTime = now;

    // Check for performance alerts
    checkExecutionTimeAlerts(executionTime);
  }
}

/**
 * Record worker operation metrics
 * @param {Object} workerStats - Worker statistics
 */
export function recordWorkerMetrics(workerStats) {
  const now = Date.now();

  performanceData.workerMetrics = {
    totalThreads: workerStats.totalThreads || 0,
    activeThreads: workerStats.activeThreads || 0,
    threadEfficiency: workerStats.efficiency || 0,
    completedTasks:
      (performanceData.workerMetrics.completedTasks || 0) +
      (workerStats.completed || 0),
    failedTasks:
      (performanceData.workerMetrics.failedTasks || 0) +
      (workerStats.failed || 0),
    lastWorkerUpdate: now,
  };
}

/**
 * Record optimization event
 * @param {Object} optimizationEvent - Optimization event data
 */
export function recordOptimization(optimizationEvent) {
  const maxHistory = getConfig("optimization.maxHistoryPoints", 100);

  performanceData.optimizationHistory.push({
    ...optimizationEvent,
    timestamp: Date.now(),
  });

  // Keep only the most recent events
  if (performanceData.optimizationHistory.length > maxHistory) {
    performanceData.optimizationHistory =
      performanceData.optimizationHistory.slice(-maxHistory);
  }
}

/**
 * Record system alert
 * @param {string} level - Alert level (INFO, WARN, ERROR)
 * @param {string} message - Alert message
 */
export function recordAlert(level, message) {
  const maxAlerts = 50;

  performanceData.alerts.push({
    level,
    message,
    timestamp: Date.now(),
  });

  // Keep only recent alerts
  if (performanceData.alerts.length > maxAlerts) {
    performanceData.alerts = performanceData.alerts.slice(-maxAlerts);
  }
}

/**
 * Get performance recommendations based on current metrics
 * @returns {Array} Array of recommendation objects
 */
export function getPerformanceRecommendations() {
  const recommendations = [];
  const metrics = performanceData;

  // RAM utilization recommendations
  const ramTarget = getConfig("optimization.ramUtilizationTarget", 0.85);
  if (metrics.systemMetrics.ramUtilization > ramTarget + 0.1) {
    recommendations.push({
      priority: "HIGH",
      category: "RAM",
      message: `RAM utilization (${(
        metrics.systemMetrics.ramUtilization * 100
      ).toFixed(1)}%) exceeds target (${ramTarget * 100}%)`,
      action: "Consider reducing worker threads or upgrading servers",
    });
  } else if (metrics.systemMetrics.ramUtilization < ramTarget - 0.2) {
    recommendations.push({
      priority: "MEDIUM",
      category: "RAM",
      message: `RAM utilization (${(
        metrics.systemMetrics.ramUtilization * 100
      ).toFixed(1)}%) is well below target (${ramTarget * 100}%)`,
      action: "Consider increasing worker threads or batch sizes",
    });
  }

  // Execution time recommendations
  const maxExecutionTime = getConfig("optimization.maxExecutionTime", 500);
  if (metrics.executionTimes.lastMainLoopTime > maxExecutionTime) {
    recommendations.push({
      priority: "HIGH",
      category: "PERFORMANCE",
      message: `Main loop execution time (${metrics.executionTimes.lastMainLoopTime}ms) exceeds limit (${maxExecutionTime}ms)`,
      action: "Optimize main loop or reduce operation frequency",
    });
  }

  // Worker efficiency recommendations
  if (metrics.workerMetrics.threadEfficiency < 0.7) {
    recommendations.push({
      priority: "MEDIUM",
      category: "WORKERS",
      message: `Worker efficiency (${(
        metrics.workerMetrics.threadEfficiency * 100
      ).toFixed(1)}%) is below optimal`,
      action: "Review worker allocation and target selection",
    });
  }

  return recommendations;
}

/**
 * Get system health status
 * @returns {Object} Health status object
 */
export function getSystemHealth() {
  const metrics = performanceData;
  const recommendations = getPerformanceRecommendations();

  let healthScore = 100;
  let status = "HEALTHY";

  // Reduce health based on issues
  const highPriorityIssues = recommendations.filter(
    (r) => r.priority === "HIGH"
  ).length;
  const mediumPriorityIssues = recommendations.filter(
    (r) => r.priority === "MEDIUM"
  ).length;

  healthScore -= highPriorityIssues * 20 + mediumPriorityIssues * 10;

  if (healthScore < 60) {
    status = "CRITICAL";
  } else if (healthScore < 80) {
    status = "WARNING";
  }

  return {
    status,
    healthScore: Math.max(0, healthScore),
    recommendations,
    lastUpdate: Date.now(),
  };
}

/**
 * Get active worker count
 * @param {NS} ns - NetScript API
 * @returns {number} Number of active workers
 */
function getActiveWorkerCount(ns) {
  try {
    const processes = ns.ps();
    return processes.filter((p) => p.filename.includes("worker")).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Get active process count
 * @param {NS} ns - NetScript API
 * @returns {number} Number of active processes
 */
function getActiveProcessCount(ns) {
  try {
    return ns.ps().length;
  } catch (error) {
    return 0;
  }
}

/**
 * Update API call tracking
 */
function updateApiCallTracking() {
  // Simple API call rate tracking - would need more sophisticated implementation
  // in a real scenario to track actual NS function calls
  const now = Date.now();
  const timeDiff = now - performanceData.executionTimes.lastUpdateTime;

  if (timeDiff > 0) {
    // Estimate based on typical operations per loop
    const estimatedCalls = 20; // Rough estimate
    performanceData.executionTimes.apiCallsPerSecond =
      (estimatedCalls / timeDiff) * 1000;
  }
}

/**
 * Check for execution time alerts
 * @param {number} executionTime - Current execution time
 */
function checkExecutionTimeAlerts(executionTime) {
  const alertThreshold = getConfig(
    "optimization.executionTimeAlertThreshold",
    1.5
  );
  const averageTime = performanceData.executionTimes.averageMainLoopTime;

  if (averageTime > 0 && executionTime > averageTime * alertThreshold) {
    recordAlert(
      "WARN",
      `Execution time (${executionTime}ms) significantly higher than average (${averageTime.toFixed(
        1
      )}ms)`
    );
  }
}

/**
 * Reset performance data (useful for testing)
 */
export function resetPerformanceData() {
  performanceData = {
    systemMetrics: {
      totalRamUsed: 0,
      totalRamAvailable: 0,
      ramUtilization: 0,
      activeWorkers: 0,
      activeProcesses: 0,
      lastUpdate: Date.now(),
    },

    executionTimes: {
      lastMainLoopTime: 0,
      averageMainLoopTime: 0,
      maxMainLoopTime: 0,
      apiCallsPerSecond: 0,
      lastUpdateTime: Date.now(),
    },

    workerMetrics: {
      totalThreads: 0,
      activeThreads: 0,
      threadEfficiency: 0,
      completedTasks: 0,
      failedTasks: 0,
      lastWorkerUpdate: Date.now(),
    },

    optimizationHistory: [],
    alerts: [],
  };
}

/**
 * Export performance data to file
 * @param {NS} ns - NetScript API
 * @param {string} filename - File to export to
 */
export function exportPerformanceData(
  ns,
  filename = "/data/performance-export.json"
) {
  try {
    const exportData = {
      ...performanceData,
      exportTime: Date.now(),
      systemConfig: {
        ramTarget: getConfig("optimization.ramUtilizationTarget"),
        maxExecutionTime: getConfig("optimization.maxExecutionTime"),
        monitoringInterval: getConfig("debug.monitoringInterval"),
      },
    };

    ns.write(filename, JSON.stringify(exportData, null, 2), "w");
    recordAlert("INFO", `Performance data exported to ${filename}`);
    return true;
  } catch (error) {
    recordAlert("ERROR", `Failed to export performance data: ${error.message}`);
    return false;
  }
}
