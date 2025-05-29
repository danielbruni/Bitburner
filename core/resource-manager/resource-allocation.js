/**
 * resource-allocation.js - Allocates resources to tasks
 */

import { assignServersToTask } from "./server-assignment.js";
import { calculateThreads } from "./thread-calculator.js";
import { getConfig } from "../config/system-config.js";

/**
 * Allocate server resources to tasks
 * @param {NS} ns - NetScript API
 * @param {Array} availableServers - Servers available for running scripts
 * @param {Array} tasks - Prioritized list of tasks
 * @param {Object} assignedHosts - Current host assignments
 * @param {Object} taskData - Tracking data for active tasks
 */
export async function allocateResources(
  ns,
  availableServers,
  tasks,
  assignedHosts,
  taskData
) {
  // Reset active worker count
  taskData.activeWorkers = 0;
  // Get info about worker script RAM requirements
  const workerRam = ns.getScriptRam("/core/workers/worker.js");

  // Group servers by RAM capacity for better utilization
  const serversBySize = {};

  for (const server of availableServers) {
    const availableRam = server.maxRam - server.usedRam;

    // Skip servers with insufficient RAM
    if (availableRam < workerRam) continue; // Group by RAM size category using centralized config
    const categories = getConfig("serverCategories");
    let sizeCategory = "tiny";

    for (const [category, limits] of Object.entries(categories)) {
      if (availableRam >= limits.minRam && availableRam < limits.maxRam) {
        sizeCategory = category;
        break;
      }
    }

    if (!serversBySize[sizeCategory]) {
      serversBySize[sizeCategory] = [];
    }

    serversBySize[sizeCategory].push({
      ...server,
      availableRam,
    });
  }

  // Process the highest priority tasks first
  for (const task of tasks) {
    // Skip tasks with zero priority
    if (task.priority <= 0) continue; // Calculate optimal thread counts for this task
    const threadCounts = calculateThreads(ns, task);
    if (threadCounts.total <= 0) continue;

    // Try to find servers for this task, starting with the largest ones
    await assignServersToTask(
      ns,
      serversBySize,
      task,
      threadCounts,
      assignedHosts,
      taskData,
      workerRam,
      taskData.homeReservedRam
    );
  }
}
