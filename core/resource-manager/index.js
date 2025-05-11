/**
 * index.js - Main Resource Manager
 * Coordinates the resource allocation system by importing and using modules
 */

import { prepareServers } from "./prepare-servers.js";
import { prioritizeTasks } from "./task-prioritization.js";
import { allocateResources } from "./resource-allocation.js";
import { cleanupWorkers, outputStatus } from "./utils.js";

/** @param {NS} ns */
export async function main(ns) {
  // Parse command line arguments
  const moneyThreshold = ns.args[1] || 0.75;
  const securityThreshold = ns.args[2] || 5;
  const homeReservedRam = ns.args[3] || 10;
  // Create data directory if needed
  if (!ns.fileExists("/data")) {
    ns.exec("/core/server-manager.js", "home", 1);
    await ns.sleep(1000);
  }

  // Disable logs
  ns.disableLog("ALL");

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
      // Load server data
      const serverData = JSON.parse(
        ns.read("/data/servers.txt") || '{"available":[],"targets":[]}'
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
