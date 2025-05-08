/**
 * Module for deploying batches of hack, grow, weaken scripts
 */

import { analyzeTarget } from "/v5/target-finder.js";

/**
 * Defines different batch tiers based on RAM availability
 * @typedef {Object} BatchTier
 * @property {string} name - Name of the tier
 * @property {number} hackPercent - Percentage of money to hack
 * @property {number} growMultiplier - How much to grow by
 * @property {number} minRam - Minimum RAM required for this tier
 */

/**
 * Returns available batch tiers from lowest to highest RAM requirement
 * @returns {BatchTier[]} Array of batch tiers
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
    },
    {
      name: "large",
      hackPercent: 0.15, // Steal 15% of money
      growMultiplier: 1.18, // Grow by 18%
      minRam: 64 // Requires 64GB RAM
    },
    {
      name: "huge",
      hackPercent: 0.25, // Steal 25% of money
      growMultiplier: 1.35, // Grow by 35%
      minRam: 128 // Requires 128GB RAM
    },
    {
      name: "massive",
      hackPercent: 0.4, // Steal 40% of money
      growMultiplier: 1.7, // Grow by 70%
      minRam: 256 // Requires 256GB RAM
    }
  ];
}

/**
 * Selects the best batch tier that can fit within the available RAM
 * @param {NS} ns - NetScript API
 * @param {number} availableRam - Available RAM in GB
 * @param {string} weakenScript - Path to weaken script
 * @param {string} growScript - Path to grow script
 * @param {string} hackScript - Path to hack script
 * @param {string} targetServer - Target server hostname
 * @returns {Object|null} Selected batch configuration or null if none fit
 */
function selectBatchTier(ns, availableRam, weakenScript, growScript, hackScript, targetServer) {
  const wRam = ns.getScriptRam(weakenScript);
  const gRam = ns.getScriptRam(growScript);
  const hRam = ns.getScriptRam(hackScript);
  
  // Always log exact RAM values for debugging
  ns.print(`Script RAM requirements: weaken=${wRam}GB, grow=${gRam}GB, hack=${hRam}GB`);
  
  // Very tight calculation for 16GB servers
  if (availableRam >= 14 && availableRam <= 17) {
    // Guaranteed to work on 16GB servers even with slightly varying script sizes
    const hackThreads = 1;
    const growThreads = 2;
    const weakenThreadsForHack = 1;
    const weakenThreadsForGrow = 1;
    
    const batchRam = (hackThreads * hRam) + 
                     (growThreads * gRam) + 
                     (weakenThreadsForHack * wRam) + 
                     (weakenThreadsForGrow * wRam);
    
    // Print detailed info
    ns.print(`16GB SERVER BATCH: RAM needed: ${batchRam.toFixed(2)}GB vs ${availableRam.toFixed(2)}GB available`);
    
    if (batchRam <= availableRam) {
      const maxMoney = ns.getServerMaxMoney(targetServer);
      return {
        tier: "16GB-special",
        hackThreads,
        growThreads,
        weakenThreadsForHack,
        weakenThreadsForGrow,
        batchRam,
        hackAmount: maxMoney * 0.01,
        growMultiplier: 1.03
      };
    } else {
      ns.print(`ERROR: Even minimal 16GB configuration doesn't fit: ${batchRam.toFixed(2)}GB needed!`);
    }
  }
  
  // Get all available tiers
  const tiers = getBatchTiers();
  
  // Try micro tier first for small servers
  if (availableRam < 32) {
    const tier = tiers[0]; // micro tier
    
    // Very small thread counts
    let hackThreads = 1;
    let growThreads = 1;
    const weakenThreadsForHack = 1;
    const weakenThreadsForGrow = 1;
    
    // Calculate RAM
    const microBatchRam = (hackThreads * hRam) + 
                         (growThreads * gRam) + 
                         (weakenThreadsForHack * wRam) + 
                         (weakenThreadsForGrow * wRam);
    
    // If it fits, use it
    if (microBatchRam <= availableRam) {
      const maxMoney = ns.getServerMaxMoney(targetServer);
      return {
        tier: "micro",
        hackThreads,
        growThreads,
        weakenThreadsForHack,
        weakenThreadsForGrow,
        batchRam: microBatchRam,
        hackAmount: maxMoney * 0.01,
        growMultiplier: 1.01
      };
    }
  }
  
  // Continue with normal tier selection for larger servers
  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    
    // Skip high tiers for small servers
    if (tier.minRam > availableRam) continue;
    
    // Calculate thread requirements for this tier
    const maxMoney = ns.getServerMaxMoney(targetServer);
    const hackAmount = maxMoney * tier.hackPercent;
    
    let hackThreads = Math.floor(ns.hackAnalyzeThreads(targetServer, hackAmount));
    if (!Number.isFinite(hackThreads) || hackThreads < 1) hackThreads = 1;
    
    let growThreads = Math.ceil(ns.growthAnalyze(targetServer, tier.growMultiplier));
    if (!Number.isFinite(growThreads) || growThreads < 1) growThreads = 1;
    
    // Calculate weaken threads needed to counteract security increase
    const hackSecurityIncrease = hackThreads * 0.002;
    const growSecurityIncrease = growThreads * 0.004;
    const weakenThreadsForHack = Math.ceil(hackSecurityIncrease / 0.05);
    const weakenThreadsForGrow = Math.ceil(growSecurityIncrease / 0.05);
    
    // Calculate total RAM needed
    const batchRam = (hackThreads * hRam) + 
                     (growThreads * gRam) + 
                     (weakenThreadsForHack * wRam) + 
                     (weakenThreadsForGrow * wRam);
    
    // Print batch size for this tier
    ns.print(`${tier.name} tier: RAM=${batchRam.toFixed(2)}GB, threads: h=${hackThreads}, g=${growThreads}, w1=${weakenThreadsForHack}, w2=${weakenThreadsForGrow}`);
    
    // If this tier fits in the available RAM, use it
    if (batchRam <= availableRam) {
      return {
        tier: tier.name,
        hackThreads,
        growThreads,
        weakenThreadsForHack,
        weakenThreadsForGrow,
        batchRam,
        hackAmount,
        growMultiplier: tier.growMultiplier
      };
    }
  }
  
  // If everything else failed, try a minimal batch with just 1 thread each
  const minimalBatchRam = hRam + gRam + (2 * wRam);
  
  if (minimalBatchRam <= availableRam) {
    ns.print(`Using minimal batch configuration: ${minimalBatchRam.toFixed(2)}GB`);
    return {
      tier: "minimal",
      hackThreads: 1,
      growThreads: 1,
      weakenThreadsForHack: 1,
      weakenThreadsForGrow: 1,
      batchRam: minimalBatchRam,
      hackAmount: 0,
      growMultiplier: 1.01
    };
  }
  
  // If even a minimal batch doesn't fit, return null
  ns.print(`Cannot fit any batch on server with ${availableRam.toFixed(2)}GB RAM`);
  return null;
}

/**
 * Deploy batches of hack, grow, weaken scripts to available servers
 * @param {NS} ns - NetScript API
 * @param {{name: string, money: number, security: number, hackTime: number, growTime: number, weakenTime: number, score: number}} target - Target server info
 * @param {string[]} servers - List of available servers
 * @param {number} delayStep - Milliseconds between operations
 * @param {number} maxBatchesPerHost - Maximum batches per host
 * @returns {number} - Total number of batches deployed
 */
export async function deployBatchesForTarget(ns, target, servers, delayStep, maxBatchesPerHost) {
  const { name: server } = target;

  // Script paths
  const weakenScript = "/shared/weaken.js";
  const growScript = "/shared/grow.js";
  const hackScript = "/shared/hack.js";

  // Get RAM requirements for scripts
  const wRam = ns.getScriptRam(weakenScript);
  const gRam = ns.getScriptRam(growScript);
  const hRam = ns.getScriptRam(hackScript);

  // Analyze the target to get thread counts for standard batch
  const analysis = analyzeTarget(ns, server);
  const standardBatchRam = (analysis.hackThreads * hRam) + 
                         (analysis.growThreads * gRam) + 
                         (analysis.weakenThreadsForHack * wRam) + 
                         (analysis.weakenThreadsForGrow * wRam);

  // Tracking variables
  let totalBatchCount = 0;
  let hostsUsed = 0;
  let insufficientRamServers = 0;
  
  // Debug info
  ns.print(`🔄 Targeting ${server} - Standard batch RAM: ${standardBatchRam.toFixed(2)}GB`);

  // Get our purchased servers and home
  const purchasedServers = ns.getPurchasedServers();
  const ourServers = ["home", ...purchasedServers];
  
  // First, kill all scripts on purchased servers to free up RAM
  for (const pserv of purchasedServers) {
    if (ns.getServerUsedRam(pserv) > 0) {
      ns.killall(pserv);
      ns.print(`🔄 Killed all scripts on ${pserv} to free up RAM`);
    }
  }
  
  // Process all servers (our servers first, then hacked servers)
  const allServers = [...ourServers, ...servers.filter(s => !ourServers.includes(s))];
  
  // Add more verbose debugging
  ns.tprint("🔍 Detailed server scanning:");
  for (const host of ourServers) {
    const maxRam = ns.getServerMaxRam(host);
    const usedRam = ns.getServerUsedRam(host);
    const availRam = maxRam - usedRam;
    ns.tprint(`   - ${host}: ${availRam.toFixed(2)}GB / ${maxRam}GB available`);
  }
  
  for (const host of allServers) {
    // Only check for root access
    if (!ns.hasRootAccess(host)) {
      ns.tprint(`⚠️ Server ${host} skipped: No root access`);
      continue;
    }
    
    // Calculate available RAM
    const availableRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    
    // Select the most appropriate batch tier for this server
    const batchConfig = selectBatchTier(ns, availableRam, weakenScript, growScript, hackScript, server);
    
    // If no suitable batch configuration was found, skip this server
    if (!batchConfig) {
      insufficientRamServers++;
      ns.tprint(`⚠️ Server ${host} skipped: Insufficient RAM (${availableRam.toFixed(2)}GB available)`);
      continue;
    }
    
    // Calculate max batches possible on this host based on available RAM
    const possibleBatches = Math.floor(availableRam / batchConfig.batchRam);
    // Limit to maxBatchesPerHost
    const batchesToDeploy = Math.min(possibleBatches, maxBatchesPerHost);
    
    if (batchesToDeploy <= 0) {
      ns.tprint(`⚠️ Server ${host} skipped: Can't deploy any batches`);
      continue;
    }
    
    // Deploy batches to this host
    await deployAdaptiveBatchesToHost(
      ns, 
      host, 
      server, 
      batchesToDeploy, 
      {
        weakenScript,
        growScript,
        hackScript,
        hackThreads: batchConfig.hackThreads,
        growThreads: batchConfig.growThreads,
        weakenThreadsForHack: batchConfig.weakenThreadsForHack,
        weakenThreadsForGrow: batchConfig.weakenThreadsForGrow,
        hackTime: analysis.hackTime,
        growTime: analysis.growTime,
        weakenTime: analysis.weakenTime,
        delayStep
      }
    );
    
    hostsUsed++;
    totalBatchCount += batchesToDeploy;
    ns.print(`✅ Deployed ${batchesToDeploy} ${batchConfig.tier} batches on ${host} (${batchConfig.batchRam.toFixed(2)}GB each)`);
  }
  
  // Print summary
  ns.print(`🔄 Total: ${totalBatchCount} batches deployed on ${hostsUsed} hosts for ${server}`);
  
  return totalBatchCount;
}

/**
 * Helper function to deploy adaptive batches to a specific host
 * @param {NS} ns - NetScript API
 * @param {string} host - Host to deploy to
 * @param {string} target - Target server to hack
 * @param {number} numBatches - Number of batches to deploy
 * @param {Object} params - Parameters for deployment
 * @returns {Promise<void>}
 */
async function deployAdaptiveBatchesToHost(ns, host, target, numBatches, params) {
  const {
    weakenScript,
    growScript,
    hackScript,
    hackThreads,
    growThreads,
    weakenThreadsForHack,
    weakenThreadsForGrow,
    hackTime,
    growTime,
    weakenTime,
    delayStep
  } = params;
  
  // Copy scripts to host if needed
  await ns.scp([weakenScript, growScript, hackScript], "home", host);
  
  // Special handling for public servers (not purchased servers or home)
  const isPurchasedServer = ns.getPurchasedServers().includes(host);
  const isPublicServer = host !== "home" && !isPurchasedServer;
  
  // For public servers, use more conservative approach
  if (isPublicServer) {
    ns.print(`⚠️ ${host} is a public server - using more conservative deployment`);
    
    // For public servers, check if we can run the scripts
    const availableRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    const totalRamPerBatch = (hackThreads * ns.getScriptRam(hackScript)) +
                              (growThreads * ns.getScriptRam(growScript)) +
                              ((weakenThreadsForHack + weakenThreadsForGrow) * ns.getScriptRam(weakenScript));
    
    if (availableRam < totalRamPerBatch) {
      ns.print(`⚠️ Public server ${host} has insufficient RAM: ${availableRam.toFixed(2)}GB available, ${totalRamPerBatch.toFixed(2)}GB needed`);
      return;
    }
    
    // Use a single combined script for public servers
    try {
      // Define a unique filename based on target and timestamp to avoid conflicts
      const timestamp = new Date().getTime();
      const combinedScriptName = `/tmp/${target}-batch-${timestamp}.js`;
      
      // Create a script that will run the whole batch
      const scriptContent = `
        /** @param {NS} ns */
        export async function main(ns) {
          const target = "${target}";
          const w1Delay = ${weakenTime - hackTime - delayStep};
          const hackDelay = ${weakenTime - hackTime - delayStep};
          const growDelay = ${weakenTime - growTime - 2 * delayStep};
          const w2Delay = ${3 * delayStep};
          
          // Run the operations
          ns.print("⏳ Starting combined batch on ${host} targeting ${target}");
          
          // First weaken
          ns.run("/shared/weaken.js", ${weakenThreadsForHack}, target, w1Delay);
          await ns.sleep(100);
          
          // Hack
          ns.run("/shared/hack.js", ${hackThreads}, target, hackDelay);
          await ns.sleep(100);
          
          // Grow
          ns.run("/shared/grow.js", ${growThreads}, target, growDelay);
          await ns.sleep(100);
          
          // Second weaken
          ns.run("/shared/weaken.js", ${weakenThreadsForGrow}, target, w2Delay);
          
          // Wait for completion
          await ns.sleep(weakenTime + 5000);
          ns.print("✅ Combined batch completed");
        }
      `;
      
      // Write the script to the server
      await ns.write(combinedScriptName, scriptContent, "w");
      await ns.scp(combinedScriptName, "home", host);
      
      // Run the combined script
      ns.exec(combinedScriptName, host, 1);
      ns.print(`✅ Deployed resilient batch on public server ${host}`);
      
    } catch (error) {
      ns.print(`❌ Error deploying to public server ${host}: ${error}`);
    }
    
    return;
  }
  
  // Regular deployment for purchased servers and home
  // Deploy batches with sequential timing
  for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
    // Calculate timing for this batch
    const batchOffset = batchIndex * 4 * delayStep;
    
    // The order of execution should be:
    // 1. First weaken (for hack) completes at weakenTime
    // 2. Hack completes at weakenTime - delayStep
    // 3. Grow completes at weakenTime - 2*delayStep
    // 4. Second weaken (for grow) completes at weakenTime - 3*delayStep
    
    // Calculate delays to achieve this order
    const w1Delay = batchOffset;
    const hackDelay = w1Delay + (weakenTime - hackTime - delayStep);
    const growDelay = w1Delay + (weakenTime - growTime - 2 * delayStep);
    const w2Delay = w1Delay + (3 * delayStep);
    
    // Schedule the scripts with appropriate delays and args
    ns.exec(weakenScript, host, weakenThreadsForHack, target, w1Delay);
    ns.exec(hackScript, host, hackThreads, target, hackDelay);
    ns.exec(growScript, host, growThreads, target, growDelay);
    ns.exec(weakenScript, host, weakenThreadsForGrow, target, w2Delay);
  }
}