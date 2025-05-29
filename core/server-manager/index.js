/**
 * index.js - Main Server Manager Module
 * Coordinates the server discovery, management, and data export
 */

import { manageOwnedServers } from "./purchase-manager.js";
import { scanAllServers } from "./server-scanner.js";
import { outputServerData } from "./data-exporter.js";
import { getConfig } from "../config/system-config.js";

/** @param {NS} ns */
export async function main(ns) {
  // Parse command line arguments
  const shouldUpgradeServers = ns.args[0] === true;
  const homeReservedRam = ns.args[1] || getConfig("resources.homeReservedRam");
  // Create data directory if it doesn't exist
  const serversDataFile = getConfig("files.serversDataFile");
  if (!ns.fileExists(serversDataFile)) {
    ns.write(
      serversDataFile,
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
