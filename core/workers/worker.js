/**
 * core/workers/worker.js - Task Worker
 * Executes specific hacking tasks with dynamic threading
 *
 * ⚠️⚠️⚠️ CRITICAL: THIS FILE RUNS IN COMPLETE ISOLATION! ⚠️⚠️⚠️
 *
 * This worker file gets copied to remote servers in Bitburner and runs independently.
 * It has ABSOLUTELY NO ACCESS to:
 * - HOME FILESYSTEM (/data/ directory, config files, state files, logs)
 * - ANY DATA from the main system (no shared variables, no persistence)
 * - Import statements or external modules from home
 * - Global variables or shared state between workers
 * - File I/O operations (ns.read(), ns.write(), ns.fileExists())
 * - Any coordination data or strategy information
 * - Server lists, target data, or configuration files
 * - Process state, metrics, or tracking information
 *
 * MUST BE 100% SELF-CONTAINED AND ISOLATED:
 * - All utility functions hardcoded locally within this file
 * - No external dependencies whatsoever
 * - No file operations of any kind
 * - No imports from home system
 * - No access to global scope or shared variables
 * - No communication with main system except through ns.args
 * - Cannot read ANY files from home server
 * - Cannot access ANY data structures from main system
 *
 * COMMUNICATION RESTRICTIONS:
 * - Input: Only through ns.args when worker is spawned
 * - Output: Only through ns.print() for local logging
 * - NO file-based communication possible
 * - NO shared memory or variables
 *
 * ⚠️ AI/ChatBot/Developer Note: NEVER add imports, file operations,
 * global references, or data access to this file! This worker operates
 * in complete isolation on remote servers with ZERO home system access.
 * Any attempt to access home data will cause runtime errors!
 */

/** @param {NS} ns */
export async function main(ns) {
  // Get arguments
  const target = ns.args[0]; // Target server
  const action = ns.args[1]; // 'hack', 'grow', or 'weaken'
  const threads = ns.args[2]; // Threads to use
  const taskInfo = ns.args[3] ? JSON.parse(ns.args[3]) : {}; // Task details

  // Disable logs to reduce clutter
  ns.disableLog("ALL");

  // Check for cooldown to prevent rapid-fire actions
  const lastActionTime = taskInfo.lastActionTime || 0;
  const cooldownPeriod = taskInfo.cooldown || 1000; // 1 second default
  const now = Date.now();

  if (now - lastActionTime < cooldownPeriod) {
    ns.print(
      `⏳ Cooling down (${(
        (cooldownPeriod - (now - lastActionTime)) /
        1000
      ).toFixed(1)}s remaining)`
    );
    return;
  }

  // Track execution start time
  const startTime = now;

  // Validate action
  if (!["hack", "grow", "weaken"].includes(action)) {
    ns.print(`❌ Invalid action: ${action}`);
    return;
  }
  // Log the start of task
  ns.print(`⏳ Starting ${action} on ${target} with ${threads} threads`);

  // Track retry attempts for error resilience (moved outside try block)
  const maxRetries = taskInfo.maxRetries || 3;
  const retryCount = taskInfo.retryCount || 0;

  try {
    // Check if we should use direct operation scripts instead for RAM efficiency
    const availableRam =
      ns.getServerMaxRam(ns.getHostname()) -
      ns.getServerUsedRam(ns.getHostname());
    const workerRam = ns.getScriptRam("/core/workers/worker.js");
    const operationRam = ns.getScriptRam(`/core/operations/${action}.js`);

    // For very tight RAM situations, consider using operation scripts directly
    const useDirectScript =
      taskInfo.useDirectScripts ||
      (availableRam < workerRam && availableRam >= operationRam);

    // Execute the appropriate action
    let result = 0;

    switch (action) {
      case "hack":
        result = await ns.hack(target, { threads });
        break;
      case "grow":
        result = await ns.grow(target, { threads });
        break;
      case "weaken":
        result = await ns.weaken(target, { threads });
        break;
    }

    // Calculate execution time
    const executionTime = (Date.now() - startTime) / 1000;

    // Log success with results
    if (action === "hack") {
      ns.print(
        `💰 Hacked ${target} for $${formatMoney(
          result
        )} in ${executionTime.toFixed(2)}s`
      );
    } else if (action === "grow") {
      ns.print(
        `📈 Grew ${target} by ${result.toFixed(2)}x in ${executionTime.toFixed(
          2
        )}s`
      );
    } else if (action === "weaken") {
      ns.print(
        `🔒 Weakened ${target} by ${result.toFixed(
          4
        )} in ${executionTime.toFixed(2)}s`
      );
    } // Adaptive chaining for small and medium servers
    // Use thresholds from task parameters or fall back to defaults
    const growthThreshold = taskInfo.growthThreshold || 0.75;
    const securityThreshold = taskInfo.securityThreshold || 5;

    // Get server size category - small servers benefit most from chaining
    const serverRam = ns.getServerMaxRam(ns.getHostname());
    const isSmallServer = serverRam <= 32; // Works for servers up to 32GB
    const canChain = isSmallServer || taskInfo.enableChaining;

    // Get current server status for intelligent chaining
    const currentSecurity = ns.getServerSecurityLevel(target);
    const minSecurity = ns.getServerMinSecurityLevel(target);
    const currentMoney = ns.getServerMoneyAvailable(target);
    const maxMoney = ns.getServerMaxMoney(target);

    // Calculate what the server needs now
    const securityDiff = currentSecurity - minSecurity;
    const moneyPercent = maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0;
    const needsWeaken = securityDiff > securityThreshold;
    const needsGrow = currentMoney < maxMoney * growthThreshold;

    // Only chain operations if it makes sense for this server size
    if (canChain && ns.getServerUsedRam(ns.getHostname()) > 0) {
      // Intelligently choose next action based on server state
      if (action === "weaken" && needsGrow && !needsWeaken) {
        // After weaken, if security is good but money is low, grow next
        ns.spawn(
          "/core/workers/worker.js",
          1,
          target,
          "grow",
          threads,
          JSON.stringify({
            ...taskInfo,
            lastActionTime: now,
            previousAction: "weaken",
          })
        );
        ns.print(
          `🔄 Chaining to grow operation (server money at ${moneyPercent.toFixed(
            1
          )}%)`
        );
      } else if (action === "grow") {
        // After grow, always weaken to counter security increase
        ns.spawn(
          "/core/workers/worker.js",
          1,
          target,
          "weaken",
          threads,
          JSON.stringify({
            ...taskInfo,
            lastActionTime: now,
            previousAction: "grow",
          })
        );
        ns.print(
          `🔄 Chaining to weaken operation (security +${securityDiff.toFixed(
            2
          )})`
        );
      } else if (action === "hack" && (needsWeaken || needsGrow)) {
        // After hack, determine what the server needs most
        const nextAction = needsWeaken ? "weaken" : "grow";
        ns.spawn(
          "/core/workers/worker.js",
          1,
          target,
          nextAction,
          threads,
          JSON.stringify({
            ...taskInfo,
            lastActionTime: now,
            previousAction: "hack",
          })
        );
        ns.print(`🔄 Chaining to ${nextAction} operation after hack`);
      }
      // Otherwise let resource manager decide the next action
    }
  } catch (error) {
    // Log failure
    ns.print(`❌ Error ${action} on ${target}: ${error.toString()}`);

    // Implement retry mechanism for resilience
    if (retryCount < maxRetries) {
      ns.print(
        `⚠️ Retry ${retryCount + 1}/${maxRetries} for ${action} on ${target}`
      );
      // Spawn a new instance with incremented retry count
      ns.spawn(
        "/core/workers/worker.js",
        1,
        target,
        action,
        threads,
        JSON.stringify({
          ...taskInfo,
          retryCount: retryCount + 1,
          lastActionTime: now,
        })
      );
    }
  }
  // Report metrics if tracking is enabled
  if (taskInfo.trackMetrics) {
    // NOTE: Cannot store metrics globally since worker runs in isolation
    // Metrics tracking would need to be handled by the calling system
    const metrics = {
      target,
      action,
      threads,
      executionTime: (Date.now() - startTime) / 1000,
      timestamp: Date.now(),
    };
    // Log metrics locally for debugging (no global storage available)
    ns.print(
      `📊 Metrics: ${action} took ${metrics.executionTime.toFixed(
        2
      )}s with ${threads} threads`
    );
  }
}

/**
 * Format money values to be more readable
 * NOTE: This is a local copy because worker.js cannot use imports
 * @param {number} money - Money value to format
 * @returns {string} Formatted money string
 */
function formatMoney(money) {
  if (money >= 1e12) return `${(money / 1e12).toFixed(2)}t`;
  if (money >= 1e9) return `${(money / 1e9).toFixed(2)}b`;
  if (money >= 1e6) return `${(money / 1e6).toFixed(2)}m`;
  if (money >= 1e3) return `${(money / 1e3).toFixed(2)}k`;
  return `${money.toFixed(2)}`;
}
