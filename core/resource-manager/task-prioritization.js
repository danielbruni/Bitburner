/**
 * task-prioritization.js - Prioritizes tasks based on server status and potential profit
 */

/**
 * Prioritize tasks based on server status and potential profit
 * @param {NS} ns - NetScript API
 * @param {Array} targetServers - List of potential target servers
 * @param {Object} taskData - Current state of worker tasks
 * @returns {Array} Prioritized list of tasks
 */
export function prioritizeTasks(ns, targetServers, taskData) {
  const tasks = [];

  // Process each target server and determine what it needs
  for (const target of targetServers) {
    const targetName = target.name;

    // Get the current state
    const currentMoney = ns.getServerMoneyAvailable(targetName);
    const maxMoney = target.maxMoney;
    const currentSecurity = ns.getServerSecurityLevel(targetName);
    const minSecurity = target.minSecurity;

    // Calculate thresholds
    const moneyTarget = maxMoney * taskData.moneyThreshold;
    const securityThreshold = minSecurity + taskData.securityThreshold;

    // Determine action priority
    let action = null;
    let priority = 0;

    // Security is too high - weaken first
    if (currentSecurity > securityThreshold) {
      action = "weaken";
      // Higher priority for servers that are closest to target security
      priority = 1 - (currentSecurity - minSecurity) / (currentSecurity * 2);
    }
    // Money is too low - grow it
    else if (currentMoney < moneyTarget) {
      action = "grow";
      // Higher priority for servers with most money potential
      priority = currentMoney / moneyTarget;
    }
    // Ready to hack
    else {
      action = "hack";
      // Higher priority for valuable and easy targets
      priority = maxMoney / target.hackTime / 1e8;
    }

    // Factor in the server's score
    priority *= target.score / 1000;

    // Add the task
    tasks.push({
      target: targetName,
      action,
      priority,
      security: {
        current: currentSecurity,
        min: minSecurity,
        threshold: securityThreshold,
      },
      money: {
        current: currentMoney,
        max: maxMoney,
        target: moneyTarget,
        percent: maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0,
      },
      times: {
        hack: target.hackTime,
        grow: target.growTime,
        weaken: target.weakenTime,
      },
      score: target.score,
    });

    // Update target status for reporting
    taskData.targetStatuses[targetName] = {
      action,
      money: {
        current: currentMoney,
        max: maxMoney,
        percent: maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0,
      },
      security: {
        current: currentSecurity,
        min: minSecurity,
      },
    };
  }

  // Sort tasks by priority (highest first)
  tasks.sort((a, b) => b.priority - a.priority);

  return tasks;
}
