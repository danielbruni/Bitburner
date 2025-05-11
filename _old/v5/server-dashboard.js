/**
 * Server Overview UI Module
 * Provides a visual dashboard for purchased servers
 */

/** @param {NS} ns */
export async function main(ns) {
  // Configuration
  const refreshRate = 1000; // Update frequency in milliseconds
  const useCustomColors = true; // Set to false if you don't want ANSI color codes
  
  // Disable default logs to keep the UI clean
  ns.disableLog("ALL");
  
  // Clear terminal on startup for a clean view
  ns.ui.clearTerminal();
  
  // Main loop to continuously update the display
  while (true) {
    try {
      // Get all purchased servers plus home
      const purchasedServers = ns.getPurchasedServers();
      const allServers = ["home", ...purchasedServers];
      
      // Clear terminal and display header
      ns.ui.clearTerminal();
      printHeader(ns, allServers.length);
      
      // Display server information in a formatted table
      displayServerTable(ns, allServers, useCustomColors);
      
      // Display summary stats
      displaySummaryStats(ns, allServers);
      
      // Display troubleshooting info for server utilization issues
      checkForIssues(ns, allServers);
      
      // Wait before refreshing
      await ns.sleep(refreshRate);
    } catch (error) {
      ns.print(`ERROR: ${error.toString()}`);
      await ns.sleep(refreshRate * 5);
    }
  }
}

/**
 * Prints the header section of the UI
 * @param {NS} ns - NetScript API
 * @param {number} serverCount - Total number of servers being monitored
 */
function printHeader(ns, serverCount) {
  const header = `
╔══════════════════════════════════════════════════════════════╗
║                 PRIVATE SERVER OVERVIEW                      ║
║                                                              ║
║  Total Servers: ${serverCount.toString().padEnd(5)}        Bitnode: ${ns.getPlayer().bitNodeN}                ║
║  Hacking Level: ${ns.getHackingLevel().toString().padEnd(5)}                                       ║
╚══════════════════════════════════════════════════════════════╝`;
  
  ns.print(header);
}

/**
 * Formats and displays the server information table
 * @param {NS} ns - NetScript API
 * @param {string[]} servers - Array of server hostnames
 * @param {boolean} useColors - Whether to use color formatting
 */
function displayServerTable(ns, servers, useColors) {
  // Define color codes if enabled
  const colors = {
    header: "\u001b[38;5;75m",
    low: "\u001b[38;5;118m",    // Green for low usage
    medium: "\u001b[38;5;220m", // Yellow for medium usage
    high: "\u001b[38;5;196m",   // Red for high usage
    reset: "\u001b[0m"
  };
  
  // If colors are disabled, set all to empty strings
  if (!useColors) {
    Object.keys(colors).forEach(key => colors[key] = "");
  }
  
  // Table header
  ns.print(`
${colors.header}┌──────────────────┬──────────┬──────────┬────────────┬──────────────┬───────────────┐
│ Server Name      │ Max RAM  │ Used RAM │ Usage %    │ Running Procs │ Batch Tier    │
├──────────────────┼──────────┼──────────┼────────────┼──────────────┼───────────────┤${colors.reset}`);
  
  // Sort servers by RAM size descending
  const sortedServers = [...servers].sort((a, b) => 
    ns.getServerMaxRam(b) - ns.getServerMaxRam(a)
  );
  
  // Display info for each server
  for (const server of sortedServers) {
    const maxRam = ns.getServerMaxRam(server);
    const usedRam = ns.getServerUsedRam(server);
    const ramUsagePct = (usedRam / maxRam) * 100;
    const processCount = ns.ps(server).length;
    
    // Determine batch tier based on server RAM
    let batchTier = "N/A";
    if (maxRam >= 256) batchTier = "MASSIVE";
    else if (maxRam >= 128) batchTier = "HUGE";
    else if (maxRam >= 64) batchTier = "LARGE";
    else if (maxRam >= 32) batchTier = "STANDARD";
    else if (maxRam >= 16) batchTier = "MEDIUM";
    else if (maxRam >= 8) batchTier = "SMALL";
    else if (maxRam >= 4) batchTier = "TINY";
    else if (maxRam >= 2) batchTier = "MICRO";
    
    // Choose color based on RAM usage percentage
    let color = colors.low;
    if (ramUsagePct > 90) color = colors.high;
    else if (ramUsagePct > 60) color = colors.medium;
    
    // Format strings for display
    const serverName = server.padEnd(16);
    const maxRamStr = `${formatRam(maxRam)}`.padEnd(8);
    const usedRamStr = `${formatRam(usedRam)}`.padEnd(8);
    const usageStr = `${ramUsagePct.toFixed(2)}%`.padEnd(10);
    const processStr = `${processCount}`.padEnd(12);
    const tierStr = batchTier.padEnd(13);
    
    // Print the row with appropriate color
    ns.print(`${color}│ ${serverName} │ ${maxRamStr} │ ${usedRamStr} │ ${usageStr} │ ${processStr} │ ${tierStr} │${colors.reset}`);
  }
  
  // Table footer
  ns.print(`${colors.header}└──────────────────┴──────────┴──────────┴────────────┴──────────────┴───────────────┘${colors.reset}`);
}

/**
 * Display summary statistics for all servers
 * @param {NS} ns - NetScript API
 * @param {string[]} servers - Array of server hostnames
 */
function displaySummaryStats(ns, servers) {
  let totalRam = 0;
  let usedRam = 0;
  let totalServers = servers.length;
  let activeServers = 0;
  let idleServers = 0;
  
  // Calculate stats
  for (const server of servers) {
    const maxRam = ns.getServerMaxRam(server);
    const serverUsedRam = ns.getServerUsedRam(server);
    
    totalRam += maxRam;
    usedRam += serverUsedRam;
    
    if (serverUsedRam > 0) {
      activeServers++;
    } else {
      idleServers++;
    }
  }
  
  const usagePercent = (usedRam / totalRam) * 100;
  
  // Display the summary
  ns.print(`
╔══════════════════════════════════════════════════════════════╗
║                    SUMMARY STATISTICS                        ║
╠══════════════════════════════════╦═══════════════════════════╣
║  Total RAM: ${formatRam(totalRam).padEnd(15)} ║  Used RAM: ${formatRam(usedRam).padEnd(15)} ║
║  Usage: ${usagePercent.toFixed(2)}%${' '.repeat(15)} ║  Free RAM: ${formatRam(totalRam - usedRam).padEnd(15)} ║
║  Active Servers: ${activeServers.toString().padEnd(11)} ║  Idle Servers: ${idleServers.toString().padEnd(12)} ║
╚══════════════════════════════════╩═══════════════════════════╝`);
}

/**
 * Check for potential issues with server utilization
 * @param {NS} ns - NetScript API
 * @param {string[]} servers - Array of server hostnames
 */
function checkForIssues(ns, servers) {
  // Check for idle servers with sufficient RAM
  const idleServers = servers.filter(server => 
    ns.getServerUsedRam(server) === 0 && 
    ns.getServerMaxRam(server) >= 8 // Servers with 8GB+ RAM should be utilized
  );
  
  if (idleServers.length > 0) {
    ns.print(`
╔══════════════════════════════════════════════════════════════╗
║                  ⚠️  TROUBLESHOOTING  ⚠️                     ║
╠══════════════════════════════════════════════════════════════╣`);
    
    ns.print(`║  Found ${idleServers.length} idle servers with 8GB+ RAM that should be utilized:`);
    for (const server of idleServers) {
      const ram = ns.getServerMaxRam(server);
      ns.print(`║  - ${server}: ${formatRam(ram)} available`);
    }
    
    ns.print(`║                                                              ║
║  Possible causes:                                          ║
║  1. Batch sizes may be too large for these servers         ║
║  2. The main targeting script may not be recognizing them  ║
║  3. There might be an issue with script deployment         ║
║                                                              ║
║  Suggestions:                                                ║
║  - Check the batch-deployer.js for issues with server list   ║
║  - Verify that micro/tiny batches are properly sized        ║
║  - Kill all scripts and run main.js again                   ║
╚══════════════════════════════════════════════════════════════╝`);
  }
}

/**
 * Format RAM values to be more readable
 * @param {number} ram - RAM value in GB
 * @returns {string} Formatted RAM string
 */
function formatRam(ram) {
  if (ram >= 1024) {
    return `${(ram / 1024).toFixed(2)}TB`;
  } else {
    return `${ram.toFixed(2)}GB`;
  }
}