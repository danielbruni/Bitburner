/**
 * server-scanner.js - Scans and categorizes all servers in the network
 */

import { tryGetRootAccess } from "./root-access.js";
import { categorizeServer } from "./server-categorizer.js";

/**
 * Scan all servers in the network and categorize them
 * @param {NS} ns - NetScript API
 * @param {number} homeReservedRam - GB of RAM to reserve on home
 * @returns {Object} Map of servers categorized by type
 */
export async function scanAllServers(ns, homeReservedRam) {
  // Initialize server collections
  const availableServers = [];
  const targetServers = [];

  // Start with home
  const toScan = ["home"];
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
    if (!ns.hasRootAccess(server) && server !== "home") {
      await tryGetRootAccess(ns, server);
    }

    // Categorize the server
    categorizeServer(
      ns,
      server,
      availableServers,
      targetServers,
      homeReservedRam
    );
  }

  // Sort target servers by scoring
  targetServers.sort((a, b) => b.score - a.score);

  return {
    available: availableServers,
    targets: targetServers,
  };
}
