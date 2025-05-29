/**
 * test-server-manager.js - Test the modular server manager
 */

import { formatMoney } from "../core/utils/common.js";

/** @param {NS} ns */
export async function main(ns) {
  // Clear console for better visibility
  ns.tprint("====== TESTING MODULAR SERVER MANAGER ======");

  // Run the modular server manager
  ns.tprint("Running server manager...");
  const pid = ns.exec(
    "/core/server-manager/index.js",
    "home",
    1,
    false, // shouldUpgradeServers
    10
  ); // homeReservedRam

  if (pid === 0) {
    ns.tprint("❌ Failed to start server manager!");
    return;
  }

  // Wait for it to complete
  ns.tprint("Waiting for server manager to complete...");
  await ns.sleep(2000);

  // Check if data files were created
  if (
    ns.fileExists("/data/servers.json") &&
    ns.fileExists("/data/targets.json")
  ) {
    ns.tprint("✅ Data files successfully created!");

    // Display summary from files
    const serverData = JSON.parse(ns.read("/data/servers.json"));
    const targetData = JSON.parse(ns.read("/data/targets.json"));

    ns.tprint(`📊 Available servers: ${serverData.available.length}`);
    ns.tprint(`🎯 Target servers: ${targetData.targets.length}`);

    // Show top 3 targets
    if (targetData.targets.length > 0) {
      ns.tprint("\nTop targets:");
      for (let i = 0; i < Math.min(3, targetData.targets.length); i++) {
        const target = targetData.targets[i];
        ns.tprint(
          `${i + 1}. ${target.name} - Max Money: $${formatMoney(
            target.maxMoney
          )}, Score: ${target.score.toFixed(2)}`
        );
      }
    }
  } else {
    ns.tprint("❌ Data files not created correctly!");
  }
  ns.tprint("====== TEST COMPLETE ======");
}
