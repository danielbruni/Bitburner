/**
 * Module for scanning and discovering servers in the network
 */

/**
 * Recursive server discovery function
 * @param {NS} ns - NetScript API
 * @returns {string[]} - Array of all server hostnames in the network
 */
export function getAllServers(ns) {
  const seen = new Set(["home"]);
  const stack = ["home"];
  const found = [];

  // Use depth-first search to find all servers
  while (stack.length) {
    const host = stack.pop();
    found.push(host);
    
    // Scan for neighboring servers
    for (const neighbor of ns.scan(host)) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  // Add purchased servers to the list - sometimes these can be missed by scan
  const purchasedServers = ns.getPurchasedServers();
  for (const server of purchasedServers) {
    if (!found.includes(server)) {
      found.push(server);
    }
  }

  return found;
}

/**
 * Attempts to gain root access to a server by opening required ports and nuking
 * @param {NS} ns - NetScript API
 * @param {string} server - Server hostname
 * @returns {boolean} - Whether root access was successfully gained
 */
export function gainRootAccess(ns, server) {
  // Skip if we already have root access
  if (ns.hasRootAccess(server)) {
    return true;
  }
  
  // Check if we have the hacking level required
  if (ns.getServerRequiredHackingLevel(server) > ns.getHackingLevel()) {
    return false;
  }
  
  // Count how many port openers we have available
  let availablePortOpeners = 0;
  
  // Try each port opener we might have
  if (ns.fileExists("BruteSSH.exe", "home")) {
    ns.brutessh(server);
    availablePortOpeners++;
  }
  
  if (ns.fileExists("FTPCrack.exe", "home")) {
    ns.ftpcrack(server);
    availablePortOpeners++;
  }
  
  if (ns.fileExists("RelaySMTP.exe", "home")) {
    ns.relaysmtp(server);
    availablePortOpeners++;
  }
  
  if (ns.fileExists("HTTPWorm.exe", "home")) {
    ns.httpworm(server);
    availablePortOpeners++;
  }
  
  if (ns.fileExists("SQLInject.exe", "home")) {
    ns.sqlinject(server);
    availablePortOpeners++;
  }
  
  // Check if we can nuke the server
  if (ns.getServerNumPortsRequired(server) <= availablePortOpeners) {
    ns.nuke(server);
    return true;
  }
  
  return false;
}

/**
 * Scans the network and returns a list of accessible servers with their properties
 * @param {NS} ns - NetScript API
 * @returns {Object[]} - Array of server objects with their properties
 */
export function getDetailedServerInfo(ns) {
  const servers = getAllServers(ns);
  const serverInfo = [];
  
  for (const server of servers) {
    // Try to gain root access if we don't have it
    if (!ns.hasRootAccess(server)) {
      gainRootAccess(ns, server);
    }
    
    // Skip if we couldn't get root access
    if (!ns.hasRootAccess(server)) {
      continue;
    }
    
    // Collect relevant server properties
    serverInfo.push({
      name: server,
      maxRam: ns.getServerMaxRam(server),
      usedRam: ns.getServerUsedRam(server),
      maxMoney: ns.getServerMaxMoney(server),
      minSecurity: ns.getServerMinSecurityLevel(server),
      hackingLevel: ns.getServerRequiredHackingLevel(server),
      growth: ns.getServerGrowth(server)
    });
  }
  
  return serverInfo;
}