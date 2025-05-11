/**
 * prepare-servers.js - Prepares all servers by copying necessary scripts
 */

/**
 * Prepare all purchased servers at the start of the resource manager
 * @param {NS} ns - NetScript API
 */
export async function prepareServers(ns) {
  const purchasedServers = ns.getPurchasedServers();
  ns.print(`🔍 Preparing ${purchasedServers.length} purchased servers...`);

  // Scripts to copy to each server
  const scriptsToCopy = [
    "/shared/worker.js",
    "/shared/hack.js",
    "/shared/grow.js",
    "/shared/weaken.js",
  ];

  // Copy scripts to each purchased server
  for (const server of purchasedServers) {
    let allScriptsCopied = true;

    // Check and copy each script
    for (const script of scriptsToCopy) {
      if (!ns.fileExists(script, server)) {
        const success = ns.scp(script, server, "home");
        if (!success) {
          ns.print(`❌ Failed to copy ${script} to ${server}`);
          allScriptsCopied = false;
        }
      }
    }

    if (allScriptsCopied) {
      ns.print(`✅ All scripts copied to ${server}`);
    }
  }
}
