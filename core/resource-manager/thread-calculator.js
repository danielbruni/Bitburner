/**
 * thread-calculator.js - Calculates optimal thread counts for tasks
 */

/**
 * Calculate optimal thread counts for a task
 * @param {NS} ns - NetScript API
 * @param {Object} task - Task to calculate threads for
 * @returns {Object} Optimal thread counts
 */
export function calculateThreads(ns, task) {
  const { target, action, security, money } = task;

  switch (action) {
    case "hack":
      // For hack, we take at most 25% of money per cycle
      const hackPercent = 0.25;
      const hackThreads = Math.floor(
        ns.hackAnalyzeThreads(target, money.current * hackPercent)
      );
      return {
        total: hackThreads > 0 ? hackThreads : 1,
        action: "hack",
      };

    case "grow":
      // Calculate growth factor needed
      const growthNeeded = money.target / Math.max(money.current, 1);
      const growThreads = Math.ceil(ns.growthAnalyze(target, growthNeeded));
      return {
        total: growThreads > 0 ? growThreads : 1,
        action: "grow",
      };

    case "weaken":
      // Calculate how much we need to weaken
      const weakenAmount = security.current - security.min;
      const weakenPerThread = 0.05;
      const weakenThreads = Math.ceil(weakenAmount / weakenPerThread);
      return {
        total: weakenThreads > 0 ? weakenThreads : 1,
        action: "weaken",
      };

    default:
      return { total: 0 };
  }
}
