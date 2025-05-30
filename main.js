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
import { MoneyTracker } from "/core/process/money-tracker.js";
import { createStrategyCoordinator } from "/core/process/strategy-coordinator.js";

import { getConfig, loadConfigFromFile } from "/core/config/system-config.js";
import { clearDataFolder } from "/core/utils/data.js";

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
  }; // Initialize script and process management
  const { processMonitor, coordinator, moneyTracker, strategyCoordinator } =
    await initializeSystem(ns, CONFIG);

  ns.tprint("==== Dynamic Resource Allocation Hacking System (v2.1) ====");
  if (shouldClearData) {
    ns.tprint("🔄 System initialized with FRESH DATA");
  } else {
    ns.tprint("✅ System initialized with process health monitoring");
  }
  ns.tprint("💰 Money tracking and strategy coordination enabled");
  // Main coordination loop
  while (true) {
    try {
      // Check and maintain process health
      await maintainProcessHealth(ns, processMonitor, coordinator, CONFIG);

      // Handle money tracking and strategy coordination
      await handleMoneyTrackingAndStrategy(
        ns,
        moneyTracker,
        strategyCoordinator
      );

      // Handle data refresh coordination
      await coordinateDataRefresh(ns, coordinator, CONFIG);

      // Handle file copying coordination
      await coordinateFileCopying(ns, coordinator, CONFIG);

      // Output system status
      outputSystemStatus(ns, processMonitor, coordinator, moneyTracker);

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
 * @returns {Object} Object containing processMonitor, coordinator, moneyTracker, and strategyCoordinator
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
  // Initialize money tracking and strategy coordination
  const moneyTracker = new MoneyTracker(ns);
  const strategyCoordinator = createStrategyCoordinator(ns);

  // Start core processes
  await processMonitor.ensureAllRunning();

  return { processMonitor, coordinator, moneyTracker, strategyCoordinator };
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
 * Handle money tracking and strategy coordination
 * @param {NS} ns - NetScript API
 * @param {MoneyTracker} moneyTracker - Money tracker instance
 * @param {StrategyCoordinator} strategyCoordinator - Strategy coordinator instance
 */
async function handleMoneyTrackingAndStrategy(
  ns,
  moneyTracker,
  strategyCoordinator
) {
  try {
    // Update money tracking
    moneyTracker.updateTracking();

    // Check for strategy changes and apply them
    const strategyChanged = strategyCoordinator.checkAndApplyStrategyChanges();

    if (strategyChanged) {
      ns.print("🔄 Strategy change detected and applied");

      // Signal processes to reload their configurations
      const coordinator = new ProcessCoordinator(ns);
      coordinator.sendMessage("strategy_changed", {
        newStrategy: strategyCoordinator.currentStrategy,
        timestamp: Date.now(),
      });
    }

    // Check if money tracking suggests a strategy change
    const shouldChangeStrategy = moneyTracker.shouldChangeStrategy();
    if (shouldChangeStrategy) {
      const currentStrategy = strategyCoordinator.getCurrentStrategy();
      const recommendedStrategy = strategyCoordinator.getRecommendedStrategy();

      if (recommendedStrategy !== currentStrategy) {
        ns.print(
          `💰 Money tracker suggests strategy change: ${currentStrategy} → ${recommendedStrategy}`
        );

        const changeResult = await strategyCoordinator.changeStrategy(
          recommendedStrategy,
          "money_tracker_suggestion"
        );

        if (changeResult.success) {
          ns.print(`✅ Strategy changed to ${recommendedStrategy}`);
          moneyTracker.onStrategyChanged(recommendedStrategy);
        } else {
          ns.print(`❌ Strategy change failed: ${changeResult.reason}`);
        }
      }
    }
  } catch (error) {
    ns.print(`ERROR in money tracking/strategy: ${error.toString()}`);
  }
}

/**
 * Coordinate data refresh based on staleness and process coordination
 * @param {NS} ns - NetScript API
 * @param {ProcessCoordinator} coordinator - Process coordinator
 * @param {Object} config - System configuration
 */
async function coordinateDataRefresh(ns, coordinator, config) {
  // Check if server manager is already running
  if (ns.scriptRunning("/core/server-manager/index.js", "home")) {
    // Server manager is already running, don't trigger another one
    return;
  }

  // Check if we need to refresh server data
  if (coordinator.isServerDataStale(config.maxDataAge)) {
    ns.print("🔄 Server data is stale, triggering refresh...");

    // Run server manager once
    const pid = ns.exec(
      "/core/server-manager/index.js",
      "home",
      1,
      config.shouldUpgradeServers,
      config.homeReservedRam
    );
    if (pid > 0) {
      // Wait for server manager to complete
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds max wait
      while (ns.isRunning(pid) && attempts < maxAttempts) {
        await ns.sleep(500);
        attempts++;
      }

      if (attempts < maxAttempts) {
        // Server manager completed successfully
        coordinator.markServerDataRefreshed();
        ns.print("✅ Server manager refresh completed");
      } else {
        // Server manager took too long or failed
        ns.print("⚠️ Server manager refresh timed out");
      }
    } else {
      ns.print("❌ Failed to start server manager");
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
 * @param {MoneyTracker} moneyTracker - Money tracker instance
 */
function outputSystemStatus(ns, processMonitor, coordinator, moneyTracker) {
  const healthSummary = processMonitor.getHealthSummary();
  const statusSummary = coordinator.getStatusSummary();
  const moneyStatus = moneyTracker.getStatus();

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

    ns.print(
      `💰 Money Status - Rate: ${moneyStatus.formattedCurrentRate}/sec | ` +
        `Strategy: ${moneyStatus.currentStrategy} | ` +
        `Stagnant: ${moneyStatus.isStagnant ? "YES" : "NO"}`
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
