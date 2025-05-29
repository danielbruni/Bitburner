/**
 * worker-debug.js - Debug individual worker performance and activity
 * Tracks what workers are doing and their effectiveness
 */

import { formatMoney } from "../resource-manager/utils.js";
import { getWorkerStats, formatWorkerStats } from "./worker-utils.js";

/** @param {NS} ns */
export async function main(ns) {
  const mode = ns.args[0] || "status"; // status, track, analyze
  const continuous = ns.args[1] === "true";

  ns.disableLog("ALL");

  if (mode === "track") {
    await trackWorkerEarnings(ns, continuous);
  } else if (mode === "analyze") {
    await analyzeWorkerEfficiency(ns);
  } else {
    await showWorkerStatus(ns, continuous);
  }
}

/**
 * Show current worker status
 */
async function showWorkerStatus(ns, continuous) {
  do {
    ns.clearLog();
    ns.print("👷 === WORKER STATUS DEBUGGER ===");
    ns.print(`Time: ${new Date().toLocaleTimeString()}`);
    ns.print("");

    // Use the utility function to get worker stats
    const workerStats = getWorkerStats(ns);
    const workerDetails = workerStats.details;

    ns.print(`Total Active Workers: ${formatWorkerStats(workerStats)}`);
    ns.print("");

    if (workerStats.total === 0) {
      ns.print("❌ NO WORKERS RUNNING!");
      ns.print("This explains why no money is being generated.");
      ns.print("");
      ns.print("Possible causes:");
      ns.print("- Resource manager not running");
      ns.print("- No targets available");
      ns.print("- No available RAM on servers");
      ns.print("- System still initializing");
      ns.print("");
      ns.print("🔍 DEBUG: Checking what IS running...");

      // Show what processes are actually running for debugging
      const allServers = [...ns.getPurchasedServers(), "home"];
      for (const server of allServers.slice(0, 3)) {
        const processes = ns.ps(server);
        if (processes.length > 0) {
          ns.print(
            `  ${server}: ${processes.map((p) => p.filename).join(", ")}`
          );
        } else {
          ns.print(`  ${server}: No processes running`);
        }
      }

      if (continuous) {
        await ns.sleep(5000);
        continue;
      } else {
        return;
      }
    }

    // Enhance worker details with target information
    const enhancedDetails = workerDetails.map((worker) => {
      const currentMoney = ns.getServerMoneyAvailable(worker.target);
      const maxMoney = ns.getServerMaxMoney(worker.target);
      const currentSecurity = ns.getServerSecurityLevel(worker.target);
      const minSecurity = ns.getServerMinSecurityLevel(worker.target);

      return {
        ...worker,
        targetMoney: currentMoney,
        targetMaxMoney: maxMoney,
        targetSecurity: currentSecurity,
        targetMinSecurity: minSecurity,
      };
    });

    // Group workers by action
    const actionGroups = {
      hack: enhancedDetails.filter((w) => w.action === "hack"),
      grow: enhancedDetails.filter((w) => w.action === "grow"),
      weaken: enhancedDetails.filter((w) => w.action === "weaken"),
    };

    for (const [action, workers] of Object.entries(actionGroups)) {
      if (workers.length === 0) continue;

      ns.print(`=== ${action.toUpperCase()} WORKERS (${workers.length}) ===`);

      // Group by target
      const targetGroups = {};
      for (const worker of workers) {
        if (!targetGroups[worker.target]) {
          targetGroups[worker.target] = [];
        }
        targetGroups[worker.target].push(worker);
      }

      for (const [target, targetWorkers] of Object.entries(targetGroups)) {
        const totalThreads = targetWorkers.reduce(
          (sum, w) => sum + w.threads,
          0
        );
        const sample = targetWorkers[0];

        const moneyPercent =
          sample.targetMaxMoney > 0
            ? (sample.targetMoney / sample.targetMaxMoney) * 100
            : 0;
        const securityDiff = sample.targetSecurity - sample.targetMinSecurity;

        let status = "";
        if (action === "hack") {
          const estimatedEarnings =
            sample.targetMoney * 0.1 * (totalThreads / 100);
          status = `Est. earnings: $${formatMoney(estimatedEarnings)}`;
        } else if (action === "grow") {
          status = `Money: ${moneyPercent.toFixed(1)}% of max`;
        } else if (action === "weaken") {
          status = `Security: +${securityDiff.toFixed(2)} above min`;
        }

        ns.print(
          `  ${target}: ${totalThreads} threads (${targetWorkers.length} workers)`
        );
        ns.print(`    ${status}`);
        ns.print(
          `    Money: $${formatMoney(sample.targetMoney)}/$${formatMoney(
            sample.targetMaxMoney
          )}`
        );
        ns.print(
          `    Security: ${sample.targetSecurity.toFixed(
            2
          )}/${sample.targetMinSecurity.toFixed(2)}`
        );
      }
      ns.print("");
    }

    // Show potential issues
    const issues = [];
    for (const worker of enhancedDetails) {
      const moneyPercent =
        worker.targetMaxMoney > 0
          ? worker.targetMoney / worker.targetMaxMoney
          : 0;
      const securityDiff = worker.targetSecurity - worker.targetMinSecurity;

      if (worker.action === "hack" && moneyPercent < 0.75) {
        issues.push(
          `⚠️ Hacking ${worker.target} with only ${(moneyPercent * 100).toFixed(
            1
          )}% money`
        );
      }
      if (worker.action === "grow" && moneyPercent > 0.95) {
        issues.push(
          `⚠️ Growing ${worker.target} which is already at ${(
            moneyPercent * 100
          ).toFixed(1)}% money`
        );
      }
      if (worker.action === "weaken" && securityDiff < 1) {
        issues.push(
          `⚠️ Weakening ${worker.target} which only has +${securityDiff.toFixed(
            2
          )} security`
        );
      }
    }

    if (issues.length > 0) {
      ns.print("=== POTENTIAL ISSUES ===");
      for (const issue of issues.slice(0, 5)) {
        ns.print(issue);
      }
      ns.print("");
    }

    if (continuous) {
      await ns.sleep(3000);
    }
  } while (continuous);
}

/**
 * Track worker earnings over time
 */
async function trackWorkerEarnings(ns, continuous) {
  ns.print("💰 === WORKER EARNINGS TRACKER ===");
  ns.print("Tracking hack operations and money generation...");
  ns.print("Press Ctrl+C to stop");
  ns.print("");

  let baseline = ns.getPlayer().money;
  let lastCheck = Date.now();

  while (true) {
    const currentMoney = ns.getPlayer().money;
    const earnings = currentMoney - baseline;
    const now = Date.now();
    const timeElapsed = (now - lastCheck) / 1000;

    // Get current worker stats
    const workerStats = getWorkerStats(ns);

    ns.print(
      `[${new Date().toLocaleTimeString()}] Money: $${formatMoney(
        currentMoney
      )} (+$${formatMoney(earnings)})`
    );
    ns.print(`  Workers: ${formatWorkerStats(workerStats)}`);

    if (timeElapsed > 0) {
      const rate = earnings / timeElapsed;
      ns.print(`  Rate: $${formatMoney(rate)}/sec`);
    }

    baseline = currentMoney;
    lastCheck = now;

    await ns.sleep(2000);
  }
}

/**
 * Analyze worker efficiency
 */
async function analyzeWorkerEfficiency(ns) {
  ns.print("📊 === WORKER EFFICIENCY ANALYSIS ===");
  ns.print("");

  // Get worker stats
  const workerStats = getWorkerStats(ns);
  const workers = workerStats.details;

  if (workers.length === 0) {
    ns.print("❌ No workers to analyze");
    return;
  }

  // Analyze by target
  const targetAnalysis = {};
  for (const worker of workers) {
    if (!targetAnalysis[worker.target]) {
      targetAnalysis[worker.target] = {
        hack: 0,
        grow: 0,
        weaken: 0,
        totalThreads: 0,
      };
    }
    targetAnalysis[worker.target][worker.action] += worker.threads;
    targetAnalysis[worker.target].totalThreads += worker.threads;
  }

  ns.print("=== RESOURCE ALLOCATION BY TARGET ===");

  for (const [target, allocation] of Object.entries(targetAnalysis)) {
    const currentMoney = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);
    const currentSecurity = ns.getServerSecurityLevel(target);
    const minSecurity = ns.getServerMinSecurityLevel(target);

    const moneyPercent = maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0;
    const securityDiff = currentSecurity - minSecurity;

    ns.print(`${target}:`);
    ns.print(
      `  Threads: ${allocation.hack}H ${allocation.grow}G ${allocation.weaken}W (${allocation.totalThreads} total)`
    );
    ns.print(
      `  Status: ${moneyPercent.toFixed(1)}% money, +${securityDiff.toFixed(
        2
      )} security`
    );

    // Efficiency assessment
    let assessment = "✅ Good allocation";
    if (allocation.hack > 0 && moneyPercent < 75) {
      assessment = "⚠️ Hacking with low money";
    } else if (allocation.grow > 0 && moneyPercent > 95) {
      assessment = "⚠️ Growing when money is full";
    } else if (allocation.weaken > 0 && securityDiff < 1) {
      assessment = "⚠️ Weakening when security is low";
    } else if (allocation.hack === 0 && moneyPercent > 90 && securityDiff < 2) {
      assessment = "💡 Could be hacking instead";
    }

    ns.print(`  Assessment: ${assessment}`);
    ns.print("");
  }

  // Overall efficiency
  ns.print("=== OVERALL EFFICIENCY ===");
  ns.print(`Total Workers: ${workerStats.total}`);
  ns.print(
    `Hack Workers: ${workerStats.hack} (${(
      (workerStats.hack / workerStats.total) *
      100
    ).toFixed(1)}%)`
  );
  ns.print(
    `Grow Workers: ${workerStats.grow} (${(
      (workerStats.grow / workerStats.total) *
      100
    ).toFixed(1)}%)`
  );
  ns.print(
    `Weaken Workers: ${workerStats.weaken} (${(
      (workerStats.weaken / workerStats.total) *
      100
    ).toFixed(1)}%)`
  );

  if (workerStats.hack === 0) {
    ns.print("");
    ns.print("⚠️ NO HACK WORKERS ACTIVE!");
    ns.print("This is why no money is being generated.");
    ns.print("Targets may need more preparation (grow/weaken) first.");
  } else if (workerStats.hack < workerStats.total * 0.3) {
    ns.print("");
    ns.print(
      "💡 Low ratio of hack workers. Targets may need more preparation."
    );
  }
}
