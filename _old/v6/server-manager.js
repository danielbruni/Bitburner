/**
 * v6/server-manager.js - Server discovery and management
 * Identifies, tracks, and prepares servers for use in hacking operations
 */

/** @param {NS} ns */
export async function main(ns) {
  // Parse command line arguments
  const shouldUpgradeServers = ns.args[0] === true;
  const homeReservedRam = ns.args[1] || 10; // GB of RAM to reserve on home
  
  // Create data directory if it doesn't exist
  if (!ns.fileExists('/v6/data/servers.txt')) {
    ns.write('/v6/data/servers.txt', JSON.stringify({available: [], targets: []}), 'w');
  }
  
  // Disable logs
  ns.disableLog('ALL');
  
  // First, handle owned server purchasing/upgrading
  await manageOwnedServers(ns, shouldUpgradeServers);
  
  // Then scan and categorize all servers
  const serverMap = await scanAllServers(ns, homeReservedRam);
  
  // Output the results to data files
  outputServerData(ns, serverMap);
  
  ns.print("✅ Server manager completed successfully");
}

/**
 * Purchase and manage owned servers
 * @param {NS} ns - NetScript API
 * @param {boolean} shouldUpgrade - Whether to upgrade existing servers
 */
async function manageOwnedServers(ns, shouldUpgrade) {
  // Get current purchased servers
  const purchasedServers = ns.getPurchasedServers();
  const maxServers = ns.getPurchasedServerLimit();
  
  // Check how much money we have to spend
  const money = ns.getPlayer().money;
  const maxAffordableRam = getMaxAffordableRam(ns, money);
  
  // Report status
  ns.print(`💻 Server management: ${purchasedServers.length}/${maxServers} servers purchased`);
  ns.print(`💰 Available funds: $${formatMoney(money)}`);
  ns.print(`🖥️ Max affordable RAM: ${maxAffordableRam}GB`);
  
  if (shouldUpgrade) {
    // Upgrade existing servers if we can afford better ones
    for (const server of purchasedServers) {
      const currentRam = ns.getServerMaxRam(server);
      
      // Only upgrade if we can afford at least double the RAM
      if (currentRam < maxAffordableRam / 2) {
        // Calculate optimal RAM upgrade
        const upgradeRam = Math.min(maxAffordableRam, Math.pow(2, Math.floor(Math.log2(maxAffordableRam))));
        
        // Delete and replace the server
        ns.killall(server);
        ns.deleteServer(server);
        ns.purchaseServer(server, upgradeRam);
        
        ns.print(`🔄 Upgraded ${server} from ${currentRam}GB to ${upgradeRam}GB RAM`);
      }
    }
  } else {
    ns.print(`ℹ️ Server upgrades are disabled. Set shouldUpgradeServers to true to enable.`);
  }
  
  // Buy new servers if we don't have max
  while (purchasedServers.length < maxServers) {
    // Get minimum viable RAM (starting with 16GB if possible)
    const ram = Math.min(Math.max(16, maxAffordableRam), 
                          Math.pow(2, Math.floor(Math.log2(maxAffordableRam))));
    
    // Check if we can afford it
    const cost = ns.getPurchasedServerCost(ram);
    if (ns.getPlayer().money < cost) {
      ns.print(`⚠️ Cannot afford more servers right now. Need $${formatMoney(cost)} for a ${ram}GB server.`);
      break;
    }
    
    // Buy the server
    const serverName = `pserv-${purchasedServers.length}`;
    ns.purchaseServer(serverName, ram);
    ns.print(`✅ Purchased new server ${serverName} with ${ram}GB RAM`);
    
    // Update our list
    purchasedServers.push(serverName);
  }
}

/**
 * Scan all servers in the network and categorize them
 * @param {NS} ns - NetScript API
 * @param {number} homeReservedRam - GB of RAM to reserve on home
 * @returns {Object} Map of servers categorized by type
 */
async function scanAllServers(ns, homeReservedRam) {
  // Initialize server collections
  const availableServers = [];
  const targetServers = [];
  
  // Start with home
  const toScan = ['home'];
  const scanned = new Set();
  
  // Breadth-first scan of all servers
  while (toScan.length > 0) {
    const server = toScan.shift();
    
    // Skip if already scanned
    if (scanned.has(server)) continue;
    scanned.add(server);
    
    // Scan for connected servers
    const connectedServers = ns.scan(server);
    for (const connectedServer of connectedServers) {
      if (!scanned.has(connectedServer)) {
        toScan.push(connectedServer);
      }
    }
    
    // Try to gain root access if we don't have it
    if (!ns.hasRootAccess(server) && server !== 'home') {
      await tryGetRootAccess(ns, server);
    }
    
    // Categorize the server
    categorizeServer(ns, server, availableServers, targetServers, homeReservedRam);
  }
  
  // Sort target servers by scoring
  targetServers.sort((a, b) => b.score - a.score);
  
  return {
    available: availableServers,
    targets: targetServers
  };
}

/**
 * Try to gain root access to a server using available exploits
 * @param {NS} ns - NetScript API
 * @param {string} server - Server to target
 */
async function tryGetRootAccess(ns, server) {
  // Check required hacking skill
  const requiredHackingSkill = ns.getServerRequiredHackingLevel(server);
  const playerHackingSkill = ns.getPlayer().skills.hacking;
  
  if (playerHackingSkill < requiredHackingSkill) {
    return; // Can't hack this yet
  }
  
  // Check which ports we need to open
  const requiredPorts = ns.getServerNumPortsRequired(server);
  let openablePorts = 0;
  
  // Check which programs we have available
  const portOpeners = [
    { program: 'BruteSSH.exe', method: ns.brutessh },
    { program: 'FTPCrack.exe', method: ns.ftpcrack },
    { program: 'relaySMTP.exe', method: ns.relaysmtp },
    { program: 'HTTPWorm.exe', method: ns.httpworm },
    { program: 'SQLInject.exe', method: ns.sqlinject }
  ];
  
  // Open ports if we have the programs
  for (const opener of portOpeners) {
    if (ns.fileExists(opener.program, 'home')) {
      try {
        opener.method(server);
        openablePorts++;
      } catch (e) {
        // Port may already be open
      }
    }
  }
  
  // Nuke if we can
  if (openablePorts >= requiredPorts) {
    ns.nuke(server);
    ns.print(`🔓 Gained root access to ${server}`);
  }
}

/**
 * Categorize a server as either available for running scripts or a target for hacking
 * @param {NS} ns - NetScript API
 * @param {string} server - Server to categorize
 * @param {Array} availableServers - Array to add available servers to
 * @param {Array} targetServers - Array to add target servers to
 * @param {number} homeReservedRam - GB of RAM to reserve on home
 */
function categorizeServer(ns, server, availableServers, targetServers, homeReservedRam) {
  // Check if we have root access
  const hasRoot = ns.hasRootAccess(server);
  
  // Calculate server metrics
  const maxRam = ns.getServerMaxRam(server);
  const maxMoney = ns.getServerMaxMoney(server);
  const minSecurity = ns.getServerMinSecurityLevel(server);
  const growthFactor = ns.getServerGrowth(server);
  
  // Process servers with root access
  if (hasRoot) {
    // For home server, consider reserved RAM
    const usableRam = server === 'home' 
      ? Math.max(0, maxRam - homeReservedRam) 
      : maxRam;
    
    // Purchased servers and home are used for running scripts
    if (server === 'home' || server.startsWith('pserv-')) {
      if (usableRam > 0) {
        availableServers.push({
          name: server,
          maxRam: usableRam,
          usedRam: server === 'home' ? Math.min(ns.getServerUsedRam(server), maxRam - homeReservedRam) : ns.getServerUsedRam(server),
          isOwned: true
        });
      }
    } 
    // Other servers could be either for running scripts or hacking targets
    else {
      // If server has money, consider it as a target
      if (maxMoney > 0) {
        const hackingLevel = ns.getPlayer().skills.hacking;
        const serverLevel = ns.getServerRequiredHackingLevel(server);
        
        // Skip servers we can't hack yet
        if (serverLevel <= hackingLevel) {
          // Score the server as a potential target
          const hackTime = ns.getHackTime(server);
          const score = (maxMoney * growthFactor) / (minSecurity * hackTime);
          
          targetServers.push({
            name: server,
            hackingLevel: serverLevel,
            maxMoney,
            currentMoney: ns.getServerMoneyAvailable(server),
            minSecurity,
            currentSecurity: ns.getServerSecurityLevel(server),
            growthFactor,
            hackTime,
            growTime: ns.getGrowTime(server),
            weakenTime: ns.getWeakenTime(server),
            score
          });
        }
      }
      
      // If server has usable RAM, add it as an available server
      if (usableRam > 2) { // Only consider servers with more than 2GB RAM
        availableServers.push({
          name: server,
          maxRam: usableRam,
          usedRam: ns.getServerUsedRam(server),
          isOwned: false
        });
      }
    }
  }
}

/**
 * Output server data to files for other scripts to use
 * @param {NS} ns - NetScript API
 * @param {Object} serverMap - Map of categorized servers
 */
function outputServerData(ns, serverMap) {
  // Write available servers to file
  ns.write('/v6/data/servers.txt', JSON.stringify(serverMap), 'w');
  
  // Write target servers to a separate file for easier access
  ns.write('/v6/data/targets.txt', JSON.stringify({targets: serverMap.targets}), 'w');
  
  // Output summary
  ns.print(`📊 Found ${serverMap.available.length} available servers for running scripts`);
  ns.print(`🎯 Found ${serverMap.targets.length} potential hacking targets`);
}

/**
 * Get the maximum RAM we can afford for a purchased server
 * @param {NS} ns - NetScript API
 * @param {number} money - Available money
 * @returns {number} Maximum affordable RAM
 */
function getMaxAffordableRam(ns, money) {
  let ram = 2; // Start with 2GB
  
  while (ram <= ns.getPurchasedServerMaxRam()) {
    const cost = ns.getPurchasedServerCost(ram * 2);
    if (cost > money) break;
    ram *= 2;
  }
  
  return ram;
}

/**
 * Format money values to be more readable
 * @param {number} money - Money value to format
 * @returns {string} Formatted money string
 */
function formatMoney(money) {
  if (money >= 1e12) return `${(money / 1e12).toFixed(2)}t`;
  if (money >= 1e9) return `${(money / 1e9).toFixed(2)}b`;
  if (money >= 1e6) return `${(money / 1e6).toFixed(2)}m`;
  if (money >= 1e3) return `${(money / 1e3).toFixed(2)}k`;
  return `${money.toFixed(2)}`;
}