/**
 * system-config.js - Centralized configuration management for the Bitburner hacking system
 *
 * This module provides a centralized location for all configuration values,
 * making parameter tuning easier and eliminating scattered hard-coded values.
 */

/**
 * Core system configuration
 */
export const SYSTEM_CONFIG = {
  // ======== MAIN PROCESS SETTINGS ========
  processes: {
    targetUpdateInterval: 60000, // How often to reassess targets (ms)
    serverUpdateInterval: 10000, // How often to scan for new servers (ms)
    healthCheckInterval: 5000, // How often to check process health (ms)
    fileCopyInterval: 300000, // How often to copy files to servers (ms)
    maxDataAge: 10000, // Max age for server data before refresh (ms)
    maxTargetAge: 60000, // Max age for target data before refresh (ms)
    statusOutputInterval: 30000, // How often to output system status (ms)
    processRestartDelay: 500, // Delay after restarting a process (ms)
    emergencyRestartDelay: 5000, // Delay after emergency system restart (ms)
    healthDataFile: "/data/process-health.json", // File to store process health data
  },

  // ======== RESOURCE ALLOCATION ========
  resources: {
    homeReservedRam: 20, // GB of RAM to reserve on home server
    moneyThreshold: 0.75, // Hack when server has this much money (75%)
    securityThreshold: 5, // Extra security above minimum to tolerate
    hackPercentPerCycle: 0.25, // Max percentage of money to hack per cycle
    growthMoneyThreshold: 0.75, // Minimum money percentage before growing
    minimumWorkerRam: 1.75, // Minimum RAM required per worker thread (GB)
  },

  // ======== SERVER CATEGORIZATION ========
  serverCategories: {
    tiny: { maxRam: 8, minRam: 0 }, // <8GB RAM
    small: { maxRam: 32, minRam: 8 }, // 8-32GB RAM
    medium: { maxRam: 128, minRam: 32 }, // 32-128GB RAM
    large: { maxRam: 512, minRam: 128 }, // 128-512GB RAM
    huge: { maxRam: Infinity, minRam: 512 }, // >512GB RAM
  },

  // ======== WORKER OPTIMIZATION ========
  workers: {
    maxThreadsPerChunk: 10000, // Max threads per chunk for large servers
    largeServerThreshold: 1024, // GB threshold for large server optimization
    chunkLaunchDelay: 50, // Delay between launching worker chunks (ms)
  },

  // ======== DEBUGGING & MONITORING ========
  debug: {
    logLevel: 1, // 0: minimal, 1: normal, 2: verbose
    enablePerformanceTracking: true,
    enableWorkerMonitoring: true,
    enableResourceMonitoring: true,
    monitoringInterval: 60000, // How often to collect monitoring data (ms)
    maxLogHistory: 100, // Maximum number of log entries to keep
    earningsMonitorUpdateInterval: 2000, // Update interval for earnings monitor (ms)
    earningsMonitorSampleSize: 30, // Number of samples to keep for rate calculation
    earningsMonitorMinSamples: 5, // Minimum samples before showing rate
    healthCheckMinWorkers: 2, // Minimum workers before RAM warning
    healthCheckHomeRamThreshold: 50, // Home RAM threshold for warnings (GB)
  },

  // ======== FACTION & MILESTONES ========
  factions: {
    requiredHackingLevels: {
      CSEC: 50,
      "avmnite-02h": 202,
      "I.I.I.I": 300,
      run4theh111z: 505,
    },
    backdoorPriority: ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"],
  },

  // ======== SERVER MANAGEMENT ========
  serverManagement: {
    autoUpgradeServers: false, // Whether to automatically upgrade servers
    upgradeRamMultiplier: 2, // Only upgrade if we can afford this multiplier of current RAM
    defaultNewServerRam: 8, // Default RAM for new servers (GB)
  },

  // ======== TASK BALANCING ========
  taskBalancing: {
    weakenRatio: 0.3, // Ideal ratio of weaken tasks
    growRatio: 0.4, // Ideal ratio of grow tasks
    hackRatio: 0.3, // Ideal ratio of hack tasks
    priorityWeights: {
      money: 0.4, // Weight for money potential
      security: 0.3, // Weight for security level
      hackingLevel: 0.2, // Weight for required hacking level
      growth: 0.1, // Weight for growth factor
    },
  },

  // ======== FILE PATHS ========
  files: {
    serversDataFile: "/data/servers.json",
    targetsDataFile: "/data/targets.json",
    processHealthFile: "/data/process-health.json",
    userConfigFile: "/data/user-config.json",
  },

  // ======== FILE PATHS (Legacy - for compatibility) ========
  paths: {
    serverData: "/data/servers.json",
    targetData: "/data/targets.json",
    workerScript: "/core/workers/worker.js",
    serverManager: "/core/server-manager/index.js",
    resourceManager: "/core/resource-manager/index.js",
    mainScript: "/main.js",
  },

  // ======== SAFETY LIMITS ========
  limits: {
    maxRestartAttempts: 3, // Max process restart attempts before giving up
    maxMemoryUsage: 0.95, // Max memory usage before warning (95%)
    minFreeRam: 1, // Minimum free RAM to maintain (GB)
    maxProcessAge: 3600000, // Max age for processes before restart (ms)
    emergencyStopThreshold: 0.98, // Stop all operations if RAM usage exceeds this
  },
};

/**
 * Get a configuration value using dot notation
 * @param {string} path - Configuration path (e.g., "resources.homeReservedRam")
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 */
export function getConfig(path, defaultValue = null) {
  const parts = path.split(".");
  let value = SYSTEM_CONFIG;

  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = value[part];
    } else {
      return defaultValue;
    }
  }

  return value;
}

/**
 * Set a configuration value using dot notation
 * @param {string} path - Configuration path (e.g., "resources.homeReservedRam")
 * @param {*} newValue - New value to set
 * @returns {boolean} True if successfully set, false otherwise
 */
export function setConfig(path, newValue) {
  const parts = path.split(".");
  const lastPart = parts.pop();
  let target = SYSTEM_CONFIG;

  for (const part of parts) {
    if (target && typeof target === "object" && part in target) {
      target = target[part];
    } else {
      return false; // Path doesn't exist
    }
  }

  if (target && typeof target === "object") {
    target[lastPart] = newValue;
    return true;
  }

  return false;
}

/**
 * Get all configuration values for a specific category
 * @param {string} category - Configuration category (e.g., "resources", "workers")
 * @returns {Object} All configuration values for the category
 */
export function getCategoryConfig(category) {
  return SYSTEM_CONFIG[category] || {};
}

/**
 * Validate configuration values to ensure they're within acceptable ranges
 * @returns {Array} Array of validation errors (empty if all valid)
 */
export function validateConfig() {
  const errors = [];

  // Validate numeric ranges
  const validations = [
    { path: "resources.moneyThreshold", min: 0, max: 1, type: "number" },
    { path: "resources.securityThreshold", min: 0, max: 100, type: "number" },
    { path: "resources.homeReservedRam", min: 0, max: 1000, type: "number" },
    {
      path: "processes.healthCheckInterval",
      min: 1000,
      max: 60000,
      type: "number",
    },
    { path: "debug.logLevel", min: 0, max: 2, type: "integer" },
  ];

  for (const validation of validations) {
    const value = getConfig(validation.path);

    if (typeof value !== "number") {
      errors.push(`${validation.path}: Expected number, got ${typeof value}`);
      continue;
    }

    if (validation.type === "integer" && !Number.isInteger(value)) {
      errors.push(`${validation.path}: Expected integer, got ${value}`);
      continue;
    }

    if (value < validation.min || value > validation.max) {
      errors.push(
        `${validation.path}: Value ${value} outside valid range [${validation.min}, ${validation.max}]`
      );
    }
  }

  return errors;
}

/**
 * Get a formatted summary of current configuration
 * @returns {string} Human-readable configuration summary
 */
export function getConfigSummary() {
  const summary = [];

  summary.push("=== SYSTEM CONFIGURATION SUMMARY ===");
  summary.push("");

  summary.push("Process Management:");
  summary.push(
    `  Health Check Interval: ${getConfig("processes.healthCheckInterval")}ms`
  );
  summary.push(
    `  Target Update Interval: ${getConfig("processes.targetUpdateInterval")}ms`
  );
  summary.push(
    `  File Copy Interval: ${getConfig("processes.fileCopyInterval")}ms`
  );
  summary.push("");

  summary.push("Resource Allocation:");
  summary.push(
    `  Home Reserved RAM: ${getConfig("resources.homeReservedRam")}GB`
  );
  summary.push(
    `  Money Threshold: ${getConfig("resources.moneyThreshold") * 100}%`
  );
  summary.push(
    `  Security Threshold: +${getConfig("resources.securityThreshold")}`
  );
  summary.push("");

  summary.push("Worker Settings:");
  summary.push(
    `  Max Threads Per Chunk: ${getConfig("workers.maxThreadsPerChunk")}`
  );
  summary.push(
    `  Large Server Threshold: ${getConfig("workers.largeServerThreshold")}GB`
  );
  summary.push("");

  return summary.join("\n");
}

/**
 * Load configuration from a file (if it exists)
 * @param {NS} ns - NetScript API
 * @param {string} configFile - Path to configuration file
 * @returns {boolean} True if config was loaded, false otherwise
 */
export function loadConfigFromFile(
  ns,
  configFile = "/config/user-config.json"
) {
  try {
    if (ns.fileExists(configFile)) {
      const userConfig = JSON.parse(ns.read(configFile));

      // Merge user config with default config
      mergeConfig(SYSTEM_CONFIG, userConfig);

      return true;
    }
  } catch (error) {
    ns.print(`ERROR: Failed to load config from ${configFile}: ${error}`);
  }

  return false;
}

/**
 * Save current configuration to a file
 * @param {NS} ns - NetScript API
 * @param {string} configFile - Path to save configuration to
 * @returns {boolean} True if config was saved, false otherwise
 */
export function saveConfigToFile(ns, configFile = "/config/user-config.json") {
  try {
    ns.write(configFile, JSON.stringify(SYSTEM_CONFIG, null, 2), "w");
    return true;
  } catch (error) {
    ns.print(`ERROR: Failed to save config to ${configFile}: ${error}`);
    return false;
  }
}

/**
 * Recursively merge two configuration objects
 * @param {Object} target - Target object to merge into
 * @param {Object} source - Source object to merge from
 */
function mergeConfig(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) target[key] = {};
        mergeConfig(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}

// Export commonly used configuration categories for convenience
export const PROCESS_CONFIG = SYSTEM_CONFIG.processes;
export const RESOURCE_CONFIG = SYSTEM_CONFIG.resources;
export const WORKER_CONFIG = SYSTEM_CONFIG.workers;
export const DEBUG_CONFIG = SYSTEM_CONFIG.debug;
export const OPTIMIZATION_CONFIG = SYSTEM_CONFIG.optimization;
export const SERVER_CONFIG = SYSTEM_CONFIG.serverManagement;
export const PATHS = SYSTEM_CONFIG.paths;
