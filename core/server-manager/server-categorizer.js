/**
 * server-categorizer.js - Categorizes servers as targets or resources
 */

/**
 * Categorize a server as either available for running scripts or a target for hacking
 * @param {NS} ns - NetScript API
 * @param {string} server - Server to categorize
 * @param {Array} availableServers - Array to add available servers to
 * @param {Array} targetServers - Array to add target servers to
 * @param {number} homeReservedRam - GB of RAM to reserve on home
 */
export function categorizeServer(
  ns,
  server,
  availableServers,
  targetServers,
  homeReservedRam
) {
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
    const usableRam =
      server === "home" ? Math.max(0, maxRam - homeReservedRam) : maxRam;

    // Purchased servers and home are used for running scripts
    if (server === "home" || server.startsWith("pserv-")) {
      if (usableRam > 0) {
        availableServers.push({
          name: server,
          maxRam: usableRam,
          usedRam:
            server === "home"
              ? Math.min(ns.getServerUsedRam(server), maxRam - homeReservedRam)
              : ns.getServerUsedRam(server),
          isOwned: true,
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
            score,
          });
        }
      }

      // If server has usable RAM, add it as an available server
      if (usableRam > 2) {
        // Only consider servers with more than 2GB RAM
        availableServers.push({
          name: server,
          maxRam: usableRam,
          usedRam: ns.getServerUsedRam(server),
          isOwned: false,
        });
      }
    }
  }
}
