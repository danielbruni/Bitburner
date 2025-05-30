/**
 * debug-coordination.js
 * Debug script to monitor the coordination state file
 */

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tprint("=== Monitoring Coordination State ===");

  const stateFile = "/data/system-state.json";

  // Monitor for 60 seconds
  for (let i = 0; i < 12; i++) {
    try {
      if (ns.fileExists(stateFile)) {
        const stateData = JSON.parse(ns.read(stateFile));
        const now = Date.now();
        const age = now - stateData.lastServerScan;

        ns.tprint(`[${new Date().toLocaleTimeString()}] State check ${i + 1}:`);
        ns.tprint(`  lastServerScan: ${stateData.lastServerScan}`);
        ns.tprint(`  Age: ${age}ms (${age > 10000 ? "STALE" : "FRESH"})`);
        ns.tprint(`  Full state: ${JSON.stringify(stateData, null, 2)}`);
      } else {
        ns.tprint(
          `[${new Date().toLocaleTimeString()}] State file does not exist`
        );
      }
    } catch (error) {
      ns.tprint(
        `[${new Date().toLocaleTimeString()}] Error reading state: ${error}`
      );
    }

    await ns.sleep(5000);
  }

  ns.tprint("=== Monitoring Complete ===");
}
