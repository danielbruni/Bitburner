/**
 * process-health.js - Process Health Monitoring System
 * Provides health checking and coordination for system processes
 */

import { getConfig } from "../config/system-config.js";

/**
 * Process health monitor that tracks running processes and their status
 */
export class ProcessHealthMonitor {
  constructor(ns) {
    this.ns = ns;
    this.processes = new Map();
    this.healthFile = getConfig("processes.healthDataFile");
    this.lastHealthCheck = 0;
    this.healthCheckInterval = getConfig("processes.healthCheckInterval");
  }

  /**
   * Register a process for monitoring
   * @param {string} scriptPath - Path to the script
   * @param {string} host - Host running the script
   * @param {Array} args - Script arguments
   * @param {Object} config - Process configuration
   */
  registerProcess(scriptPath, host, args = [], config = {}) {
    const processKey = `${scriptPath}@${host}`;
    this.processes.set(processKey, {
      scriptPath,
      host,
      args,
      config,
      pid: null,
      lastSeen: 0,
      restartCount: 0,
      status: "stopped",
      lastError: null,
      ...config,
    });
  }

  /**
   * Start a registered process if it's not running
   * @param {string} scriptPath - Path to the script
   * @param {string} host - Host to run the script on
   * @returns {boolean} True if started successfully
   */
  async startProcess(scriptPath, host) {
    const processKey = `${scriptPath}@${host}`;
    const process = this.processes.get(processKey);

    if (!process) {
      this.ns.print(`ERROR: Process ${processKey} not registered`);
      return false;
    }

    // Check if already running
    if (this.ns.scriptRunning(scriptPath, host)) {
      process.status = "running";
      process.lastSeen = Date.now();
      return true;
    }

    // Start the process
    const pid = this.ns.exec(scriptPath, host, 1, ...process.args);

    if (pid === 0) {
      process.status = "failed";
      process.lastError = `Failed to start process`;
      this.ns.print(`❌ Failed to start ${processKey}`);
      return false;
    }

    process.pid = pid;
    process.status = "running";
    process.lastSeen = Date.now();
    this.ns.print(`✅ Started ${processKey} (PID: ${pid})`);

    return true;
  }

  /**
   * Check health of all registered processes
   * @returns {Object} Health status summary
   */
  async checkHealth() {
    const now = Date.now();

    // Only check health at specified intervals
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.getHealthSummary();
    }

    this.lastHealthCheck = now;

    const healthStatus = {
      healthy: 0,
      unhealthy: 0,
      stopped: 0,
      processes: {},
    };

    for (const [processKey, process] of this.processes) {
      const isRunning = this.ns.scriptRunning(process.scriptPath, process.host);

      if (isRunning) {
        process.status = "running";
        process.lastSeen = now;
        healthStatus.healthy++;
      } else {
        // Process stopped unexpectedly
        if (process.status === "running") {
          process.status = "stopped";
          process.lastError = "Process stopped unexpectedly";
          this.ns.print(`⚠️ Process ${processKey} stopped unexpectedly`);
        }
        healthStatus.stopped++;
      }

      healthStatus.processes[processKey] = {
        status: process.status,
        lastSeen: process.lastSeen,
        restartCount: process.restartCount,
        lastError: process.lastError,
      };
    }

    // Save health status to file
    this.saveHealthStatus(healthStatus);

    return healthStatus;
  }

  /**
   * Restart a stopped or failed process
   * @param {string} scriptPath - Path to the script
   * @param {string} host - Host to run the script on
   * @returns {boolean} True if restarted successfully
   */
  async restartProcess(scriptPath, host) {
    const processKey = `${scriptPath}@${host}`;
    const process = this.processes.get(processKey);

    if (!process) {
      return false;
    }

    // Kill if still running
    if (this.ns.scriptRunning(scriptPath, host)) {
      this.ns.scriptKill(scriptPath, host);
      await this.ns.sleep(100);
    }

    process.restartCount++;
    const started = await this.startProcess(scriptPath, host);

    if (started) {
      this.ns.print(
        `🔄 Restarted ${processKey} (restart #${process.restartCount})`
      );
    }

    return started;
  }

  /**
   * Ensure all registered processes are running
   * @returns {boolean} True if all processes are healthy
   */
  async ensureAllRunning() {
    let allHealthy = true;

    for (const [processKey, process] of this.processes) {
      if (!this.ns.scriptRunning(process.scriptPath, process.host)) {
        const started = await this.startProcess(
          process.scriptPath,
          process.host
        );
        if (!started) {
          allHealthy = false;
        }
      }
    }

    return allHealthy;
  }

  /**
   * Get current health summary
   * @returns {Object} Health summary
   */
  getHealthSummary() {
    try {
      const healthData = this.ns.read(this.healthFile);
      return healthData
        ? JSON.parse(healthData)
        : { healthy: 0, unhealthy: 0, stopped: 0, processes: {} };
    } catch {
      return { healthy: 0, unhealthy: 0, stopped: 0, processes: {} };
    }
  }

  /**
   * Save health status to file
   * @param {Object} healthStatus - Health status to save
   */
  saveHealthStatus(healthStatus) {
    try {
      this.ns.write(
        this.healthFile,
        JSON.stringify({
          ...healthStatus,
          timestamp: Date.now(),
          monitorPid: this.ns.pid,
        }),
        "w"
      );
    } catch (error) {
      this.ns.print(`ERROR saving health status: ${error}`);
    }
  }

  /**
   * Get process uptime in seconds
   * @param {string} processKey - Process key
   * @returns {number} Uptime in seconds
   */
  getProcessUptime(processKey) {
    const process = this.processes.get(processKey);
    if (!process || process.status !== "running") {
      return 0;
    }
    return Math.floor((Date.now() - process.lastSeen) / 1000);
  }

  /**
   * Check if a specific process needs data refresh
   * @param {string} scriptPath - Path to the script
   * @param {string} host - Host running the script
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} True if data is stale
   */
  isDataStale(scriptPath, host, maxAge) {
    const processKey = `${scriptPath}@${host}`;
    const process = this.processes.get(processKey);

    if (!process) return true;

    return Date.now() - process.lastSeen > maxAge;
  }
}

/**
 * Utility function to create and configure process monitor
 * @param {NS} ns - NetScript API
 * @param {Object} config - System configuration
 * @returns {ProcessHealthMonitor} Configured monitor
 */
export function createProcessMonitor(ns, config) {
  const monitor = new ProcessHealthMonitor(ns);
  // Register core system processes
  // NOTE: Server manager is NOT registered here because it's designed to run once and exit
  // It's triggered on-demand by the data refresh coordination system

  monitor.registerProcess(
    "/core/resource-manager/index.js",
    "home",
    [
      JSON.stringify(config),
      config.moneyThreshold,
      config.securityThreshold,
      config.homeReservedRam,
    ],
    {
      critical: true,
      maxRestarts: 5,
      restartDelay: 2000,
    }
  );

  return monitor;
}
