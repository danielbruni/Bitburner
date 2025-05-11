/** @param {NS} ns */
export async function main(ns) {
  // Configuration
  const CONFIG = {
    targetUpdateInterval: 60000, // How often to reassess targets (ms)
    serverUpdateInterval: 10000, // How often to scan for new servers (ms)
    homeReservedRam: 20, // GB of RAM to reserve on home server
    shouldUpgradeServers: false, // Set to true to upgrade purchased servers
    moneyThreshold: 0.75, // Hack when server has this much money (75%)
    securityThreshold: 5, // Extra security above minimum to tolerate
    logLevel: 1, // 0: minimal, 1: normal, 2: verbose
  };

  // Initialize script
  initializeScript(ns, CONFIG);
}

/**
 * Initialize script and check for necessary dependencies
 * @param {NS} ns - NetScript API
 * @param {Object} config - Script configuration
 */
function initializeScript(ns, config) {
  ns.disableLog("ALL");

  // Required scripts
  const requiredScripts = [
    "/shared/hack.js",
    "/shared/grow.js",
    "/shared/weaken.js",
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
  ns.tprint("Initializing system...");
}
