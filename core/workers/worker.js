/**
 * core/workers/worker.js - Task Worker
 * Executes specific hacking tasks with dynamic threading
 *
 * ⚠️  IMPORTANT: NO IMPORTS OR FILE READING ALLOWED IN THIS FILE! ⚠️
 * This file gets copied to all servers in Bitburner, so it must be completely
 * self-contained with no external dependencies, import statements, or file reading.
 * All utility functions and configuration values must be hardcoded locally within this file.
 * Do NOT use ns.read(), ns.fileExists(), or any file operations!
 *
 * AI/ChatBot Note: Always keep this file import-free, file-read-free, and completely self-contained!
 * This worker runs in isolation on remote servers with no access to the home filesystem.
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

  // Track execution start time
  const startTime = Date.now();

  // Validate action
  if (!["hack", "grow", "weaken"].includes(action)) {
    ns.print(`❌ Invalid action: ${action}`);
    return;
  }

  // Log the start of task
  ns.print(`⏳ Starting ${action} on ${target} with ${threads} threads`);

  try {
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
    }

    // For special RAM sizes, execute different optimizations
    const specialRamSize = 16; // Hardcoded: special RAM size for optimization
    const growthThreshold = 0.75; // Hardcoded: growth money threshold

    if (
      ns.getServerMaxRam(ns.getHostname()) === specialRamSize &&
      ns.getServerUsedRam(ns.getHostname()) > 0
    ) {
      // For special servers, immediately follow up with another action if more are needed
      if (action === "weaken") {
        // After weaken, check if we need to grow
        const money = ns.getServerMoneyAvailable(target);
        const maxMoney = ns.getServerMaxMoney(target);

        if (money < maxMoney * growthThreshold) {
          ns.spawn(
            "/core/workers/worker.js",
            1,
            target,
            "grow",
            threads,
            JSON.stringify(taskInfo)
          );
        }
      } else if (action === "grow") {
        // After grow, apply a weaken to counter security increase
        ns.spawn(
          "/core/workers/worker.js",
          1,
          target,
          "weaken",
          threads,
          JSON.stringify(taskInfo)
        );
      }
      // After hack, let the resource manager decide next action
    }
  } catch (error) {
    // Log failure
    ns.print(`❌ Error ${action} on ${target}: ${error.toString()}`);
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
