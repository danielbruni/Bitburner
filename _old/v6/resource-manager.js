/**
 * v6/resource-manager.js - Dynamic Resource Allocation Manager
 * Allocates servers to tasks based on available resources and target priorities
 */

/** @param {NS} ns */
export async function main(ns) {
  // Parse command line arguments
  const configString = ns.args[0] || "{}";
  const config = JSON.parse(configString);
  const moneyThreshold = ns.args[1] || 0.75;
  const securityThreshold = ns.args[2] || 5;
  
  // Create data directory if needed
  if (!ns.fileExists('/v6/data')) {
    ns.exec('/v6/server-manager.js', 'home', 1);
    await ns.sleep(1000);
  }
  
  // Disable logs
  ns.disableLog('ALL');
  
  // Prepare servers with required scripts
  await prepareServers(ns);
  
  // Initialize variables
  let assignedHosts = {}; // Track worker assignments
  let taskData = {
    activeWorkers: 0,
    targetStatuses: {},
    moneyThreshold,
    securityThreshold
  };
  
  // Main loop
  while (true) {
    try {
      // Load server data
      const serverData = JSON.parse(ns.read('/v6/data/servers.txt') || '{"available":[],"targets":[]}');
      const availableServers = serverData.available;
      const targetServers = serverData.targets;
      
      // Debug: Print available servers
      ns.print(`🔍 Available servers: ${availableServers.length}`);
      availableServers.forEach(server => {
        ns.print(`    - ${server.name}: ${server.maxRam}GB (${server.usedRam}GB used), Owned: ${server.isOwned}`);
      });
      
      // Track the time
      const lastCycleTime = Date.now();
      
      // Update task priority for each target
      const prioritizedTasks = prioritizeTasks(ns, targetServers, taskData);
      
      // Reset target statuses for this cycle
      taskData.targetStatuses = {};
      
      // Allocate servers to tasks
      await allocateResources(ns, availableServers, prioritizedTasks, assignedHosts, taskData);
      
      // Clean up any stale worker assignments
      cleanupWorkers(ns, assignedHosts);
      
      // Output status
      outputStatus(ns, prioritizedTasks, taskData);
      
      // Calculate sleep time (aim for cycle every 5 seconds)
      const cycleTime = Date.now() - lastCycleTime;
      const sleepTime = Math.max(1000, 5000 - cycleTime);
      
      await ns.sleep(sleepTime);
    } catch (error) {
      ns.print(`ERROR: ${error.toString()}`);
      await ns.sleep(5000);
    }
  }
}

/**
 * Prepare all purchased servers at the start of the resource manager
 * @param {NS} ns - NetScript API 
 */
async function prepareServers(ns) {
  const purchasedServers = ns.getPurchasedServers();
  ns.print(`🔍 Preparing ${purchasedServers.length} purchased servers...`);
  
  // Scripts to copy to each server
  const scriptsToCopy = [
    '/v6/worker.js',
    '/shared/hack.js',
    '/shared/grow.js',
    '/shared/weaken.js'
  ];
  
  // Copy scripts to each purchased server
  for (const server of purchasedServers) {
    let allScriptsCopied = true;
    
    // Check and copy each script
    for (const script of scriptsToCopy) {
      if (!ns.fileExists(script, server)) {
        const success = ns.scp(script, server, 'home');
        if (!success) {
          ns.print(`❌ Failed to copy ${script} to ${server}`);
          allScriptsCopied = false;
        }
      }
    }
    
    if (allScriptsCopied) {
      ns.print(`✅ All scripts copied to ${server}`);
    }
  }
}

/**
 * Prioritize tasks based on server status and potential profit
 * @param {NS} ns - NetScript API
 * @param {Array} targetServers - List of potential target servers
 * @param {Object} taskData - Current state of worker tasks
 * @returns {Array} Prioritized list of tasks
 */
function prioritizeTasks(ns, targetServers, taskData) {
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
      action = 'weaken';
      // Higher priority for servers that are closest to target security
      priority = 1 - ((currentSecurity - minSecurity) / (currentSecurity * 2));
    }
    // Money is too low - grow it
    else if (currentMoney < moneyTarget) {
      action = 'grow';
      // Higher priority for servers with most money potential
      priority = currentMoney / moneyTarget;
    }
    // Ready to hack
    else {
      action = 'hack';
      // Higher priority for valuable and easy targets
      priority = (maxMoney / target.hackTime) / 1e8;
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
        threshold: securityThreshold
      },
      money: {
        current: currentMoney,
        max: maxMoney,
        target: moneyTarget,
        percent: maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0
      },
      times: {
        hack: target.hackTime,
        grow: target.growTime,
        weaken: target.weakenTime
      },
      score: target.score
    });
    
    // Update target status for reporting
    taskData.targetStatuses[targetName] = {
      action,
      money: {
        current: currentMoney,
        max: maxMoney,
        percent: maxMoney > 0 ? (currentMoney / maxMoney) * 100 : 0
      },
      security: {
        current: currentSecurity,
        min: minSecurity
      }
    };
  }
  
  // Sort tasks by priority (highest first)
  tasks.sort((a, b) => b.priority - a.priority);
  
  return tasks;
}

/**
 * Allocate server resources to tasks
 * @param {NS} ns - NetScript API
 * @param {Array} availableServers - Servers available for running scripts
 * @param {Array} tasks - Prioritized list of tasks
 * @param {Object} assignedHosts - Current host assignments
 * @param {Object} taskData - Tracking data for active tasks
 */
async function allocateResources(ns, availableServers, tasks, assignedHosts, taskData) {
  // Reset active worker count
  taskData.activeWorkers = 0;
  
  // Get info about worker script RAM requirements
  const workerRam = ns.getScriptRam('/v6/worker.js');
  
  // Group servers by RAM capacity for better utilization
  const serversBySize = {};
  
  for (const server of availableServers) {
    const availableRam = server.maxRam - server.usedRam;
    
    // Skip servers with insufficient RAM
    if (availableRam < workerRam) continue;
    
    // Group by RAM size category
    let sizeCategory;
    if (availableRam < 8) sizeCategory = 'tiny'; // < 8GB
    else if (availableRam < 32) sizeCategory = 'small'; // 8-32GB
    else if (availableRam < 128) sizeCategory = 'medium'; // 32-128GB
    else if (availableRam < 512) sizeCategory = 'large'; // 128-512GB
    else sizeCategory = 'huge'; // >512GB
    
    if (!serversBySize[sizeCategory]) {
      serversBySize[sizeCategory] = [];
    }
    
    serversBySize[sizeCategory].push({
      ...server,
      availableRam
    });
  }
  
  // Process the highest priority tasks first
  for (const task of tasks) {
    // Skip tasks with zero priority
    if (task.priority <= 0) continue;
    
    // Calculate optimal thread counts for this task
    const threadCounts = calculateThreads(ns, task);
    if (threadCounts.total <= 0) continue;
    
    // Try to find servers for this task, starting with the largest ones
    await assignServersToTask(ns, serversBySize, task, threadCounts, assignedHosts, taskData, workerRam);
  }
}

/**
 * Calculate optimal thread counts for a task
 * @param {NS} ns - NetScript API
 * @param {Object} task - Task to calculate threads for
 * @returns {Object} Optimal thread counts
 */
function calculateThreads(ns, task) {
  const { target, action, security, money } = task;
  
  switch (action) {
    case 'hack':
      // For hack, we take at most 25% of money per cycle
      const hackPercent = 0.25;
      const hackThreads = Math.floor(ns.hackAnalyzeThreads(target, money.current * hackPercent));
      return {
        total: hackThreads > 0 ? hackThreads : 1,
        action: 'hack'
      };
      
    case 'grow':
      // Calculate growth factor needed
      const growthNeeded = money.target / Math.max(money.current, 1);
      const growThreads = Math.ceil(ns.growthAnalyze(target, growthNeeded));
      return {
        total: growThreads > 0 ? growThreads : 1,
        action: 'grow'
      };
      
    case 'weaken':
      // Calculate how much we need to weaken
      const weakenAmount = security.current - security.min;
      const weakenPerThread = 0.05;
      const weakenThreads = Math.ceil(weakenAmount / weakenPerThread);
      return {
        total: weakenThreads > 0 ? weakenThreads : 1,
        action: 'weaken'
      };
      
    default:
      return { total: 0 };
  }
}

/**
 * Assign servers to a task
 * @param {NS} ns - NetScript API
 * @param {Object} serversBySize - Grouped servers by RAM size
 * @param {Object} task - Task to assign servers to
 * @param {Object} threadCounts - Thread counts for the task
 * @param {Object} assignedHosts - Current host assignments
 * @param {Object} taskData - Task tracking data
 * @param {number} workerRam - RAM required for worker script
 */
async function assignServersToTask(ns, serversBySize, task, threadCounts, assignedHosts, taskData, workerRam) {
  // Get total threads needed
  const totalThreadsNeeded = threadCounts.total;
  let threadsAssigned = 0;
  
  // Debug: Get purchased servers
  const purchasedServers = ns.getPurchasedServers();
  ns.print(`🔍 Found ${purchasedServers.length} purchased servers for task ${task.action} on ${task.target}`);
  
  // Track which servers we've already processed to avoid duplicates
  const processedServers = new Set();
  
  // STEP 1: First, try to assign to purchased servers (excluding home)
  // This prioritizes using our own servers first
  for (const server of purchasedServers) {
    // Skip if we've assigned all needed threads
    if (threadsAssigned >= totalThreadsNeeded) break;
    
    try {
      // Don't process a server twice
      if (processedServers.has(server)) continue;
      processedServers.add(server);
      
      // Find this server in our size categories
      let serverObj = null;
      for (const category of ['huge', 'large', 'medium', 'small', 'tiny']) {
        if (!serversBySize[category]) continue;
        
        const found = serversBySize[category].find(s => s.name === server);
        if (found) {
          serverObj = found;
          break;
        }
      }
      
      // Skip if server not found or has insufficient RAM
      if (!serverObj || serverObj.availableRam < workerRam) {
        ns.print(`⚠️ Purchased server ${server} skipped: Not found or insufficient RAM (${serverObj ? serverObj.availableRam.toFixed(2) : 0}GB available)`);
        continue;
      }
      
      // Debug: Check if the worker script exists on the server
      const workerExists = ns.fileExists('/v6/worker.js', server);
      if (!workerExists) {
        // Try to copy the worker script to the server
        ns.print(`⚠️ Worker script not found on ${server}, attempting to copy...`);
        if (ns.scp('/v6/worker.js', server, 'home')) {
          ns.print(`✅ Successfully copied worker.js to ${server}`);
        } else {
          ns.print(`❌ Failed to copy worker.js to ${server}`);
          continue;
        }
      }
      
      // Calculate max threads for this server
      const maxThreads = Math.floor(serverObj.availableRam / workerRam);
      
      if (maxThreads <= 0) continue;
      
      // Determine threads to assign to this server
      const threadsToAssign = Math.min(maxThreads, totalThreadsNeeded - threadsAssigned);
      
      // Launch worker on this server
      const pid = ns.exec('/v6/worker.js', server, threadsToAssign, 
               task.target, threadCounts.action, threadsToAssign, JSON.stringify(task));
               
      if (pid > 0) {
        // Track the assignment
        if (!assignedHosts[server]) {
          assignedHosts[server] = [];
        }
        
        assignedHosts[server].push({
          target: task.target,
          action: threadCounts.action,
          threads: threadsToAssign,
          timestamp: Date.now()
        });
        
        threadsAssigned += threadsToAssign;
        taskData.activeWorkers++;
        
        // Update available RAM
        serverObj.availableRam -= (workerRam * threadsToAssign);
        
        ns.print(`✅ Using purchased server ${server}: assigned ${threadsToAssign} threads for ${task.action} on ${task.target}`);
      } else {
        ns.print(`❌ Failed to launch worker on ${server} with ${threadsToAssign} threads`);
      }
    } catch (error) {
      ns.print(`❌ Error processing ${server}: ${error.toString()}`);
    }
  }
  
  // STEP 2: If we still need more threads, use non-owned servers
  if (threadsAssigned < totalThreadsNeeded) {
    // Process by size category (largest first)
    const sizeCategories = ['huge', 'large', 'medium', 'small', 'tiny'];
    
    for (const category of sizeCategories) {
      // Skip if category doesn't exist or we have all threads we need
      if (!serversBySize[category] || threadsAssigned >= totalThreadsNeeded) continue;
      
      // Get non-owned, non-home servers with available RAM
      const nonOwnedServers = serversBySize[category].filter(s => 
        !s.isOwned && s.availableRam >= workerRam);
      
      // Process each server
      for (const server of nonOwnedServers) {
        // Skip if we've already processed this server or have all the threads we need
        if (processedServers.has(server.name) || threadsAssigned >= totalThreadsNeeded) continue;
        processedServers.add(server.name);
        
        // Calculate threads
        const maxThreads = Math.floor(server.availableRam / workerRam);
        if (maxThreads <= 0) continue;
        
        const threadsToAssign = Math.min(maxThreads, totalThreadsNeeded - threadsAssigned);
        
        // Launch worker
        const pid = ns.exec('/v6/worker.js', server.name, threadsToAssign, 
                  task.target, threadCounts.action, threadsToAssign, JSON.stringify(task));
                  
        if (pid > 0) {
          // Track assignment
          if (!assignedHosts[server.name]) {
            assignedHosts[server.name] = [];
          }
          
          assignedHosts[server.name].push({
            target: task.target,
            action: threadCounts.action,
            threads: threadsToAssign,
            timestamp: Date.now()
          });
          
          threadsAssigned += threadsToAssign;
          taskData.activeWorkers++;
          
          // Update available RAM
          server.availableRam -= (workerRam * threadsToAssign);
          
          ns.print(`✅ Using hacked server ${server.name}: assigned ${threadsToAssign} threads for ${task.action} on ${task.target}`);
        }
      }
    }
  }
  
  // STEP 3: As a last resort, use home if needed and available
  if (threadsAssigned < totalThreadsNeeded) {
    for (const category of ['huge', 'large', 'medium', 'small', 'tiny']) {
      if (!serversBySize[category]) continue;
      
      const homeServer = serversBySize[category].find(s => s.name === 'home');
      if (homeServer && homeServer.availableRam >= workerRam && !processedServers.has('home')) {
        processedServers.add('home');
        
        const maxThreads = Math.floor(homeServer.availableRam / workerRam);
        const threadsToAssign = Math.min(maxThreads, totalThreadsNeeded - threadsAssigned);
        
        if (threadsToAssign > 0) {
          const pid = ns.exec('/v6/worker.js', 'home', threadsToAssign, 
                    task.target, threadCounts.action, threadsToAssign, JSON.stringify(task));
                    
          if (pid > 0) {
            // Track assignment
            if (!assignedHosts['home']) {
              assignedHosts['home'] = [];
            }
            
            assignedHosts['home'].push({
              target: task.target,
              action: threadCounts.action,
              threads: threadsToAssign,
              timestamp: Date.now()
            });
            
            threadsAssigned += threadsToAssign;
            taskData.activeWorkers++;
            
            homeServer.availableRam -= (workerRam * threadsToAssign);
            
            ns.print(`✅ Using home server: assigned ${threadsToAssign} threads for ${task.action} on ${task.target}`);
          }
        }
        break;
      }
    }
  }
  
  // Log the results for this task
  if (threadsAssigned > 0) {
    ns.print(`📊 ${task.action.toUpperCase()} ${task.target}: ${threadsAssigned}/${totalThreadsNeeded} threads assigned`);
  } else {
    ns.print(`❌ Could not assign any threads for ${task.action.toUpperCase()} ${task.target}`);
  }
}

/**
 * Clean up stale worker assignments
 * @param {NS} ns - NetScript API
 * @param {Object} assignedHosts - Current host assignments
 */
function cleanupWorkers(ns, assignedHosts) {
  const now = Date.now();
  const staleThreshold = 10 * 60 * 1000; // 10 minutes
  
  for (const host in assignedHosts) {
    // Filter out stale assignments
    assignedHosts[host] = assignedHosts[host].filter(assignment => {
      return (now - assignment.timestamp) < staleThreshold;
    });
    
    // Remove host if it has no assignments
    if (assignedHosts[host].length === 0) {
      delete assignedHosts[host];
    }
  }
}

/**
 * Output system status
 * @param {NS} ns - NetScript API
 * @param {Array} tasks - Prioritized tasks
 * @param {Object} taskData - Task tracking data
 */
function outputStatus(ns, tasks, taskData) {
  // Output active workers
  ns.print(`👷 Active workers: ${taskData.activeWorkers}`);
  
  // Output top 3 targets
  const topTargets = tasks.slice(0, 3);
  
  for (const task of topTargets) {
    const moneyPercent = task.money.percent.toFixed(2);
    const securityStatus = task.security.current.toFixed(2);
    
    ns.print(
      `🎯 ${task.target} [${task.action.toUpperCase()}]: ` +
      `$${formatMoney(task.money.current)}/${formatMoney(task.money.max)} (${moneyPercent}%), ` +
      `Security: ${securityStatus}/${task.security.min.toFixed(2)}`
    );
  }
}

/**
 * Format money values to be more readable
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