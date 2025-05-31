/**
 * index.js - Main Resource Manager
 * Coordinates the resource allocation system by importing and using modules
 */

import { prepareServers } from "./prepare-servers.js";
import { prioritizeTasks } from "./task-prioritization.js";
import { allocateResources } from "./resource-allocation.js";
import { cleanupWorkers, outputStatus } from "./utils.js";
import { createStrategyCoordinator } from "../process/strategy-coordinator.js";
import {
  RESOURCE_CONFIG,
  getConfig,
  loadConfigFromFile,
} from "../config/system-config.js";

/** @param {NS} ns */
export async function main(ns) {
  // Load user configuration if available
  loadConfigFromFile(ns);

  // Parse command line arguments with config defaults
  const moneyThreshold = ns.args[1] || getConfig("resources.moneyThreshold");
  const securityThreshold =
    ns.args[2] || getConfig("resources.securityThreshold");
  const homeReservedRam = ns.args[3] || getConfig("resources.homeReservedRam");

  // Create data directory if needed
  if (!ns.fileExists("/data")) {
    ns.exec("/core/server-manager/index.js", "home", 1);
    await ns.sleep(1000);
  }
  // Disable logs
  ns.disableLog("ALL");
  // Initialize strategy coordinator
  const strategyCoordinator = createStrategyCoordinator(ns);
  let currentStrategy = strategyCoordinator.getCurrentStrategy();

  // Prepare servers with required scripts
  await prepareServers(ns);

  // Initialize variables
  let assignedHosts = {}; // Track worker assignments
  let taskData = {
    activeWorkers: 0,
    targetStatuses: {},
    moneyThreshold,
    securityThreshold,
    homeReservedRam,
  };
  // Main loop
  while (true) {
    try {
      // Check for strategy changes
      const strategyChanged =
        strategyCoordinator.checkAndApplyStrategyChanges();
      if (strategyChanged) {
        const newStrategy = strategyCoordinator.getCurrentStrategy();
        if (newStrategy !== currentStrategy) {
          ns.print(
            `🔄 Strategy changed from ${currentStrategy} to ${newStrategy}`
          );
          currentStrategy = newStrategy;

          // Apply strategy-specific adjustments to task data
          applyStrategyAdjustments(currentStrategy, taskData);
        }
      }

      // Load server data
      const serverData = JSON.parse(
        ns.read("/data/servers.json") || '{"available":[],"targets":[]}'
      );
      const availableServers = serverData.available;
      const targetServers = serverData.targets;

      // Debug: Print available servers
      ns.print(`🔍 Available servers: ${availableServers.length}`);
      availableServers.forEach((server) => {
        ns.print(
          `    - ${server.name}: ${server.maxRam}GB (${server.usedRam}GB used), Owned: ${server.isOwned}`
        );
      });

      // Track the time
      const lastCycleTime = Date.now();

      // Update task priority for each target
      const prioritizedTasks = prioritizeTasks(ns, targetServers, taskData);

      // Reset target statuses for this cycle
      taskData.targetStatuses = {};

      // Allocate servers to tasks
      await allocateResources(
        ns,
        availableServers,
        prioritizedTasks,
        assignedHosts,
        taskData
      );

      // Clean up any stale worker assignments
      cleanupWorkers(ns, assignedHosts);

      // Output status
      outputStatus(ns, prioritizedTasks, taskData);

      // Calculate sleep time (aim for cycle every 5 seconds)
      const cycleTime = Date.now() - lastCycleTime;
      const sleepTime = Math.max(1000, 5000 - cycleTime);

      await ns.sleep(sleepTime);
    } catch (error) {
      ns.print(`ERROR: ${error.toString()}`);
      await ns.sleep(5000);
    }
  }
}

/**
 * Apply strategy-specific adjustments to resource allocation
 * @param {string} strategy - Current strategy name
 * @param {Object} taskData - Task data object to modify
 */
function applyStrategyAdjustments(strategy, taskData) {
  switch (strategy) {
    case "aggressive":
      // More aggressive resource allocation, lower thresholds
      taskData.moneyThreshold = Math.max(1000, taskData.moneyThreshold * 0.5);
      taskData.securityThreshold = Math.min(
        100,
        taskData.securityThreshold * 1.5
      );
      break;

    case "conservative":
      // More conservative, higher thresholds
      taskData.moneyThreshold = taskData.moneyThreshold * 2;
      taskData.securityThreshold = Math.max(
        1,
        taskData.securityThreshold * 0.7
      );
      break;

    case "emergency":
      // Emergency mode - focus on best targets only
      taskData.moneyThreshold = taskData.moneyThreshold * 3;
      taskData.securityThreshold = Math.max(
        1,
        taskData.securityThreshold * 0.5
      );
      break;

    case "balanced":
    default:
      // Reset to default values from config
      taskData.moneyThreshold = getConfig("resources.moneyThreshold");
      taskData.securityThreshold = getConfig("resources.securityThreshold");
      break;
  }
}
