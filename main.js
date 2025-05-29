/**
 * main.js - Dynamic Resource Allocation Hacking System
 * A more flexible approach than batches that maximizes resource utilization
 */

/** @param {NS} ns */
export async function main(ns) {
  // Configuration
  const CONFIG = {
    targetUpdateInterval: 60000, // How often to reassess targets (ms)
    serverUpdateInterval: 10000, // How often to scan for new servers (ms)
    homeReservedRam: 10, // GB of RAM to reserve on home server
    shouldUpgradeServers: false, // Set to true to upgrade purchased servers
    moneyThreshold: 0.75, // Hack when server has this much money (75%)
    securityThreshold: 5, // Extra security above minimum to tolerate
    logLevel: 1, // 0: minimal, 1: normal, 2: verbose
  };

  // Initialize script
  initializeScript(ns, CONFIG);

  // Main loop
  while (true) {
    try {
      // Update list of available servers and targets
      const { availableServers, targetServers } = await updateServerLists(
        ns,
        CONFIG
      );

      // Copy essential files to all servers first to ensure they're ready
      await copyFilesToAvailableServers(ns, availableServers);

      // Deploy resource manager to coordinate tasks
      await deployResourceManager(ns, availableServers, targetServers, CONFIG);

      // Wait for next cycle
      await ns.sleep(CONFIG.targetUpdateInterval);
    } catch (error) {
      ns.print(`ERROR: ${error.toString()}`);
      await ns.sleep(5000);
    }
  }
}

/**
 * Initialize script and check for necessary dependencies
 * @param {NS} ns - NetScript API
 * @param {Object} config - Script configuration
 */
function initializeScript(ns, config) {
  ns.disableLog("ALL"); // Required scripts
  const requiredScripts = [
    "/core/server-manager/index.js",
    "/core/resource-manager/index.js",
    "/core/workers/worker.js",
    "/core/operations/hack.js",
    "/core/operations/grow.js",
    "/core/operations/weaken.js",
  ];

  // Check if all required scripts exist
  ns.print("🔍 Checking required scripts...");

  let allScriptsExist = true;
  for (const script of requiredScripts) {
    const exists = ns.fileExists(script);
    if (!exists) {
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

  // Display startup message
  ns.tprint("==== Dynamic Resource Allocation Hacking System ====");
  ns.tprint("Initializing system...");
}

/**
 * Update lists of available and target servers
 * @param {NS} ns - NetScript API
 * @param {Object} config - Script configuration
 * @returns {Object} Object containing available and target servers
 */
async function updateServerLists(ns, config) {
  // Run server manager to get available servers
  if (ns.scriptRunning("/core/server-manager/index.js", "home")) {
    ns.scriptKill("/core/server-manager/index.js", "home");
  }

  ns.exec(
    "/core/server-manager/index.js",
    "home",
    1,
    config.shouldUpgradeServers,
    config.homeReservedRam
  );
  await ns.sleep(500); // Give it time to run

  // Read results from server manager
  const serverData = JSON.parse(ns.read("/data/servers.json"));
  const availableServers = serverData.available || [];

  // Find suitable target servers
  const targetData = JSON.parse(ns.read("/data/targets.json"));
  const targetServers = targetData.targets || [];

  return { availableServers, targetServers };
}

/**
 * Deploy resource manager to coordinate tasks
 * @param {NS} ns - NetScript API
 * @param {Array} availableServers - List of available servers
 * @param {Array} targetServers - List of target servers
 * @param {Object} config - Script configuration
 */
async function deployResourceManager(
  ns,
  availableServers,
  targetServers,
  config
) {
  // Kill any existing resource manager
  if (ns.scriptRunning("/core/resource-manager/index.js", "home")) {
    ns.scriptKill("/core/resource-manager/index.js", "home");
  }

  // Start resource manager
  const pid = ns.exec(
    "/core/resource-manager/index.js",
    "home",
    1,
    JSON.stringify(config),
    config.moneyThreshold,
    config.securityThreshold,
    config.homeReservedRam
  );

  if (pid === 0) {
    ns.tprint("❌ Failed to start resource manager!");
  } else {
    ns.print("✅ Resource manager started successfully");
  }
}

/**
 * Deploy resource manager to coordinate tasks
 * @param {NS} ns - NetScript API
 * @param {Array} availableServers - List of available servers
 */
async function copyFilesToAvailableServers(ns, availableServers) {
  // Filter out home server
  const servers = availableServers.filter((s) => s.name !== "home") || [];
  ns.print(
    `🔄 Copying essential files to ${servers.length} purchased servers...`
  );
  // Files to copy
  const filesToCopy = [
    "/core/workers/worker.js",
    "/core/operations/hack.js",
    "/core/operations/grow.js",
    "/core/operations/weaken.js",
  ];

  // Copy to each server
  for (const server of servers) {
    ns.print("Copy files to server: " + server.name);
    try {
      // Copy files if they don't exist
      for (const file of filesToCopy) {
        if (!ns.fileExists(file, server.name)) {
          ns.scp(file, server.name, "home");
        }
      }
    } catch (error) {
      ns.print(`Error copying files to ${server.name}: ${error}`);
    }
  }
}
