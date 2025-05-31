/**
 * shutdown.js - Safely shut down the Dynamic Resource Allocation Hacking System
 *
 * Usage:
 *   run shutdown.js                   - Normal shutdown
 *   run shutdown.js --clear-data=true - Shutdown and clear data for fresh restart
 */

import { clearDataFolder } from "/core/utils/data";
import { cleanAllServers } from "/core/utils/servers";

/** @param {NS} ns */
export async function main(ns) {
  // Properly declare all RAM-using functions at the top
  ns.disableLog("ALL");

  // Parse command line arguments
  const args = ns.flags([["clear-data", false]]);
  const shouldClearData = args["clear-data"];

  ns.tprint("⚠️ Shutting down Dynamic Resource Allocation Hacking System...");

  // Kill main system script if it's running
  if (ns.scriptRunning("main.js", "home")) {
    ns.scriptKill("main.js", "home");
    ns.tprint("✅ Main system process terminated");
  } else {
    ns.tprint("ℹ️ Main system was not running");
  }

  // Kill other core system scripts that might be running
  const coreScripts = [
    "/core/server-manager/index.js",
    "/core/resource-manager/index.js",
    "/core/target-manager/index.js",
  ];

  let killCount = 0;
  for (const script of coreScripts) {
    if (ns.scriptRunning(script, "home")) {
      ns.scriptKill(script, "home");
      killCount++;
    }
  }

  if (killCount > 0) {
    ns.tprint(`✅ Terminated ${killCount} additional system processes`);
  }

  // Kill all worker processes on home
  const homeWorkers = ns
    .ps("home")
    .filter(
      (process) =>
        process.filename === "/core/workers/worker.js" ||
        process.filename.startsWith("/core/operations/")
    );

  if (homeWorkers.length > 0) {
    for (const worker of homeWorkers) {
      ns.scriptKill(worker.filename, "home");
    }
    ns.tprint(`✅ Terminated ${homeWorkers.length} worker processes on home`);
  }

  // Clean up scripts from all private servers
  await cleanAllServers(ns);

  // If requested, clear data folder for fresh start
  if (shouldClearData) {
    await clearDataFolder(ns);
    ns.tprint("🧹 Data folder cleared. System will start fresh on next launch");
  }

  // Final confirmation
  if (shouldClearData) {
    ns.tprint("🔴 System shutdown complete with DATA RESET");
    ns.tprint("    To restart: run main.js");
  } else {
    ns.tprint("🔴 System shutdown complete");
    ns.tprint("    To restart: run main.js");
  }
}
