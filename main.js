/**
 * main.js - Dynamic Resource Allocation Hacking System
 * A more flexible approach than batches that maximizes resource utilization
 * Now with proper process management and health monitoring
 *
 * Usage:
 *   run main.js                   - Normal startup
 *   run main.js --clear-data=true - Clear data folder and restart fresh
 */

import { createProcessMonitor } from "/core/process/process-health.js";
import { ProcessCoordinator } from "/core/process/coordination.js";

import { getConfig, loadConfigFromFile } from "./core/config/system-config.js";
import { clearDataFolder } from "./core/utils/data.js";

/**
 * Main system entry point
 * @param {NS} ns
 * @param {boolean} [clearData=false] - If true, clears all data files before starting
 */
export async function main(ns) {
  // Check for the clearData argument (--clear-data flag)
  const args = ns.flags([["clear-data", false]]);
  const shouldClearData = args["clear-data"];

  if (shouldClearData) {
    await clearDataFolder(ns);
    ns.tprint("🧹 Data folder cleared and reset with default values");
  }

  // Load user configuration if it exists
  loadConfigFromFile(ns);

  // Configuration - now using centralized config
  const CONFIG = {
    targetUpdateInterval: getConfig("processes.targetUpdateInterval"),
    serverUpdateInterval: getConfig("processes.serverUpdateInterval"),
    homeReservedRam: getConfig("resources.homeReservedRam"),
    shouldUpgradeServers: getConfig("serverManagement.autoUpgradeServers"),
    moneyThreshold: getConfig("resources.moneyThreshold"),
    securityThreshold: getConfig("resources.securityThreshold"),
    logLevel: getConfig("debug.logLevel"),
    healthCheckInterval: getConfig("processes.healthCheckInterval"),
    maxDataAge: getConfig("processes.maxDataAge"),
    maxTargetAge: getConfig("processes.maxTargetAge"),
    fileCopyInterval: getConfig("processes.fileCopyInterval"),
  };
  // Initialize script and process management
  const { processMonitor, coordinator } = await initializeSystem(ns, CONFIG);

  ns.tprint("==== Dynamic Resource Allocation Hacking System (v2.0) ====");
  if (shouldClearData) {
    ns.tprint("🔄 System initialized with FRESH DATA");
  } else {
    ns.tprint("✅ System initialized with process health monitoring");
  }

  // Main coordination loop
  while (true) {
    try {
      // Check and maintain process health
      await maintainProcessHealth(ns, processMonitor, coordinator, CONFIG);

      // Handle data refresh coordination
      await coordinateDataRefresh(ns, coordinator, CONFIG);

      // Handle file copying coordination
      await coordinateFileCopying(ns, coordinator, CONFIG);

      // Output system status
      outputSystemStatus(ns, processMonitor, coordinator);

      // Wait before next health check
      await ns.sleep(CONFIG.healthCheckInterval);
    } catch (error) {
      ns.print(`ERROR in main loop: ${error.toString()}`);
      await ns.sleep(5000);
    }
  }
}

/**
 * Initialize system with process monitoring and coordination
 * @param {NS} ns - NetScript API
 * @param {Object} config - Script configuration
 * @returns {Object} Object containing processMonitor and coordinator
 */
async function initializeSystem(ns, config) {
  ns.disableLog("ALL");

  // Required scripts check
  const requiredScripts = [
    "/core/server-manager/index.js",
    "/core/resource-manager/index.js",
    "/core/workers/worker.js",
  ];

  ns.print("🔍 Checking required scripts...");
  let allScriptsExist = true;
  for (const script of requiredScripts) {
    if (!ns.fileExists(script)) {
      ns.tprint(`❌ Missing required script: ${script}`);
      allScriptsExist = false;
    }
  }

  if (!allScriptsExist) {
    ns.tprint(
      "❌ Some required scripts are missing. Please create them first."
    );
    ns.exit();
  }

  // Create data directory structure
  ensureDataDirectories(ns);

  // Initialize process monitor and coordinator
  const processMonitor = createProcessMonitor(ns, config);
  const coordinator = new ProcessCoordinator(ns);

  // Start core processes
  await processMonitor.ensureAllRunning();

  return { processMonitor, coordinator };
}

/**
 * Ensure data directories exist
 * @param {NS} ns - NetScript API
 */
function ensureDataDirectories(ns) {
  const defaultServerData = JSON.stringify({ available: [], targets: [] });
  const defaultTargetData = JSON.stringify({ targets: [] });

  if (!ns.fileExists("/data/servers.json")) {
    ns.write("/data/servers.json", defaultServerData, "w");
  }
  if (!ns.fileExists("/data/targets.json")) {
    ns.write("/data/targets.json", defaultTargetData, "w");
  }
}

/**
 * Maintain health of all system processes
 * @param {NS} ns - NetScript API
 * @param {ProcessHealthMonitor} processMonitor - Process monitor
 * @param {ProcessCoordinator} coordinator - Process coordinator
 * @param {Object} config - System configuration
 */
async function maintainProcessHealth(ns, processMonitor, coordinator, config) {
  const healthStatus = await processMonitor.checkHealth();

  // If any critical processes are down, restart them
  if (healthStatus.stopped > 0) {
    ns.print(
      `⚠️ ${healthStatus.stopped} processes stopped, attempting restart...`
    );

    // Restart server manager if needed
    if (!ns.scriptRunning("/core/server-manager/index.js", "home")) {
      await processMonitor.restartProcess(
        "/core/server-manager/index.js",
        "home"
      );
      coordinator.sendMessage("server_manager_restarted", {
        reason: "Process stopped",
      });
    }

    // Restart resource manager if needed
    if (!ns.scriptRunning("/core/resource-manager/index.js", "home")) {
      await processMonitor.restartProcess(
        "/core/resource-manager/index.js",
        "home"
      );
      coordinator.sendMessage("resource_manager_restarted", {
        reason: "Process stopped",
      });
    }
  }
}

/**
 * Coordinate data refresh based on staleness and process coordination
 * @param {NS} ns - NetScript API
 * @param {ProcessCoordinator} coordinator - Process coordinator
 * @param {Object} config - System configuration
 */
async function coordinateDataRefresh(ns, coordinator, config) {
  // Check if we need to refresh server data
  if (coordinator.isServerDataStale(config.maxDataAge)) {
    ns.print("🔄 Server data is stale, triggering refresh...");

    // Signal server manager to refresh if it's running
    if (ns.scriptRunning("/core/server-manager/index.js", "home")) {
      coordinator.sendMessage("refresh_server_data", {
        reason: "Data stale",
        maxAge: config.maxDataAge,
      });
    } else {
      // If server manager isn't running, we need to run it once
      const pid = ns.exec(
        "/core/server-manager/index.js",
        "home",
        1,
        config.shouldUpgradeServers,
        config.homeReservedRam
      );
      if (pid > 0) {
        await ns.sleep(500); // Give it time to complete
        coordinator.markServerDataRefreshed();
      }
    }
  }

  // Target data refresh is handled by the resource manager internally
  // We just track when it was last updated
  if (coordinator.isTargetDataStale(config.maxTargetAge)) {
    coordinator.requestTargetRefreshIfNeeded(config.maxTargetAge);
  }
}

/**
 * Coordinate file copying to servers
 * @param {NS} ns - NetScript API
 * @param {ProcessCoordinator} coordinator - Process coordinator
 * @param {Object} config - System configuration
 */
async function coordinateFileCopying(ns, coordinator, config) {
  // Only copy files periodically or when servers are refreshed
  if (!coordinator.areFilesFresh(config.fileCopyInterval)) {
    const serverData = JSON.parse(
      ns.read("/data/servers.json") || '{"available":[]}'
    );
    const availableServers = serverData.available || [];

    if (availableServers.length > 0) {
      await copyFilesToAvailableServers(ns, availableServers);
      coordinator.markFilesCopied();
      ns.print(`📁 Files copied to ${availableServers.length} servers`);
    }
  }
}

/**
 * Output system status information
 * @param {NS} ns - NetScript API
 * @param {ProcessHealthMonitor} processMonitor - Process monitor
 * @param {ProcessCoordinator} coordinator - Process coordinator
 */
function outputSystemStatus(ns, processMonitor, coordinator) {
  const healthSummary = processMonitor.getHealthSummary();
  const statusSummary = coordinator.getStatusSummary();

  // Only output status every 30 seconds to avoid spam
  const now = Date.now();
  if (
    !outputSystemStatus.lastOutput ||
    now - outputSystemStatus.lastOutput > 30000
  ) {
    ns.print(
      `📊 System Status - Uptime: ${statusSummary.uptime}s | ` +
        `Processes: ${healthSummary.healthy}✅ ${healthSummary.stopped}⛔ | ` +
        `Data Age: S:${statusSummary.serverDataAge}s T:${statusSummary.targetDataAge}s`
    );
    outputSystemStatus.lastOutput = now;
  }
}

/**
 * Copy essential files to available servers (only when needed)
 * @param {NS} ns - NetScript API
 * @param {Array} availableServers - List of available servers
 */
async function copyFilesToAvailableServers(ns, availableServers) {
  // Filter out home server
  const servers = availableServers.filter((s) => s.name !== "home") || [];

  if (servers.length === 0) {
    return;
  }

  // Files to copy
  const filesToCopy = ["/core/workers/worker.js"];

  // Copy to each server efficiently
  for (const server of servers) {
    try {
      // Check which files need copying
      const filesToUpdate = [];
      for (const file of filesToCopy) {
        if (!ns.fileExists(file, server.name)) {
          filesToUpdate.push(file);
        }
      }

      // Only copy if files are missing
      if (filesToUpdate.length > 0) {
        for (const file of filesToUpdate) {
          ns.scp(file, server.name, "home");
        }
        ns.print(`📁 Copied ${filesToUpdate.length} files to ${server.name}`);
      }
    } catch (error) {
      ns.print(`❌ Error copying files to ${server.name}: ${error}`);
    }
  }
}
