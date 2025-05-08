import { manageServers } from "/v5/server-manager.js";
import { getAllServers } from "/v5/server-scanner.js";
import { findBestTargets } from "/v5/target-finder.js";
import { deployBatchesForTarget } from "/v5/batch-deployer.js";

/** @param {NS} ns */
export async function main(ns) {
  // Config
  const CONFIG = {
    delayStep: 200, // ms spacing between operations
    maxBatchesPerHost: 5,
    maxRamPerServer: ns.getPurchasedServerMaxRam(),
    shouldBuyServers: true, // Whether to purchase new servers when slots are available
    shouldUpgradeServers: false, // Whether to upgrade existing servers
    minServerRam: 8,
    upgradeThreshold: 4,
    scripts: ["/shared/hack.js", "/shared/grow.js", "/shared/weaken.js"],
    continuousMode: true, // Run continuously
    cycleTime: 5 * 60 * 1000, // 5 minutes between cycles
  };

  // Disable logs to improve performance
  ns.disableLog("getServerMaxRam");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("scp");
  ns.disableLog("exec");

  // Main execution loop
  while (true) {
    try {
      ns.print("=".repeat(50));
      ns.print(`📊 Starting new execution cycle at ${new Date().toLocaleTimeString()}`);
      
      // Check if scripts exist
      ns.tprint("🔍 Checking needed scripts...");
      let missingScripts = false;
      for (const script of CONFIG.scripts) {
        if (!ns.fileExists(script, "home")) {
          ns.tprint(`⚠️ Script ${script} missing! Please create.`);
          missingScripts = true;
        }
      }
      
      // Don't proceed if scripts are missing
      if (missingScripts) {
        return;
      }

      // Server-Management: Buy and upgrade
      if (CONFIG.shouldBuyServers) {
        await manageServers(ns, CONFIG.minServerRam, CONFIG.maxRamPerServer, CONFIG.upgradeThreshold, CONFIG.shouldUpgradeServers);
      }

      // Get all servers (including purchased ones)
      const servers = getAllServers(ns);
      ns.print(`🌐 Found ${servers.length} servers in the network`);

      // Auto-deploy to all rooted servers (except home)
      let deployCount = 0;
      for (const server of servers) {
        if (ns.hasRootAccess(server) && server !== "home") {
          await ns.scp(CONFIG.scripts, "home", server);
          deployCount++;
        }
      }
      ns.print(`✅ Deployed scripts to ${deployCount} servers`);

      // Find best targets
      const targets = findBestTargets(ns, servers, 3);

      if (targets.length === 0) {
        ns.tprint("⚠️ No viable targets found! Check your hacking level.");
        if (CONFIG.continuousMode) {
          ns.print("Waiting before next cycle...");
          await ns.sleep(CONFIG.cycleTime);
          continue;
        } else {
          return;
        }
      }

      ns.print(`🎯 Selected ${targets.length} targets for hacking`);
      
      // Launch batches for each target
      let totalBatches = 0;
      for (const target of targets) {
        ns.tprint(`🎯 Targeting ${target.name} (score: ${target.score.toFixed(2)})`);
        const batchesStarted = await deployBatchesForTarget(ns, target, servers, CONFIG.delayStep, CONFIG.maxBatchesPerHost);
        totalBatches += batchesStarted;
        
        // Run the 16GB deployment script specifically for this target
        if (batchesStarted > 0) { // Only if we successfully deployed some batches
          ns.exec("/v5/deploy-16gb.js", "home", 1, target.name);
          ns.print(`📊 Running 16GB deployment for ${target.name}`);
          await ns.sleep(1000); // Give it a second to start up
        }
      }
      
      ns.tprint(`📈 Total batches started: ${totalBatches}`);

      if (!CONFIG.continuousMode) {
        ns.tprint("✅ Script execution completed successfully");
        break;
      }
      
      // Wait between cycles in continuous mode
      ns.print(`💤 Waiting ${CONFIG.cycleTime/1000/60} minutes until next cycle...`);
      await ns.sleep(CONFIG.cycleTime);
      
    } catch (error) {
      // Handle any errors that might cause the script to crash
      ns.tprint(`❌ ERROR: ${error.toString()}`);
      if (CONFIG.continuousMode) {
        ns.print("Waiting before retry...");
        await ns.sleep(30000); // Wait 30 seconds before retrying
      } else {
        return;
      }
    }
  }
}