/**
 * server-assignment.js - Assigns servers to tasks based on resource availability
 */

import {
  calculateLargeServerChunks,
  launchChunkedWorkers,
} from "./large-server-optimization.js";
import { getConfig } from "../config/system-config.js";

/**
 * Assign servers to a task
 * @param {NS} ns - NetScript API
 * @param {Object} serversBySize - Grouped servers by RAM size
 * @param {Object} task - Task to assign servers to
 * @param {Object} threadCounts - Thread counts for the task
 * @param {Object} assignedHosts - Current host assignments
 * @param {Object} taskData - Task tracking data
 * @param {number} workerRam - RAM required for worker script
 * @param {number} homeReservedRam - RAM to reserve on home server
 */
export async function assignServersToTask(
  ns,
  serversBySize,
  task,
  threadCounts,
  assignedHosts,
  taskData,
  workerRam,
  homeReservedRam = 10 // Default to 10GB if not specified
) {
  // Get total threads needed
  const totalThreadsNeeded = threadCounts.total;
  let threadsAssigned = 0;

  // Debug: Get purchased servers
  const purchasedServers = ns.getPurchasedServers();
  ns.print(
    `🔍 Found ${purchasedServers.length} purchased servers for task ${task.action} on ${task.target}`
  );

  // Track which servers we've already processed to avoid duplicates
  const processedServers = new Set();

  // STEP 1: First, try to assign to purchased servers (excluding home)
  // This prioritizes using our own servers first
  for (const server of purchasedServers) {
    // Skip if we've assigned all needed threads
    if (threadsAssigned >= totalThreadsNeeded) break;

    try {
      // Don't process a server twice
      if (processedServers.has(server)) continue;
      processedServers.add(server);

      // Find this server in our size categories
      let serverObj = null;
      for (const category of ["huge", "large", "medium", "small", "tiny"]) {
        if (!serversBySize[category]) continue;

        const found = serversBySize[category].find((s) => s.name === server);
        if (found) {
          serverObj = found;
          break;
        }
      }

      // Skip if server not found or has insufficient RAM
      if (!serverObj || serverObj.availableRam < workerRam) {
        ns.print(
          `⚠️ Purchased server ${server} skipped: Not found or insufficient RAM (${
            serverObj ? serverObj.availableRam.toFixed(2) : 0
          }GB available)`
        );
        continue;
      }

      // Debug: Check if the worker script exists on the server
      const workerExists = ns.fileExists("/core/workers/worker.js", server);
      if (!workerExists) {
        // Try to copy the worker script to the server
        ns.print(
          `⚠️ Worker script not found on ${server}, attempting to copy...`
        );
        if (ns.scp("/core/workers/worker.js", server, "home")) {
          ns.print(`✅ Successfully copied worker.js to ${server}`);
        } else {
          ns.print(`❌ Failed to copy worker.js to ${server}`);
          continue;
        }
      } // Calculate max threads for this server
      const maxThreads = Math.floor(serverObj.availableRam / workerRam);

      if (maxThreads <= 0) continue;

      // Determine threads to assign to this server
      const threadsToAssign = Math.min(
        maxThreads,
        totalThreadsNeeded - threadsAssigned
      );

      // For large servers (>1TB), use chunking optimization
      if (serverObj.maxRam >= 1024) {
        ns.print(
          `🔄 Using large server optimization for ${server} (${serverObj.maxRam}GB RAM)`
        );

        // Calculate optimal chunks for this large server
        const chunks = calculateLargeServerChunks(
          ns,
          task,
          serverObj.availableRam,
          workerRam
        );

        // Launch workers in chunks
        const assignedThreads = await launchChunkedWorkers(
          ns,
          server,
          chunks,
          task,
          assignedHosts,
          taskData
        );

        if (assignedThreads > 0) {
          threadsAssigned += assignedThreads;

          // Update available RAM
          serverObj.availableRam -= workerRam * assignedThreads;

          ns.print(
            `✅ Using large server ${server}: assigned ${assignedThreads} threads in ${chunks.length} chunks for ${task.action} on ${task.target}`
          );
        }

        continue; // Skip the standard worker launch
      } // Standard worker launch for normal-sized servers
      const pid = ns.exec(
        "/core/workers/worker.js",
        server,
        threadsToAssign,
        task.target,
        threadCounts.action,
        threadsToAssign,
        JSON.stringify(task)
      );

      if (pid > 0) {
        // Track the assignment
        if (!assignedHosts[server]) {
          assignedHosts[server] = [];
        }

        assignedHosts[server].push({
          target: task.target,
          action: threadCounts.action,
          threads: threadsToAssign,
          timestamp: Date.now(),
        });

        threadsAssigned += threadsToAssign;
        taskData.activeWorkers++;

        // Update available RAM
        serverObj.availableRam -= workerRam * threadsToAssign;

        ns.print(
          `✅ Using purchased server ${server}: assigned ${threadsToAssign} threads for ${task.action} on ${task.target}`
        );
      } else {
        ns.print(
          `❌ Failed to launch worker on ${server} with ${threadsToAssign} threads`
        );
      }
    } catch (error) {
      ns.print(`❌ Error processing ${server}: ${error.toString()}`);
    }
  }

  // STEP 2: If we still need more threads, use non-owned servers
  if (threadsAssigned < totalThreadsNeeded) {
    // Process by size category (largest first)
    const sizeCategories = ["huge", "large", "medium", "small", "tiny"];

    for (const category of sizeCategories) {
      // Skip if category doesn't exist or we have all threads we need
      if (!serversBySize[category] || threadsAssigned >= totalThreadsNeeded)
        continue;

      // Get non-owned, non-home servers with available RAM
      const nonOwnedServers = serversBySize[category].filter(
        (s) => !s.isOwned && s.name !== "home" && s.availableRam >= workerRam
      );

      // Process each server
      for (const server of nonOwnedServers) {
        // Skip if we've already processed this server or have all the threads we need
        if (
          processedServers.has(server.name) ||
          threadsAssigned >= totalThreadsNeeded
        )
          continue;
        processedServers.add(server.name);

        // Calculate threads
        const maxThreads = Math.floor(server.availableRam / workerRam);
        if (maxThreads <= 0) continue;

        const threadsToAssign = Math.min(
          maxThreads,
          totalThreadsNeeded - threadsAssigned
        ); // Launch worker
        const pid = ns.exec(
          "/core/workers/worker.js",
          server.name,
          threadsToAssign,
          task.target,
          threadCounts.action,
          threadsToAssign,
          JSON.stringify(task)
        );

        if (pid > 0) {
          // Track assignment
          if (!assignedHosts[server.name]) {
            assignedHosts[server.name] = [];
          }

          assignedHosts[server.name].push({
            target: task.target,
            action: threadCounts.action,
            threads: threadsToAssign,
            timestamp: Date.now(),
          });

          threadsAssigned += threadsToAssign;
          taskData.activeWorkers++;

          // Update available RAM
          server.availableRam -= workerRam * threadsToAssign;

          ns.print(
            `✅ Using hacked server ${server.name}: assigned ${threadsToAssign} threads for ${task.action} on ${task.target}`
          );
        }
      }
    }
  }

  // STEP 3: As a last resort, use home if needed and available
  if (threadsAssigned < totalThreadsNeeded) {
    for (const category of ["huge", "large", "medium", "small", "tiny"]) {
      if (!serversBySize[category]) continue;

      const homeServer = serversBySize[category].find((s) => s.name === "home");
      if (homeServer && !processedServers.has("home")) {
        processedServers.add("home");

        // Calculate available RAM, respecting reserved RAM
        const actualAvailableRam = Math.max(
          0,
          homeServer.availableRam - homeReservedRam
        );

        // Skip if not enough RAM available after reserving
        if (actualAvailableRam < workerRam) {
          ns.print(
            `⚠️ Home server skipped: Only ${actualAvailableRam.toFixed(
              2
            )}GB available after reserving ${homeReservedRam}GB`
          );
          continue;
        }

        const maxThreads = Math.floor(actualAvailableRam / workerRam);
        const threadsToAssign = Math.min(
          maxThreads,
          totalThreadsNeeded - threadsAssigned
        );

        if (threadsToAssign > 0) {
          const pid = ns.exec(
            "/core/workers/worker.js",
            "home",
            threadsToAssign,
            task.target,
            threadCounts.action,
            threadsToAssign,
            JSON.stringify(task)
          );

          if (pid > 0) {
            // Track assignment
            if (!assignedHosts["home"]) {
              assignedHosts["home"] = [];
            }

            assignedHosts["home"].push({
              target: task.target,
              action: threadCounts.action,
              threads: threadsToAssign,
              timestamp: Date.now(),
            });

            threadsAssigned += threadsToAssign;
            taskData.activeWorkers++;

            homeServer.availableRam -= workerRam * threadsToAssign;

            ns.print(
              `✅ Using home server: assigned ${threadsToAssign} threads for ${task.action} on ${task.target} (reserved ${homeReservedRam}GB)`
            );
          }
        }
        break;
      }
    }
  }

  // Log the results for this task
  if (threadsAssigned > 0) {
    ns.print(
      `📊 ${task.action.toUpperCase()} ${
        task.target
      }: ${threadsAssigned}/${totalThreadsNeeded} threads assigned`
    );
  } else {
    ns.print(
      `❌ Could not assign any threads for ${task.action.toUpperCase()} ${
        task.target
      }`
    );
  }
}
