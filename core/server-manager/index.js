/**
 * index.js - Main Server Manager Module
 * Coordinates the server discovery, management, and data export
 */

import { manageOwnedServers } from "./purchase-manager.js";
import { scanAllServers } from "./server-scanner.js";
import { outputServerData } from "./data-exporter.js";

/** @param {NS} ns */
export async function main(ns) {
  // Parse command line arguments
  const shouldUpgradeServers = ns.args[0] === true;
  const homeReservedRam = ns.args[1] || 10; // GB of RAM to reserve on home

  // Create data directory if it doesn't exist
  if (!ns.fileExists("/data/servers.txt")) {
    ns.write(
      "/data/servers.txt",
      JSON.stringify({ available: [], targets: [] }),
      "w"
    );
  }

  // Disable logs
  ns.disableLog("ALL");

  // First, handle owned server purchasing/upgrading
  await manageOwnedServers(ns, shouldUpgradeServers);

  // Then scan and categorize all servers
  const serverMap = await scanAllServers(ns, homeReservedRam);

  // Output the results to data files
  outputServerData(ns, serverMap);

  ns.print("✅ Server manager completed successfully");
}
