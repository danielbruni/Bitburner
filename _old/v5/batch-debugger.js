/**
 * Batch Tier Debug Tool
 * Tests batch tier selection for a specific server to identify deployment issues
 */

/** @param {NS} ns */
export async function main(ns) {
  // Configuration - change these as needed
  const targetServer = ns.args[0] || "n00dles"; // Default target if none specified
  const serverToTest = ns.args[1]; // Server to test batch configurations for
  
  // If no specific server is provided, test for all purchased servers
  const serversToTest = serverToTest ? [serverToTest] : ["home", ...ns.getPurchasedServers()];
  
  // Header
  ns.tprint("============= BATCH TIER DEBUG TOOL =============");
  ns.tprint(`Target server: ${targetServer}`);
  ns.tprint(`Testing batch configurations for ${serversToTest.length} servers`);
  ns.tprint("=================================================");
  
  // Script paths
  const weakenScript = "/shared/weaken.js";
  const growScript = "/shared/grow.js";
  const hackScript = "/shared/hack.js";

  // Check if scripts exist
  for (const script of [weakenScript, growScript, hackScript]) {
    if (!ns.fileExists(script, "home")) {
      ns.tprint(`ERROR: Script ${script} missing! Please create it first.`);
      return;
    }
  }
  
  // Get RAM requirements for scripts
  const wRam = ns.getScriptRam(weakenScript);
  const gRam = ns.getScriptRam(growScript);
  const hRam = ns.getScriptRam(hackScript);
  
  ns.tprint(`Script RAM requirements: weaken=${wRam}GB, grow=${gRam}GB, hack=${hRam}GB`);
  ns.tprint("=================================================");
  
  // Test each server
  for (const server of serversToTest) {
    if (!ns.serverExists(server)) {
      ns.tprint(`Server ${server} does not exist. Skipping...`);
      continue;
    }
    
    const maxRam = ns.getServerMaxRam(server);
    const usedRam = ns.getServerUsedRam(server);
    const availableRam = maxRam - usedRam;
    
    ns.tprint(`\nTesting server: ${server}`);
    ns.tprint(`RAM: ${availableRam.toFixed(2)}GB / ${maxRam}GB available`);
    
    // Test each batch tier
    const batchTiers = getBatchTiers();
    ns.tprint("Possible batch configurations:");
    
    let viableTierFound = false;
    
    for (const tier of batchTiers) {
      // Calculate thread requirements for this tier
      const threadConfig = calculateThreadsForTier(ns, targetServer, tier);
      
      // Calculate RAM requirements
      const batchRam = calculateBatchRam(threadConfig, wRam, gRam, hRam);
      
      // Check if this tier fits
      const fits = batchRam <= availableRam;
      const batches = fits ? Math.floor(availableRam / batchRam) : 0;
      
      // Print details
      const statusSymbol = fits ? "✅" : "❌";
      ns.tprint(`${statusSymbol} ${tier.name.padEnd(8)} tier: ${batchRam.toFixed(2)}GB per batch, could run ${batches} batches`);
      
      // Print thread details for debugging
      if (fits) {
        viableTierFound = true;
        ns.tprint(`  Thread counts: hack=${threadConfig.hackThreads}, grow=${threadConfig.growThreads}, ` +
                 `weaken1=${threadConfig.weakenThreadsForHack}, weaken2=${threadConfig.weakenThreadsForGrow}`);
      }
    }
    
    // Check if any tier is viable
    if (!viableTierFound) {
      ns.tprint(`⚠️ WARNING: No viable batch configuration found for ${server} with ${availableRam.toFixed(2)}GB available`);
      
      // Check if a minimal configuration would work
      const minimalBatchRam = wRam * 2 + gRam + hRam;
      if (minimalBatchRam <= availableRam) {
        ns.tprint(`ℹ️ A minimal batch (1 thread each) would require ${minimalBatchRam.toFixed(2)}GB and should work`);
      }
    }
  }
}

/**
 * Returns available batch tiers from lowest to highest RAM requirement
 * @returns {Array} Array of batch tiers
 */
function getBatchTiers() {
  return [
    {
      name: "micro",
      hackPercent: 0.01, // Steal just 1% of money
      growMultiplier: 1.01, // Grow by 1%
      minRam: 2 // Can run on servers with just 2GB RAM
    },
    {
      name: "tiny",
      hackPercent: 0.03, // Steal 3% of money
      growMultiplier: 1.03, // Grow by 3%
      minRam: 4 // Requires 4GB RAM
    },
    {
      name: "small",
      hackPercent: 0.05, // Steal 5% of money
      growMultiplier: 1.05, // Grow by 5%
      minRam: 8 // Requires 8GB RAM
    },
    {
      name: "medium",
      hackPercent: 0.07, // Steal 7% of money
      growMultiplier: 1.08, // Grow by 8%
      minRam: 16 // Requires 16GB RAM
    },
    {
      name: "standard",
      hackPercent: 0.1, // Steal 10% of money
      growMultiplier: 1.12, // Grow by 12%
      minRam: 32 // Requires 32GB RAM
    }
  ];
}

/**
 * Calculates thread requirements for a specific batch tier
 * @param {NS} ns - NetScript API
 * @param {string} targetServer - Target server to hack
 * @param {Object} tier - Batch tier configuration
 * @returns {Object} Thread counts for each script
 */
function calculateThreadsForTier(ns, targetServer, tier) {
  const maxMoney = ns.getServerMaxMoney(targetServer);
  const hackAmount = maxMoney * tier.hackPercent;
  
  // Calculate hack threads needed
  let hackThreads = Math.floor(ns.hackAnalyzeThreads(targetServer, hackAmount));
  if (!Number.isFinite(hackThreads) || hackThreads < 1) hackThreads = 1;
  
  // Calculate grow threads needed
  let growThreads = Math.ceil(ns.growthAnalyze(targetServer, tier.growMultiplier));
  if (!Number.isFinite(growThreads) || growThreads < 1) growThreads = 1;
  
  // Calculate weaken threads needed
  const hackSecurityIncrease = hackThreads * 0.002;
  const growSecurityIncrease = growThreads * 0.004;
  const weakenThreadsForHack = Math.ceil(hackSecurityIncrease / 0.05);
  const weakenThreadsForGrow = Math.ceil(growSecurityIncrease / 0.05);
  
  return {
    hackThreads,
    growThreads,
    weakenThreadsForHack,
    weakenThreadsForGrow
  };
}

/**
 * Calculate RAM required for a batch with the given thread counts
 * @param {Object} threadConfig - Thread configuration object
 * @param {number} wRam - RAM required by weaken.js
 * @param {number} gRam - RAM required by grow.js
 * @param {number} hRam - RAM required by hack.js
 * @returns {number} - Total RAM required in GB
 */
function calculateBatchRam(threadConfig, wRam, gRam, hRam) {
  return (threadConfig.hackThreads * hRam) + 
         (threadConfig.growThreads * gRam) + 
         (threadConfig.weakenThreadsForHack * wRam) + 
         (threadConfig.weakenThreadsForGrow * wRam);
}