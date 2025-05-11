/**
 * Module for managing purchased servers
 */

/**
 * Manages purchased servers (buying and upgrading)
 * @param {NS} ns
 * @param {number} minRam - Minimum RAM for new servers
 * @param {number} maxRam - Maximum RAM for servers
 * @param {number} upgradeThreshold - Factor for upgrade decisions
 * @param {boolean} [shouldUpgradeServers=true] - Whether to upgrade existing servers
 */
export async function manageServers(ns, minRam, maxRam, upgradeThreshold, shouldUpgradeServers = true) {
  const maxServers = ns.getPurchasedServerLimit();
  const currentServers = ns.getPurchasedServers();

  // Calculate RAM required for a typical batch
  const estimatedBatchRam = calculateBatchRamRequirement(ns);
  
  ns.tprint(`💻 Server management: ${currentServers.length}/${maxServers} servers purchased`);
  ns.tprint(`📊 Estimated RAM needed per batch: ${estimatedBatchRam.toFixed(2)}GB`);

  // Available money for server purchases
  const money = ns.getServerMoneyAvailable("home");
  // Reserve some money - only use 60% of available funds for servers
  let budget = money * 0.6;

  if (currentServers.length < maxServers) {
    await buyNewServers(ns, currentServers, budget, minRam, maxRam, estimatedBatchRam);
  } else if (shouldUpgradeServers) {
    // Only upgrade existing servers if shouldUpgradeServers is true
    await upgradeExistingServers(ns, currentServers, budget, maxRam, upgradeThreshold, estimatedBatchRam);
  } else {
    ns.tprint("ℹ️ Server upgrades are disabled. Set shouldUpgradeServers to true to enable.");
  }
}

/**
 * Calculate how much RAM a typical batch requires
 * @param {NS} ns
 * @returns {number} RAM requirement in GB
 */
function calculateBatchRamRequirement(ns) {
  const weakenRam = ns.getScriptRam("/shared/weaken.js");
  const growRam = ns.getScriptRam("/shared/grow.js");
  const hackRam = ns.getScriptRam("/shared/hack.js");
  
  // Define batch tiers similar to those in batch-deployer.js
  const batchTiers = [
    { name: "micro", minRam: 2, threadRatio: { weaken: 1, grow: 1, hack: 1 } },
    { name: "tiny", minRam: 4, threadRatio: { weaken: 1, grow: 2, hack: 1 } },
    { name: "small", minRam: 8, threadRatio: { weaken: 2, grow: 3, hack: 1 } },
    { name: "medium", minRam: 16, threadRatio: { weaken: 2, grow: 5, hack: 2 } },
    { name: "standard", minRam: 32, threadRatio: { weaken: 3, grow: 7, hack: 3 } }
  ];
  
  // Find which batch tier works best for most servers
  // For server manager, we'll use the "small" tier as our baseline
  const targetTier = batchTiers.find(tier => tier.name === "small");
  
  // Calculate the RAM needed for this tier
  const tierRam = (targetTier.threadRatio.weaken * 2 * weakenRam) + 
                  (targetTier.threadRatio.grow * growRam) + 
                  (targetTier.threadRatio.hack * hackRam);
  
  return tierRam;
}

/**
 * Buy new servers if slots are available
 * @param {NS} ns
 * @param {string[]} currentServers - List of current purchased servers
 * @param {number} budget - Money available for purchases
 * @param {number} minRam - Minimum RAM for new servers
 * @param {number} maxRam - Maximum RAM limit
 * @param {number} batchRam - RAM needed for one batch
 */
async function buyNewServers(ns, currentServers, budget, minRam, maxRam, batchRam) {
  // Determine maximum affordable RAM (limited by maxRam)
  let ram = minRam;
  while (ram * 2 <= maxRam && ns.getPurchasedServerCost(ram * 2) <= budget / 5) {
    ram *= 2;
  }

  // Buy server if RAM requirement is met and it can run at least one batch
  if (ram >= minRam && ram >= batchRam) {
    const cost = ns.getPurchasedServerCost(ram);
    const serverName = `pserv-${currentServers.length}`;
    ns.tprint(`🛒 Buying new server: ${serverName} with ${ram}GB RAM for $${cost.toLocaleString()}`);
    ns.purchaseServer(serverName, ram);
  }
}

/**
 * Upgrade existing servers when all slots are filled
 * @param {NS} ns
 * @param {string[]} currentServers - List of current purchased servers
 * @param {number} budget - Money available for upgrades
 * @param {number} maxRam - Maximum RAM limit
 * @param {number} upgradeThreshold - Minimum factor for an upgrade to be worthwhile
 * @param {number} batchRam - RAM needed for one batch
 */
async function upgradeExistingServers(ns, currentServers, budget, maxRam, upgradeThreshold, batchRam) {
  // First identify servers that don't have enough RAM
  const serversToUpgrade = [];
  for (const server of currentServers) {
    const currentRam = ns.getServerMaxRam(server);
    if (currentRam < batchRam) {
      // Critical priority - server can't run a single batch
      serversToUpgrade.push({
        name: server,
        ram: currentRam,
        priority: 1
      });
    } else if (currentRam < batchRam * 5) {
      // Medium priority - server can run some batches but could be better
      serversToUpgrade.push({
        name: server,
        ram: currentRam,
        priority: 2
      });
    } else if (currentRam < maxRam) {
      // Low priority - server is adequate but can still be upgraded
      serversToUpgrade.push({
        name: server,
        ram: currentRam,
        priority: 3
      });
    }
  }
  
  // Sort by priority (lowest number = highest priority) then by RAM (lowest RAM first)
  serversToUpgrade.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.ram - b.ram;
  });
  
  // Display upgrade plan
  if (serversToUpgrade.length > 0) {
    ns.tprint("🔄 Upgrade plan:");
    for (const server of serversToUpgrade) {
      const priority = server.priority === 1 ? "HIGH" : server.priority === 2 ? "MEDIUM" : "LOW";
      ns.tprint(`   - ${server.name}: ${server.ram}GB RAM (Priority: ${priority})`);
    }
  }

  // Perform upgrades in order of priority
  for (const serverInfo of serversToUpgrade) {
    // Skip if we've used up our budget
    if (budget <= 0) break;

    const serverToUpgrade = serverInfo.name;
    const currentRam = serverInfo.ram;

    // Skip if server already has maximum RAM
    if (currentRam >= maxRam) continue;

    // Calculate next RAM tier
    // For critical servers, try to get them to at least enough to run one batch
    let nextRam;
    if (serverInfo.priority === 1) {
      // Critical priority - double RAM until it can run at least one batch
      nextRam = Math.max(currentRam * 2, Math.pow(2, Math.ceil(Math.log2(batchRam))));
    } else {
      // For other priorities, just double the RAM
      nextRam = currentRam * 2;
    }
    
    // Cap at max RAM
    nextRam = Math.min(nextRam, maxRam);

    // Only upgrade if the increase is significant enough or is critical priority
    if (serverInfo.priority === 1 || nextRam / currentRam >= upgradeThreshold) {
      const cost = ns.getPurchasedServerCost(nextRam);

      // Skip if we can't afford this upgrade
      if (cost > budget) continue;

      const priorityLabel = serverInfo.priority === 1 ? "🔴 CRITICAL" : 
                           serverInfo.priority === 2 ? "🟠 MEDIUM" : "🟢 LOW";
                           
      ns.tprint(`${priorityLabel} Upgrading server ${serverToUpgrade} from ${currentRam}GB to ${nextRam}GB RAM for $${cost.toLocaleString()}`);
      ns.killall(serverToUpgrade);
      ns.deleteServer(serverToUpgrade);
      ns.purchaseServer(serverToUpgrade, nextRam);

      // Reduce our budget by the cost
      budget -= cost;
    }
  }
}