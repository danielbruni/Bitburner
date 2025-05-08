/** @param {NS} ns */
export async function main(ns) {
  // Config
  const delayStep = 200; // ms spacing between operations
  const maxBatchesPerHost = 5;
  const maxRamPerServer = ns.getPurchasedServerMaxRam();
  const shouldBuyServers = true;
  const minServerRam = 8;
  const upgradeThreshold = 4;
  const scripts = ["/shared/hack.js", "/shared/grow.js", "/shared/weaken.js"];
  const continuousMode = true; // Run continuously
  const cycleTime = 5 * 60 * 1000; // 5 minutes between cycles

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
      for (const script of scripts) {
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
      if (shouldBuyServers) {
        await manageServers(ns, minServerRam, maxRamPerServer, upgradeThreshold);
      }

      // Get all servers (including purchased ones)
      const servers = getAllServers(ns);
      ns.print(`🌐 Found ${servers.length} servers in the network`);

      // Auto-deploy to all rooted servers (except home)
      let deployCount = 0;
      for (const server of servers) {
        if (ns.hasRootAccess(server) && server !== "home") {
          await ns.scp(scripts, "home", server);
          deployCount++;
        }
      }
      ns.print(`✅ Deployed scripts to ${deployCount} servers`);

      // Target top 3 most profitable
      const targets = servers
        .filter(s => isViableTarget(ns, s))
        .map(s => ({
          name: s,
          money: ns.getServerMaxMoney(s),
          security: ns.getServerMinSecurityLevel(s),
          hackTime: ns.getHackTime(s),
          growTime: ns.getGrowTime(s),
          weakenTime: ns.getWeakenTime(s),
          score: getServerScore(ns, s),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (targets.length === 0) {
        ns.tprint("⚠️ No viable targets found! Check your hacking level.");
        if (continuousMode) {
          ns.print("Waiting before next cycle...");
          await ns.sleep(cycleTime);
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
        const batchesStarted = await deployBatches(ns, target, servers, delayStep, maxBatchesPerHost);
        totalBatches += batchesStarted;
      }
      
      ns.tprint(`📈 Total batches started: ${totalBatches}`);

      if (!continuousMode) {
        ns.tprint("✅ Script execution completed successfully");
        break;
      }
      
      // Wait between cycles in continuous mode
      ns.print(`💤 Waiting ${cycleTime/1000/60} minutes until next cycle...`);
      await ns.sleep(cycleTime);
      
    } catch (error) {
      // Handle any errors that might cause the script to crash
      ns.tprint(`❌ ERROR: ${error.toString()}`);
      if (continuousMode) {
        ns.print("Waiting before retry...");
        await ns.sleep(30000); // Wait 30 seconds before retrying
      } else {
        return;
      }
    }
  }
}

/**
 * Manages purchased servers (buying and upgrading)
 * @param {NS} ns
 * @param {number} minRam - Minimum RAM for new servers
 * @param {number} maxRam - Maximum RAM for servers
 * @param {number} upgradeThreshold - Factor for upgrade decisions
 */
async function manageServers(ns, minRam, maxRam, upgradeThreshold) {
  const maxServers = ns.getPurchasedServerLimit();
  const currentServers = ns.getPurchasedServers();

  // Calculate RAM required for a typical batch
  // This is a simplified calculation to estimate batch RAM needs
  const weakenRam = ns.getScriptRam("/shared/weaken.js");
  const growRam = ns.getScriptRam("/shared/grow.js");
  const hackRam = ns.getScriptRam("/shared/hack.js");
  
  // Assume a typical batch requires: 2 weaken threads, 5 grow threads, 2 hack threads
  // Adjust these numbers if your actual requirements differ
  const estimatedBatchRam = (2 * weakenRam) + (5 * growRam) + (2 * hackRam);
  
  ns.tprint(`💻 Server management: ${currentServers.length}/${maxServers} servers purchased`);
  ns.tprint(`📊 Estimated RAM needed per batch: ${estimatedBatchRam.toFixed(2)}GB`);

  // Available money for server purchases
  const money = ns.getServerMoneyAvailable("home");
  // Reserve some money - only use 60% of available funds for servers
  let budget = money * 0.6;  // Changed from const to let

  // Buy new servers if slots are available
  if (currentServers.length < maxServers) {
    // Determine maximum affordable RAM (limited by maxRam)
    let ram = minRam;
    while (ram * 2 <= maxRam && ns.getPurchasedServerCost(ram * 2) <= budget / 5) {
      ram *= 2;
    }

    // Buy server if RAM requirement is met and it can run at least one batch
    if (ram >= minRam && ram >= estimatedBatchRam) {
      const cost = ns.getPurchasedServerCost(ram);
      const serverName = `pserv-${currentServers.length}`;
      ns.tprint(`🛒 Buying new server: ${serverName} with ${ram}GB RAM for $${cost.toLocaleString()}`);
      ns.purchaseServer(serverName, ram);
    }
  }
  // Upgrade existing servers if possible
  else {
    // First identify servers that don't have enough RAM
    const serversToUpgrade = [];
    for (const server of currentServers) {
      const currentRam = ns.getServerMaxRam(server);
      if (currentRam < estimatedBatchRam) {
        // Critical priority - server can't run a single batch
        serversToUpgrade.push({
          name: server,
          ram: currentRam,
          priority: 1
        });
      } else if (currentRam < estimatedBatchRam * 5) {
        // Medium priority - server can run some batches but could be better
        serversToUpgrade.push({
          name: server,
          ram: currentRam,
          priority: 2
        });
      } else if (currentRam < maxRam) {
        // Low priority - server is adequate but can still be upgraded
        serversToUpgrade.push({
          name: server,
          ram: currentRam,
          priority: 3
        });
      }
    }
    
    // Sort by priority (lowest number = highest priority) then by RAM (lowest RAM first)
    serversToUpgrade.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.ram - b.ram;
    });
    
    // Display upgrade plan
    if (serversToUpgrade.length > 0) {
      ns.tprint("🔄 Upgrade plan:");
      for (const server of serversToUpgrade) {
        const priority = server.priority === 1 ? "HIGH" : server.priority === 2 ? "MEDIUM" : "LOW";
        ns.tprint(`   - ${server.name}: ${server.ram}GB RAM (Priority: ${priority})`);
      }
    }

    // Perform upgrades in order of priority
    for (const serverInfo of serversToUpgrade) {
      // Skip if we've used up our budget
      if (budget <= 0) break;

      const serverToUpgrade = serverInfo.name;
      const currentRam = serverInfo.ram;

      // Skip if server already has maximum RAM
      if (currentRam >= maxRam) continue;

      // Calculate next RAM tier
      // For critical servers, try to get them to at least enough to run one batch
      let nextRam;
      if (serverInfo.priority === 1) {
        // Critical priority - double RAM until it can run at least one batch
        nextRam = Math.max(currentRam * 2, Math.pow(2, Math.ceil(Math.log2(estimatedBatchRam))));
      } else {
        // For other priorities, just double the RAM
        nextRam = currentRam * 2;
      }
      
      // Cap at max RAM
      nextRam = Math.min(nextRam, maxRam);

      // Only upgrade if the increase is significant enough or is critical priority
      if (serverInfo.priority === 1 || nextRam / currentRam >= upgradeThreshold) {
        const cost = ns.getPurchasedServerCost(nextRam);

        // Skip if we can't afford this upgrade
        if (cost > budget) continue;

        const priorityLabel = serverInfo.priority === 1 ? "🔴 CRITICAL" : 
                             serverInfo.priority === 2 ? "🟠 MEDIUM" : "🟢 LOW";
                             
        ns.tprint(`${priorityLabel} Upgrading server ${serverToUpgrade} from ${currentRam}GB to ${nextRam}GB RAM for $${cost.toLocaleString()}`);
        ns.killall(serverToUpgrade);
        ns.deleteServer(serverToUpgrade);
        ns.purchaseServer(serverToUpgrade, nextRam);

        // Reduce our budget by the cost
        budget -= cost;
      }
    }
  }
}

/**
 * Deploy batches of hack, grow, weaken scripts to available servers
 * @param {NS} ns
 * @param {{name: string, money: number, security: number, hackTime: number, growTime: number, weakenTime: number, score: number}} target
 * @param {(string|undefined)[]} servers
 * @param {number} delayStep
 * @param {number} maxBatchesPerHost
 * @returns {number} Number of batches started
 */
async function deployBatches(ns, target, servers, delayStep, maxBatchesPerHost) {
  const { name: server } = target;

  const weakenScript = "/shared/weaken.js";
  const growScript = "/shared/grow.js";
  const hackScript = "/shared/hack.js";

  const wRam = ns.getScriptRam(weakenScript);
  const gRam = ns.getScriptRam(growScript);
  const hRam = ns.getScriptRam(hackScript);

  const maxMoney = ns.getServerMaxMoney(server);
  const desiredHackAmount = Math.max(1, maxMoney * 0.1);

  // Calculate threads based on server difficulty
  let hackThreads = Math.floor(ns.hackAnalyzeThreads(server, desiredHackAmount));
  if (!Number.isFinite(hackThreads) || hackThreads < 1) hackThreads = 1;
  
  // Limit thread counts to reasonable values for 16GB servers
  if (hackThreads > 50) hackThreads = 50;
  
  let growThreads = Math.ceil(ns.growthAnalyze(server, 1.2));
  if (!Number.isFinite(growThreads) || growThreads < 1) growThreads = 1;
  if (growThreads > 100) growThreads = 100;

  const weakenThreads = 1;

  const batchRam = hackThreads * hRam + growThreads * gRam + 2 * weakenThreads * wRam;

  let totalBatchCount = 0;
  let hostsUsed = 0;
  let skippedServers = 0;
  let noRootServers = 0;
  let insufficientRamServers = 0;
  
  // Debug info
  ns.tprint(`🔄 Deploying batches for ${server} - Required RAM per batch: ${batchRam.toFixed(2)}GB`);
  ns.tprint(`🧵 Thread requirements - Hack: ${hackThreads}, Grow: ${growThreads}, Weaken: ${weakenThreads}`);

  // Filter servers we own (purchased servers + home)
  const purchasedServers = ns.getPurchasedServers();
  const ourServers = ["home", ...purchasedServers];
  ns.tprint(`💻 Total servers to check: ${servers.length} (including ${purchasedServers.length} purchased servers)`);
  
  // Kill all running scripts on purchased servers to free up RAM
  for (const pserv of purchasedServers) {
    if (ns.getServerUsedRam(pserv) > 0) {
      ns.killall(pserv);
      ns.print(`🔄 Killed all scripts on ${pserv} to free up RAM`);
    }
  }
  
  // Log all purchased servers for debugging
  ns.tprint("📋 Purchased servers:");
  for (const pserv of purchasedServers) {
    const maxRam = ns.getServerMaxRam(pserv);
    const usedRam = ns.getServerUsedRam(pserv);
    const availRam = maxRam - usedRam;
    ns.tprint(`   - ${pserv}: ${availRam.toFixed(2)}GB / ${maxRam}GB available (${usedRam.toFixed(2)}GB used)`);
  }

  // First try our purchased servers and home
  for (const host of ourServers) {
    if (!ns.hasRootAccess(host)) {
      noRootServers++;
      ns.tprint(`⚠️ Server ${host} does not have root access`);
      continue;
    }
    
    const availableRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    
    if (availableRam < batchRam) {
      insufficientRamServers++;
      ns.tprint(`⚠️ Server ${host} has insufficient RAM: ${availableRam.toFixed(2)}GB available, ${batchRam.toFixed(2)}GB required`);
      continue;
    }
    
    // Calculate max batches possible on this host based on available RAM
    const possibleBatches = Math.floor(availableRam / batchRam);
    // Limit to maxBatchesPerHost
    const batchesToDeploy = Math.min(possibleBatches, maxBatchesPerHost);
    
    if (batchesToDeploy <= 0) {
      skippedServers++;
      ns.tprint(`⚠️ Server ${host} skipped: Could not deploy any batches`);
      continue;
    }
    
    const wTime = ns.getWeakenTime(server);
    const gTime = ns.getGrowTime(server);
    const hTime = ns.getHackTime(server);
    
    // Deploy batches to this host
    for (let batchIndex = 0; batchIndex < batchesToDeploy; batchIndex++) {
      const schedule = [
        { script: weakenScript, delay: 0, threads: weakenThreads },
        { script: hackScript, delay: wTime - hTime - 3 * delayStep, threads: hackThreads },
        { script: growScript, delay: wTime - gTime - delayStep, threads: growThreads },
        { script: weakenScript, delay: 0, threads: weakenThreads },
      ];

      for (let i = 0; i < schedule.length; i++) {
        const { script, delay, threads } = schedule[i];
        const totalDelay = delay + batchIndex * 4 * delayStep;
        await ns.scp(script, host);
        const pid = ns.exec(script, host, threads, server, totalDelay);
        if (pid === 0) {
          ns.tprint(`⚠️ Failed to execute ${script} on ${host} with ${threads} threads`);
        }
      }
    }
    
    hostsUsed++;
    totalBatchCount += batchesToDeploy;
    ns.tprint(`✅ Deployed ${batchesToDeploy} batches on ${host}`);
  }

  // Now try hacked servers (if we need more)
  if (totalBatchCount < 20) { // Arbitrary limit to not use too many hacked servers
    for (const host of servers) {
      // Skip our own servers which we already processed
      if (ourServers.includes(host)) continue;
      
      if (!ns.hasRootAccess(host)) {
        noRootServers++;
        continue;
      }
      
      const availableRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
      
      if (availableRam < batchRam) {
        insufficientRamServers++;
        continue;
      }
      
      // Calculate max batches possible on this host based on available RAM
      const possibleBatches = Math.floor(availableRam / batchRam);
      // Limit to maxBatchesPerHost
      const batchesToDeploy = Math.min(possibleBatches, maxBatchesPerHost);
      
      if (batchesToDeploy <= 0) {
        skippedServers++;
        continue;
      }
      
      const wTime = ns.getWeakenTime(server);
      const gTime = ns.getGrowTime(server);
      const hTime = ns.getHackTime(server);
      
      // Deploy batches to this host
      for (let batchIndex = 0; batchIndex < batchesToDeploy; batchIndex++) {
        const schedule = [
          { script: weakenScript, delay: 0, threads: weakenThreads },
          { script: hackScript, delay: wTime - hTime - 3 * delayStep, threads: hackThreads },
          { script: growScript, delay: wTime - gTime - delayStep, threads: growThreads },
          { script: weakenScript, delay: 0, threads: weakenThreads },
        ];

        for (let i = 0; i < schedule.length; i++) {
          const { script, delay, threads } = schedule[i];
          const totalDelay = delay + batchIndex * 4 * delayStep;
          await ns.scp(script, host);
          ns.exec(script, host, threads, server, totalDelay);
        }
      }
      
      hostsUsed++;
      totalBatchCount += batchesToDeploy;
      ns.tprint(`✅ Deployed ${batchesToDeploy} batches on ${host}`);
    }
  }
  
  // Print diagnostics
  ns.tprint(`📊 Deployment stats:`);
  ns.tprint(`   - Servers used: ${hostsUsed}`);
  ns.tprint(`   - Servers without root: ${noRootServers}`);
  ns.tprint(`   - Servers with insufficient RAM: ${insufficientRamServers}`);
  ns.tprint(`   - Servers skipped for other reasons: ${skippedServers}`);
  ns.tprint(`🔄 Total: ${totalBatchCount} batches deployed on ${hostsUsed} hosts for ${server}`);
  
  return totalBatchCount;
}

/** 
 * Evaluate how profitable a server is (money/second)
 * @param {NS} ns
 * @param {string|undefined} server
 */
function getServerScore(ns, server) {
  const money = ns.getServerMaxMoney(server);
  const hackTime = ns.getHackTime(server);
  return money / hackTime;
}

/**
 * @param {NS} ns
 * @param {string|undefined} server
 */
function isViableTarget(ns, server) {
  return (
    ns.hasRootAccess(server) &&
    ns.getServerMaxMoney(server) > 0 &&
    ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel() &&
    !server.startsWith('pserv-') // Don't hack our own servers
  );
}

/** Recursive server discovery
 * @param {NS} ns
 */
function getAllServers(ns) {
  const seen = new Set(["home"]);
  const stack = ["home"];
  const found = [];

  while (stack.length) {
    const host = stack.pop();
    found.push(host);
    for (const neighbor of ns.scan(host)) {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  // Add purchased servers to the list
  const purchasedServers = ns.getPurchasedServers();
  for (const server of purchasedServers) {
    if (!found.includes(server)) {
      found.push(server);
    }
  }

  return found;
}