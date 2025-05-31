/**
 * money-debug.js - Comprehensive money-making debug system
 * Analyzes why the hacking system isn't generating money
 */

import { formatMoney, formatBytes } from "../utils/common.js";
import { getConfig } from "../config/system-config.js";
import { getWorkerProcesses, isWorkerProcess } from "./worker-utils.js";

/** @param {NS} ns */
export async function main(ns) {
  const debugMode = ns.args[0] || "full"; // full, quick, monitor
  const continuous = ns.args[1] === "true";

  ns.disableLog("ALL");

  do {
    ns.clearLog();
    ns.tprint("=== MONEY GENERATION DEBUG SYSTEM ===");
    ns.tprint(`Debug Mode: ${debugMode.toUpperCase()}`);
    ns.tprint(`Time: ${new Date().toLocaleTimeString()}`);
    ns.tprint("");

    // Get baseline money
    const currentMoney = ns.getPlayer().money;
    ns.tprint(`💰 Current Money: $${formatMoney(currentMoney)}`);
    ns.tprint("");

    if (debugMode === "full" || debugMode === "quick") {
      await analyzeServerResources(ns);
      await analyzeTargetStatus(ns);
      await analyzeWorkerActivity(ns);
      await analyzeResourceAllocation(ns);
    }

    if (debugMode === "full") {
      await analyzeSystemBottlenecks(ns);
      await generateRecommendations(ns);
    }

    if (debugMode === "monitor") {
      await monitorEarnings(ns);
    }
    if (continuous) {
      await ns.sleep(getConfig("debug.monitoringInterval", 5000)); // Update based on config
    }
  } while (continuous);
}

/**
 * Analyze server resource utilization
 */
async function analyzeServerResources(ns) {
  ns.tprint("🖥️ === SERVER RESOURCE ANALYSIS ===");

  // Load server data
  const serverData = JSON.parse(ns.read("/data/servers.json"));
  const availableServers = serverData.available || [];

  let totalServers = 0;
  let overloadedServers = 0;
  let idleServers = 0;
  let totalRam = 0;
  let usedRam = 0;

  for (const server of availableServers) {
    totalServers++;
    totalRam += server.maxRam;
    usedRam += server.usedRam;

    const utilization = (server.usedRam / server.maxRam) * 100;

    if (utilization > 95) {
      overloadedServers++;
      ns.tprint(`❌ ${server.name}: ${utilization.toFixed(1)}% (OVERLOADED)`);
    } else if (utilization < 10) {
      idleServers++;
      ns.tprint(`⚠️ ${server.name}: ${utilization.toFixed(1)}% (IDLE)`);
    }
  }

  const totalUtilization = (usedRam / totalRam) * 100;

  ns.tprint("");
  ns.tprint(`📊 Total Servers: ${totalServers}`);
  ns.tprint(`🔴 Overloaded (>95%): ${overloadedServers}`);
  ns.tprint(`🟡 Idle (<10%): ${idleServers}`);
  ns.tprint(`💾 RAM Utilization: ${totalUtilization.toFixed(1)}%`);
  ns.tprint(`📈 Total RAM: ${formatBytes(totalRam * 1e9)}`);
  ns.tprint("");
}

/**
 * Analyze target server status
 */
async function analyzeTargetStatus(ns) {
  ns.tprint("🎯 === TARGET SERVER ANALYSIS ===");

  const targetData = JSON.parse(ns.read("/data/targets.json"));
  const targets = targetData.targets || [];

  let readyToHack = 0;
  let needsGrow = 0;
  let needsWeaken = 0;
  let potentialEarnings = 0;

  for (const target of targets.slice(0, 10)) {
    // Top 10 targets
    const currentMoney = ns.getServerMoneyAvailable(target.name);
    const maxMoney = ns.getServerMaxMoney(target.name);
    const currentSecurity = ns.getServerSecurityLevel(target.name);
    const minSecurity = ns.getServerMinSecurityLevel(target.name);

    const moneyPercent = maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0;
    const securityDiff = currentSecurity - minSecurity;

    let status = "";
    if (securityDiff > 5) {
      status = "WEAKEN";
      needsWeaken++;
    } else if (moneyPercent < 75) {
      status = "GROW";
      needsGrow++;
    } else {
      status = "HACK";
      readyToHack++;
      // Estimate potential earnings (conservative 10% of current money)
      potentialEarnings += currentMoney * 0.1;
    }

    ns.tprint(
      `${status.padEnd(6)} ${target.name}: $${formatMoney(
        currentMoney
      )}/${formatMoney(maxMoney)} (${moneyPercent.toFixed(
        1
      )}%) Sec: ${currentSecurity.toFixed(2)}/${minSecurity.toFixed(2)}`
    );
  }

  ns.tprint("");
  ns.tprint(`✅ Ready to hack: ${readyToHack}`);
  ns.tprint(`📈 Need grow: ${needsGrow}`);
  ns.tprint(`🔒 Need weaken: ${needsWeaken}`);
  ns.tprint(`💵 Potential earnings: $${formatMoney(potentialEarnings)}`);
  ns.tprint("");
}

/**
 * Analyze active worker activity
 */
async function analyzeWorkerActivity(ns) {
  ns.tprint("👷 === WORKER ACTIVITY ANALYSIS ===");

  const allServers = [...ns.getPurchasedServers(), "home"];
  let totalWorkers = 0;
  let hackWorkers = 0;
  let growWorkers = 0;
  let weakenWorkers = 0;
  let workersByTarget = {};

  for (const server of allServers) {
    const workers = getWorkerProcesses(ns, server);

    totalWorkers += workers.length;

    for (const worker of workers) {
      const target = worker.args[0];
      const action = worker.args[1];
      const threads = worker.args[2];

      // Count by action
      if (action === "hack") hackWorkers++;
      else if (action === "grow") growWorkers++;
      else if (action === "weaken") weakenWorkers++;

      // Count by target
      if (!workersByTarget[target]) {
        workersByTarget[target] = { hack: 0, grow: 0, weaken: 0, total: 0 };
      }
      workersByTarget[target][action] =
        (workersByTarget[target][action] || 0) + 1;
      workersByTarget[target].total++;
    }
  }

  ns.tprint(`🔧 Total Active Workers: ${totalWorkers}`);
  ns.tprint(`💰 Hack Workers: ${hackWorkers}`);
  ns.tprint(`📈 Grow Workers: ${growWorkers}`);
  ns.tprint(`🔒 Weaken Workers: ${weakenWorkers}`);
  ns.tprint("");

  if (totalWorkers === 0) {
    ns.tprint("❌ NO WORKERS RUNNING! This is why no money is being made.");
    ns.tprint("");
    return;
  }

  // Show top targets being worked on
  const sortedTargets = Object.entries(workersByTarget)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 5);

  ns.tprint("Top targets being worked on:");
  for (const [target, actions] of sortedTargets) {
    ns.tprint(
      `  ${target}: ${actions.hack}H ${actions.grow}G ${actions.weaken}W (${actions.total} total)`
    );
  }
  ns.tprint("");
}

/**
 * Analyze resource allocation efficiency
 */
async function analyzeResourceAllocation(ns) {
  ns.tprint("⚖️ === RESOURCE ALLOCATION ANALYSIS ===");

  // Check if resource manager is running
  const resourceManagerRunning = ns.scriptRunning(
    "/core/resource-manager/index.js",
    "home"
  );
  ns.tprint(
    `Resource Manager Running: ${resourceManagerRunning ? "✅ YES" : "❌ NO"}`
  );

  if (!resourceManagerRunning) {
    ns.tprint("❌ RESOURCE MANAGER NOT RUNNING! This is a critical issue.");
    ns.tprint("💡 Solution: Restart main.js or run resource manager manually");
    ns.tprint("");
    return;
  }

  // Check main script status
  const mainScriptRunning = ns.scriptRunning("/main.js", "home");
  ns.tprint(`Main Script Running: ${mainScriptRunning ? "✅ YES" : "❌ NO"}`);

  // Check server manager
  const serverManagerRunning = ns.scriptRunning(
    "/core/server-manager/index.js",
    "home"
  );
  ns.tprint(
    `Server Manager Running: ${serverManagerRunning ? "✅ YES" : "❌ NO"}`
  );

  // Check for script files
  const requiredFiles = ["/core/workers/worker.js"];

  let missingFiles = 0;
  for (const file of requiredFiles) {
    if (!ns.fileExists(file)) {
      ns.tprint(`❌ Missing file: ${file}`);
      missingFiles++;
    }
  }

  if (missingFiles > 0) {
    ns.tprint(`❌ ${missingFiles} required files missing!`);
  } else {
    ns.tprint("✅ All required files present");
  }
  ns.tprint("");
}

/**
 * Analyze system bottlenecks
 */
async function analyzeSystemBottlenecks(ns) {
  ns.tprint("🚧 === SYSTEM BOTTLENECK ANALYSIS ===");

  // RAM bottleneck analysis
  const serverData = JSON.parse(ns.read("/data/servers.json"));
  const availableServers = serverData.available || [];
  const workerRam = ns.getScriptRam("/core/workers/worker.js");

  let serversWithSpace = 0;
  let totalAvailableRam = 0;

  for (const server of availableServers) {
    const availableRam = server.maxRam - server.usedRam;
    if (availableRam >= workerRam) {
      serversWithSpace++;
      totalAvailableRam += availableRam;
    }
  }

  ns.tprint(
    `📊 Servers with space for workers: ${serversWithSpace}/${availableServers.length}`
  );
  ns.tprint(`💾 Total available RAM: ${formatBytes(totalAvailableRam * 1e9)}`);
  ns.tprint(
    `👷 Potential new workers: ${Math.floor(totalAvailableRam / workerRam)}`
  );

  // Target bottleneck analysis
  const targetData = JSON.parse(ns.read("/data/targets.json"));
  const targets = targetData.targets || [];

  if (targets.length === 0) {
    ns.tprint("❌ NO TARGETS AVAILABLE! Cannot make money without targets.");
  } else {
    ns.tprint(`🎯 Available targets: ${targets.length}`);

    // Check if we have root access to top targets
    let targetsWithAccess = 0;
    for (const target of targets.slice(0, 10)) {
      if (ns.hasRootAccess(target.name)) {
        targetsWithAccess++;
      }
    }
    ns.tprint(`🔓 Top targets with root access: ${targetsWithAccess}/10`);
  }
  ns.tprint("");
}

/**
 * Generate actionable recommendations
 */
async function generateRecommendations(ns) {
  ns.tprint("💡 === RECOMMENDATIONS ===");

  const recommendations = [];

  // Check if any workers are running
  const totalWorkers = getAllWorkerCount(ns);
  if (totalWorkers === 0) {
    recommendations.push({
      priority: "CRITICAL",
      issue: "No workers are running",
      solution: "Restart main.js or check resource manager",
    });
  }

  // Check RAM utilization
  const serverData = JSON.parse(ns.read("/data/servers.json"));
  const availableServers = serverData.available || [];
  const overloadedCount = availableServers.filter(
    (s) => s.usedRam / s.maxRam > 0.95
  ).length;

  if (overloadedCount > availableServers.length * 0.8) {
    recommendations.push({
      priority: "HIGH",
      issue: "Most servers are overloaded (>95% RAM usage)",
      solution: "Upgrade servers or reduce worker density",
    });
  }

  // Check target readiness
  const targetData = JSON.parse(ns.read("/data/targets.json"));
  const targets = targetData.targets || [];
  let readyTargets = 0;

  for (const target of targets.slice(0, 10)) {
    const money = ns.getServerMoneyAvailable(target.name);
    const maxMoney = ns.getServerMaxMoney(target.name);
    const security = ns.getServerSecurityLevel(target.name);
    const minSecurity = ns.getServerMinSecurityLevel(target.name);

    if (money >= maxMoney * 0.75 && security <= minSecurity + 5) {
      readyTargets++;
    }
  }

  if (readyTargets < 3) {
    recommendations.push({
      priority: "MEDIUM",
      issue: "Few targets are ready for hacking",
      solution: "Focus on preparing targets (grow/weaken) before hacking",
    });
  }

  // Display recommendations
  for (const rec of recommendations) {
    const emoji =
      rec.priority === "CRITICAL"
        ? "🚨"
        : rec.priority === "HIGH"
        ? "⚠️"
        : "💡";
    ns.tprint(`${emoji} ${rec.priority}: ${rec.issue}`);
    ns.tprint(`   Solution: ${rec.solution}`);
  }

  if (recommendations.length === 0) {
    ns.tprint("✅ No major issues detected. System should be earning money.");
  }
  ns.tprint("");
}

/**
 * Monitor earnings in real-time
 */
async function monitorEarnings(ns) {
  if (!ns.read("/tmp/money-baseline.txt")) {
    ns.write("/tmp/money-baseline.txt", ns.getPlayer().money.toString(), "w");
    ns.tprint("💰 Baseline money recorded. Run again to see earnings.");
    return;
  }

  const baseline = parseFloat(ns.read("/tmp/money-baseline.txt"));
  const current = ns.getPlayer().money;
  const earned = current - baseline;
  const timeElapsed =
    Date.now() - parseFloat(ns.read("/tmp/money-time.txt") || Date.now());

  ns.write("/tmp/money-time.txt", Date.now().toString(), "w");

  ns.tprint("💰 === EARNINGS MONITOR ===");
  ns.tprint(`Baseline: $${formatMoney(baseline)}`);
  ns.tprint(`Current:  $${formatMoney(current)}`);
  ns.tprint(
    `Earned:   $${formatMoney(earned)} (${earned >= 0 ? "+" : ""}${formatMoney(
      earned
    )})`
  );

  if (timeElapsed > 0) {
    const earningsPerSecond = earned / (timeElapsed / 1000);
    const earningsPerMinute = earningsPerSecond * 60;
    const earningsPerHour = earningsPerMinute * 60;

    ns.tprint(`Rate:     $${formatMoney(earningsPerSecond)}/sec`);
    ns.tprint(`          $${formatMoney(earningsPerMinute)}/min`);
    ns.tprint(`          $${formatMoney(earningsPerHour)}/hour`);
  }

  // Update baseline
  ns.write("/tmp/money-baseline.txt", current.toString(), "w");
}

/**
 * Get count of all active workers
 */
function getAllWorkerCount(ns) {
  const allServers = [...ns.getPurchasedServers(), "home"];
  let totalWorkers = 0;

  for (const server of allServers) {
    const processes = ns.ps(server);
    const workers = processes.filter((p) => isWorkerProcess(p));
    totalWorkers += workers.length;
  }

  return totalWorkers;
}
