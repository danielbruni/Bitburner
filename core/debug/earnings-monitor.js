/**
 * earnings-monitor.js - Real-time earnings monitoring
 * Shows live money generation and system status
 */

import { formatMoney } from "../resource-manager/utils.js";

/** @param {NS} ns */
export async function main(ns) {
  const updateInterval = ns.args[0] || 2000; // Update every 2 seconds
  ns.disableLog("ALL");
  ns.ui.openTail();

  let baseline = ns.getPlayer().money;
  let lastUpdate = Date.now();
  let samples = [];

  while (true) {
    ns.clearLog();

    const current = ns.getPlayer().money;
    const now = Date.now();
    const timeDiff = (now - lastUpdate) / 1000;
    const earned = current - baseline;

    // Track earnings rate
    if (timeDiff > 0 && samples.length > 0) {
      const rate = earned / timeDiff;
      samples.push(rate);
      if (samples.length > 30) samples.shift(); // Keep last 30 samples
    }

    // Calculate average rate
    const avgRate =
      samples.length > 0
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0;

    ns.print("💰 === LIVE EARNINGS MONITOR ===");
    ns.print(`Time: ${new Date().toLocaleTimeString()}`);
    ns.print("");
    ns.print(`Current Money: $${formatMoney(current)}`);
    ns.print(`Total Earned:  $${formatMoney(earned)}`);
    ns.print("");

    if (samples.length > 5) {
      ns.print(`Current Rate:  $${formatMoney(avgRate)}/sec`);
      ns.print(`              $${formatMoney(avgRate * 60)}/min`);
      ns.print(`              $${formatMoney(avgRate * 3600)}/hour`);
      ns.print("");
    }

    // Show quick system status
    await showQuickStatus(ns);

    baseline = current;
    lastUpdate = now;

    await ns.sleep(updateInterval);
  }
}

async function showQuickStatus(ns) {
  // Count active workers
  const allServers = [...ns.getPurchasedServers(), "home"];
  let totalWorkers = 0;
  let hackWorkers = 0;
  let growWorkers = 0;
  let weakenWorkers = 0;

  for (const server of allServers) {
    const processes = ns.ps(server);
    const workers = processes.filter(
      (p) =>
        p.filename.includes("worker.js") ||
        p.filename === "/core/workers/worker.js" ||
        p.filename === "core/workers/worker.js" ||
        p.filename === "worker.js"
    );

    for (const worker of workers) {
      totalWorkers++;
      const action = worker.args[1];
      if (action === "hack") hackWorkers++;
      else if (action === "grow") growWorkers++;
      else if (action === "weaken") weakenWorkers++;
    }
  }

  ns.print("👷 === SYSTEM STATUS ===");
  ns.print(
    `Active Workers: ${totalWorkers} (${hackWorkers}H ${growWorkers}G ${weakenWorkers}W)`
  );

  // Check key systems
  const resourceManager = ns.scriptRunning(
    "/core/resource-manager/index.js",
    "home"
  );
  const mainScript = ns.scriptRunning("/main.js", "home");

  ns.print(`Resource Manager: ${resourceManager ? "✅" : "❌"}`);
  ns.print(`Main Script: ${mainScript ? "✅" : "❌"}`);

  if (totalWorkers === 0) {
    ns.print("");
    ns.print("🚨 NO WORKERS RUNNING!");
    ns.print("This is why no money is being made.");
  }

  ns.print("");
}
