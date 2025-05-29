/**
 * data-exporter.js - Exports server data to files
 */

import { getConfig } from "../config/system-config.js";

/**
 * Output server data to files for other scripts to use
 * @param {NS} ns - NetScript API
 * @param {Object} serverMap - Map of categorized servers
 */
export function outputServerData(ns, serverMap) {
  // Write available servers to file
  const serversFile = getConfig("files.serversDataFile");
  const targetsFile = getConfig("files.targetsDataFile");

  ns.write(serversFile, JSON.stringify(serverMap), "w");

  // Write target servers to a separate file for easier access
  ns.write(targetsFile, JSON.stringify({ targets: serverMap.targets }), "w");

  // Output summary
  ns.print(
    `📊 Found ${serverMap.available.length} available servers for running scripts`
  );
  ns.print(`🎯 Found ${serverMap.targets.length} potential hacking targets`);
}
