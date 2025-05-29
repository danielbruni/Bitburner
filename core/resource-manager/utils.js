/**
 * utils.js - Utility functions for the resource manager
 */

import { formatMoney } from "../utils/common.js";

/**
 * Clean up stale worker assignments
 * @param {NS} ns - NetScript API
 * @param {Object} assignedHosts - Current host assignments
 */
export function cleanupWorkers(ns, assignedHosts) {
  const now = Date.now();
  const staleThreshold = 10 * 60 * 1000; // 10 minutes

  for (const host in assignedHosts) {
    // Filter out stale assignments
    assignedHosts[host] = assignedHosts[host].filter((assignment) => {
      return now - assignment.timestamp < staleThreshold;
    });

    // Remove host if it has no assignments
    if (assignedHosts[host].length === 0) {
      delete assignedHosts[host];
    }
  }
}

/**
 * Output system status
 * @param {NS} ns - NetScript API
 * @param {Array} tasks - Prioritized tasks
 * @param {Object} taskData - Task tracking data
 */
export function outputStatus(ns, tasks, taskData) {
  // Output active workers
  ns.print(`👷 Active workers: ${taskData.activeWorkers}`);

  // Output top 3 targets
  const topTargets = tasks.slice(0, 3);

  for (const task of topTargets) {
    const moneyPercent = task.money.percent.toFixed(2);
    const securityStatus = task.security.current.toFixed(2);

    ns.print(
      `🎯 ${task.target} [${task.action.toUpperCase()}]: ` +
        `$${formatMoney(task.money.current)}/${formatMoney(
          task.money.max
        )} (${moneyPercent}%), ` +
        `Security: ${securityStatus}/${task.security.min.toFixed(2)}`
    );
  }
}
