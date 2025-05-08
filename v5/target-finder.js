/**
 * Module for finding and scoring potential hacking targets
 */

/**
 * Check if a server is a viable hacking target
 * @param {NS} ns - NetScript API
 * @param {string} server - Server hostname to check
 * @returns {boolean} - Whether the server is a viable target
 */
export function isViableTarget(ns, server) {
  return (
    ns.hasRootAccess(server) &&
    ns.getServerMaxMoney(server) > 0 &&
    ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel() &&
    !server.startsWith('pserv-') // Don't hack our own servers
  );
}

/**
 * Calculate a score for a server based on profitability
 * @param {NS} ns - NetScript API
 * @param {string} server - Server hostname to score
 * @returns {number} - Hacking score (higher is better)
 */
export function getServerScore(ns, server) {
  const maxMoney = ns.getServerMaxMoney(server);
  const minSecurity = ns.getServerMinSecurityLevel(server);
  const hackTime = ns.getHackTime(server);
  const growthFactor = ns.getServerGrowth(server);
  
  // Basic score: money per hack time
  let score = maxMoney / hackTime;
  
  // Adjust for security (lower is better)
  score = score * (1 / (minSecurity + 1));
  
  // Adjust for growth (higher is better)
  score = score * (growthFactor / 50);
  
  return score;
}

/**
 * Find the best targets among available servers
 * @param {NS} ns - NetScript API
 * @param {string[]} servers - List of servers to evaluate
 * @param {number} limit - Maximum number of targets to return
 * @returns {Object[]} - Array of target objects with properties
 */
export function findBestTargets(ns, servers, limit = 3) {
  // Filter for viable targets and map them to objects with properties
  const targets = servers
    .filter(s => isViableTarget(ns, s))
    .map(s => ({
      name: s,
      money: ns.getServerMaxMoney(s),
      security: ns.getServerMinSecurityLevel(s),
      hackTime: ns.getHackTime(s),
      growTime: ns.getGrowTime(s),
      weakenTime: ns.getWeakenTime(s),
      score: getServerScore(ns, s),
    }))
    .sort((a, b) => b.score - a.score) // Sort by score (descending)
    .slice(0, limit); // Take only the top N
  
  return targets;
}

/**
 * Analyzes a target server and returns the optimal hack amount
 * @param {NS} ns - NetScript API
 * @param {string} server - Server hostname to analyze
 * @returns {Object} - Object containing thread counts and timing info
 */
export function analyzeTarget(ns, server) {
  const maxMoney = ns.getServerMaxMoney(server);
  const currentMoney = ns.getServerMoneyAvailable(server);
  const minSecurity = ns.getServerMinSecurityLevel(server);
  const currentSecurity = ns.getServerSecurityLevel(server);
  
  // Calculate optimal hack percentage (usually 10-50% of max money)
  const optimalHackPercent = 0.1; // Start with 10%
  const desiredHackAmount = Math.max(1, maxMoney * optimalHackPercent);
  
  // Calculate thread requirements
  let hackThreads = Math.floor(ns.hackAnalyzeThreads(server, desiredHackAmount));
  if (!Number.isFinite(hackThreads) || hackThreads < 1) hackThreads = 1;
  
  // Cap threads to reasonable values for server RAM
  if (hackThreads > 50) hackThreads = 50;
  
  // Calculate threads needed to grow back to max money after hack
  const growMultiplier = 1 / (1 - optimalHackPercent);
  let growThreads = Math.ceil(ns.growthAnalyze(server, growMultiplier));
  if (!Number.isFinite(growThreads) || growThreads < 1) growThreads = 1;
  if (growThreads > 100) growThreads = 100;
  
  // Calculate weaken threads needed (each hack increases security by 0.002)
  const hackSecurityIncrease = hackThreads * 0.002;
  // Each grow increases security by 0.004
  const growSecurityIncrease = growThreads * 0.004;
  // Each weaken thread reduces security by 0.05
  const weakenThreadsForHack = Math.ceil(hackSecurityIncrease / 0.05);
  const weakenThreadsForGrow = Math.ceil(growSecurityIncrease / 0.05);
  
  return {
    hackThreads,
    growThreads,
    weakenThreadsForHack,
    weakenThreadsForGrow,
    hackTime: ns.getHackTime(server),
    growTime: ns.getGrowTime(server),
    weakenTime: ns.getWeakenTime(server),
    currentMoney,
    maxMoney,
    currentSecurity,
    minSecurity
  };
}