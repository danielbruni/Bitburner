/**
 * system-health.js - Quick system health check and automatic fixes
 * Identifies and attempts to fix common issues preventing money generation
 */

import { formatBytes } from "../utils/common.js";
import { getWorkerStats } from "./worker-utils.js";
import { getConfig } from "../config/system-config.js";

/** @param {NS} ns */
export async function main(ns) {
  const autoFix = ns.args[0] === "fix";

  ns.disableLog("ALL");

  ns.tprint("🔍 === SYSTEM HEALTH CHECK ===");
  ns.tprint(`Mode: ${autoFix ? "DIAGNOSTIC + AUTO-FIX" : "DIAGNOSTIC ONLY"}`);
  ns.tprint("");

  const issues = [];

  // Check 1: Main script running
  const mainRunning = ns.scriptRunning("/main.js", "home");
  if (!mainRunning) {
    issues.push({
      level: "CRITICAL",
      problem: "Main script (/main.js) is not running",
      solution: "Run main.js to start the hacking system",
      fix: () => ns.exec("/main.js", "home", 1),
    });
  } else {
    ns.tprint("✅ Main script is running");
  }

  // Check 2: Resource manager running
  const resourceManagerRunning = ns.scriptRunning(
    "/core/resource-manager/index.js",
    "home"
  );
  if (!resourceManagerRunning) {
    issues.push({
      level: "CRITICAL",
      problem: "Resource manager is not running",
      solution: "Resource manager should be started by main script",
      fix: null, // Let main script handle this
    });
  } else {
    ns.tprint("✅ Resource manager is running");
  }
  // Check 3: Active workers
  const workerStats = getWorkerStats(ns);
  const totalWorkers = workerStats.hack + workerStats.grow + workerStats.weaken;

  if (totalWorkers === 0) {
    issues.push({
      level: "CRITICAL",
      problem: "No workers are currently active",
      solution: "Workers should be spawned by resource manager",
      fix: null,
    });
  } else {
    ns.tprint(
      `✅ ${totalWorkers} workers active (${workerStats.hack} hack, ${workerStats.grow} grow, ${workerStats.weaken} weaken)`
    );
  }

  // Check 4: Server files
  const requiredFiles = ["/core/workers/worker.js"];

  const missingFiles = requiredFiles.filter((file) => !ns.fileExists(file));
  if (missingFiles.length > 0) {
    issues.push({
      level: "CRITICAL",
      problem: `Missing required files: ${missingFiles.join(", ")}`,
      solution: "Create missing script files",
      fix: null,
    });
  } else {
    ns.tprint("✅ All required script files present");
  }

  // Check 5: Data files
  if (
    !ns.fileExists("/data/servers.json") ||
    !ns.fileExists("/data/targets.json")
  ) {
    issues.push({
      level: "HIGH",
      problem: "Missing data files (servers.json or targets.json)",
      solution: "Run server manager to generate data files",
      fix: () => ns.exec("/core/server-manager/index.js", "home", 1),
    });
  } else {
    ns.tprint("✅ Data files exist");
  }

  // Check 6: Target availability
  try {
    const targetData = JSON.parse(ns.read("/data/targets.json"));
    if (!targetData.targets || targetData.targets.length === 0) {
      issues.push({
        level: "HIGH",
        problem: "No targets available for hacking",
        solution: "Gain root access to more servers or improve hacking level",
        fix: null,
      });
    } else {
      ns.tprint(`✅ ${targetData.targets.length} targets available`);
    }
  } catch (e) {
    issues.push({
      level: "HIGH",
      problem: "Cannot read targets data file",
      solution: "Regenerate data files",
      fix: () => ns.exec("/core/server-manager/index.js", "home", 1),
    });
  }

  // Check 7: Server resource availability
  try {
    const serverData = JSON.parse(ns.read("/data/servers.json"));
    const workerRam = ns.getScriptRam("/core/workers/worker.js");
    let availableRam = 0;

    for (const server of serverData.available || []) {
      availableRam += Math.max(0, server.maxRam - server.usedRam);
    }
    if (availableRam < workerRam * getConfig("debug.healthCheckMinWorkers")) {
      issues.push({
        level: "MEDIUM",
        problem: "Very low available RAM across all servers",
        solution: "Upgrade servers or kill unused scripts",
        fix: null,
      });
    } else {
      ns.tprint(`✅ ${formatBytes(availableRam * 1e9)} RAM available`);
    }
  } catch (e) {
    ns.tprint("⚠️ Could not analyze server resources");
  }

  // Check 8: Home server RAM
  const homeRam = ns.getServerMaxRam("home");
  const homeUsed = ns.getServerUsedRam("home");
  const homeAvailable = homeRam - homeUsed;
  if (homeAvailable < getConfig("debug.healthCheckHomeRamThreshold")) {
    issues.push({
      level: "MEDIUM",
      problem: "Home server is almost full",
      solution: "Free up RAM on home server or upgrade it",
      fix: null,
    });
  } else {
    ns.tprint(
      `✅ Home server has ${formatBytes(homeAvailable * 1e9)} available`
    );
  }

  // Report issues
  ns.tprint("");
  if (issues.length === 0) {
    ns.tprint("🎉 ALL CHECKS PASSED! System should be earning money.");
    ns.tprint("If money isn't being generated, the issue may be:");
    ns.tprint("- Targets need time to be prepared (grow/weaken)");
    ns.tprint("- Hack operations are in progress");
    ns.tprint("- System is still initializing");
    return;
  }

  ns.tprint(`⚠️ FOUND ${issues.length} ISSUES:`);
  ns.tprint("");

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const emoji =
      issue.level === "CRITICAL" ? "🚨" : issue.level === "HIGH" ? "⚠️" : "💡";

    ns.tprint(`${i + 1}. ${emoji} ${issue.level}: ${issue.problem}`);
    ns.tprint(`   Solution: ${issue.solution}`);

    if (autoFix && issue.fix) {
      ns.tprint("   🔧 Attempting automatic fix...");
      try {
        issue.fix();
        ns.tprint("   ✅ Fix applied");
      } catch (e) {
        ns.tprint(`   ❌ Fix failed: ${e.message}`);
      }
    }
    ns.tprint("");
  }
  if (autoFix) {
    ns.tprint(
      "🔄 Auto-fixes applied. Wait 10 seconds then check status again."
    );
  } else {
    ns.tprint("💡 To attempt automatic fixes, run: run system-health.js fix");
  }
}
