/**
 * debug-runner.js - Main debug script launcher
 * Easy access to all debugging tools
 */

import {
  getWorkerStats,
  formatWorkerStats,
} from "./core/debug/worker-utils.js";
import { formatMoney } from "./core/utils/common.js";

/** @param {NS} ns */
export async function main(ns) {
  const command = ns.args[0] || "help";

  ns.disableLog("ALL");

  switch (command.toLowerCase()) {
    case "health":
    case "check":
      ns.tprint("🔍 Running system health check...");
      ns.exec("/core/debug/system-health.js", "home", 1);
      break;

    case "fix":
      ns.tprint("🔧 Running system health check with auto-fix...");
      ns.exec("/core/debug/system-health.js", "home", 1, "fix");
      break;

    case "money":
    case "earnings":
      ns.tprint("💰 Running money debug analysis...");
      ns.exec("/core/debug/money-debug.js", "home", 1, "full");
      break;

    case "monitor":
    case "watch":
      ns.tprint("📊 Starting earnings monitor...");
      ns.exec("/core/debug/earnings-monitor.js", "home", 1);
      break;

    case "workers":
    case "worker":
      ns.tprint("👷 Running worker analysis...");
      ns.exec("/core/debug/worker-debug.js", "home", 1, "status");
      break;

    case "track":
      ns.tprint("📈 Starting worker earnings tracker...");
      ns.exec("/core/debug/worker-debug.js", "home", 1, "track", "true");
      break;

    case "analyze":
    case "efficiency":
      ns.tprint("⚙️ Running worker efficiency analysis...");
      ns.exec("/core/debug/worker-debug.js", "home", 1, "analyze");
      break;

    case "quick":
      ns.tprint("⚡ Running quick diagnostic...");
      await quickDiagnostic(ns);
      break;

    case "all":
      ns.tprint("🔍 Running comprehensive diagnostics...");
      ns.exec("/core/debug/system-health.js", "home", 1);
      await ns.sleep(1000);
      ns.exec("/core/debug/money-debug.js", "home", 1, "full");
      await ns.sleep(1000);
      ns.exec("/core/debug/worker-debug.js", "home", 1, "analyze");
      break;

    case "help":
    default:
      showHelp(ns);
      break;
  }
}

/**
 * Quick diagnostic - most common issues
 */
async function quickDiagnostic(ns) {
  ns.tprint("⚡ === QUICK DIAGNOSTIC ===");

  const issues = [];

  // Check main systems
  const mainRunning = ns.scriptRunning("/main.js", "home");
  const resourceManagerRunning = ns.scriptRunning(
    "/core/resource-manager/index.js",
    "home"
  );

  if (!mainRunning) {
    issues.push("❌ Main script not running");
  }
  if (!resourceManagerRunning) {
    issues.push("❌ Resource manager not running");
  }

  // Check workers using the utility function
  const workerStats = getWorkerStats(ns);

  ns.tprint(`🔍 Debug: Found ${formatWorkerStats(workerStats)} workers`);
  if (workerStats.total === 0) {
    issues.push("❌ No workers running");
    ns.tprint("🔍 Debug: Will show all running processes...");

    // Show what IS running for debugging
    const allServers = [...ns.getPurchasedServers(), "home"];
    for (const server of allServers.slice(0, 3)) {
      const processes = ns.ps(server);
      if (processes.length > 0) {
        ns.tprint(
          `  ${server}: ${processes.map((p) => p.filename).join(", ")}`
        );
      }
    }
  } else {
    ns.tprint(
      `💡 Workers detected: ${workerStats.hack} hack, ${workerStats.grow} grow, ${workerStats.weaken} weaken`
    );
    if (workerStats.hack === 0) {
      issues.push("⚠️ No hack workers (no money generation)");
    }
  }

  // Check money
  const currentMoney = ns.getPlayer().money;
  ns.tprint(`💰 Current Money: $${formatMoney(currentMoney)}`);

  if (issues.length === 0) {
    ns.tprint("✅ No obvious issues found!");
    ns.tprint(
      `👷 ${workerStats.total} workers active (${workerStats.hack} hacking)`
    );
    ns.tprint("");
    ns.tprint("If still no money, try:");
    ns.tprint("- run debug-runner.js monitor (watch earnings live)");
    ns.tprint("- run debug-runner.js workers (check worker details)");
  } else {
    ns.tprint("🚨 Issues found:");
    for (const issue of issues) {
      ns.tprint(`  ${issue}`);
    }
    ns.tprint("");
    ns.tprint("💡 Try: run debug-runner.js fix");
  }
}

/**
 * Show help menu
 */
function showHelp(ns) {
  ns.tprint("🔧 === DEBUG SYSTEM HELP ===");
  ns.tprint("");
  ns.tprint("Available commands:");
  ns.tprint("  health/check    - Check system health");
  ns.tprint("  fix            - Check health + attempt auto-fixes");
  ns.tprint("  money/earnings - Analyze money generation");
  ns.tprint("  monitor/watch  - Live earnings monitor");
  ns.tprint("  workers/worker - Analyze worker status");
  ns.tprint("  track          - Track worker earnings live");
  ns.tprint("  analyze        - Worker efficiency analysis");
  ns.tprint("  quick          - Quick diagnostic");
  ns.tprint("  all            - Run all diagnostics");
  ns.tprint("");
  ns.tprint("Examples:");
  ns.tprint("  run debug-runner.js quick");
  ns.tprint("  run debug-runner.js fix");
  ns.tprint("  run debug-runner.js monitor");
  ns.tprint("");
  ns.tprint("💡 Start with 'quick' for fast problem identification");
}
