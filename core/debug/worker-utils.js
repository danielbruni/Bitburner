/**
 * worker-utils.js - Utilities for worker detection and analysis
 * Centralizes worker detection logic to avoid repetition
 */

/**
 * Check if a process is a worker script
 * @param {Object} process - Process object from ns.ps()
 * @returns {boolean} True if the process is a worker
 */
export function isWorkerProcess(process) {
  const filename = process.filename;

  // Check for worker.js in any path variation
  return (
    filename.endsWith("worker.js") ||
    filename.endsWith("/worker.js") ||
    filename.includes("/workers/worker.js")
  );
}

/**
 * Check if a process is an operation script (hack/grow/weaken)
 * @param {Object} process - Process object from ns.ps()
 * @returns {boolean} True if the process is an operation script
 */
export function isOperationProcess(process) {
  const filename = process.filename;

  return (
    filename.endsWith("hack.js") ||
    filename.endsWith("grow.js") ||
    filename.endsWith("weaken.js") ||
    filename.includes("/operations/")
  );
}

/**
 * Get all worker processes from a server
 * @param {NS} ns - Netscript object
 * @param {string} server - Server name
 * @returns {Array} Array of worker processes
 */
export function getWorkerProcesses(ns, server) {
  const processes = ns.ps(server);
  return processes.filter((p) => isWorkerProcess(p) || isOperationProcess(p));
}

/**
 * Get worker statistics from all servers
 * @param {NS} ns - Netscript object
 * @param {Array} servers - Array of server names (optional, defaults to all)
 * @returns {Object} Worker statistics
 */
export function getWorkerStats(ns, servers = null) {
  if (!servers) {
    servers = [...ns.getPurchasedServers(), "home"];
  }

  let totalWorkers = 0;
  let hackWorkers = 0;
  let growWorkers = 0;
  let weakenWorkers = 0;
  const workerDetails = [];

  for (const server of servers) {
    const workers = getWorkerProcesses(ns, server);

    for (const worker of workers) {
      totalWorkers++;

      // Determine action from args or filename
      let action = "unknown";
      if (worker.args && worker.args.length > 1) {
        action = worker.args[1]; // Standard worker format
      } else if (worker.filename.includes("hack")) {
        action = "hack";
      } else if (worker.filename.includes("grow")) {
        action = "grow";
      } else if (worker.filename.includes("weaken")) {
        action = "weaken";
      }

      // Count by action
      if (action === "hack") hackWorkers++;
      else if (action === "grow") growWorkers++;
      else if (action === "weaken") weakenWorkers++;

      workerDetails.push({
        server,
        filename: worker.filename,
        action,
        target: worker.args[0] || "unknown",
        threads: parseInt(worker.args[2]) || 1,
        pid: worker.pid,
      });
    }
  }

  return {
    total: totalWorkers,
    hack: hackWorkers,
    grow: growWorkers,
    weaken: weakenWorkers,
    details: workerDetails,
  };
}

/**
 * Format worker stats for display
 * @param {Object} stats - Worker stats from getWorkerStats()
 * @returns {string} Formatted string
 */
export function formatWorkerStats(stats) {
  return `${stats.total} (${stats.hack}H ${stats.grow}G ${stats.weaken}W)`;
}
