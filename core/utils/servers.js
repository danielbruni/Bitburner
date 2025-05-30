/**
 * Clean up scripts from all servers
 * @param {NS} ns - NetScript API
 */
export async function cleanAllServers(ns) {
  await cleanPrivateServers(ns);
  await cleanHackedServers(ns);
}

/**
 * Clean up scripts from all private servers
 * @param {NS} ns - NetScript API
 */
export async function cleanPrivateServers(ns) {
  // Get all purchased servers
  const privateServers = ns.getPurchasedServers();

  // Files to remove
  const filesToRemove = ["/core/workers/worker.js"];

  let serversProcessed = 0;
  let filesRemoved = 0;

  // Process each server
  for (const server of privateServers) {
    serversProcessed++;

    // Kill all scripts on the server first
    ns.killall(server);

    // Remove each file if it exists
    for (const file of filesToRemove) {
      if (ns.fileExists(file, server)) {
        ns.rm(file, server);
        filesRemoved++;
      }
    }
  }

  if (serversProcessed > 0) {
    ns.tprint(
      `🧹 Cleaned ${filesRemoved} script files from ${serversProcessed} private servers`
    );
  }
}

/**
 * Clean up scripts from all hacked servers
 * @param {NS} ns - NetScript API
 */
export async function cleanHackedServers(ns) {
  // Get all hacked servers
  const hackedServers = await getHackedServers(ns);

  // Files to remove
  const filesToRemove = ["/core/workers/worker.js"];

  let serversProcessed = 0;
  let filesRemoved = 0;

  // Process each server
  for (const server of hackedServers) {
    // Skip home server - NEVER clean home server!
    if (server === "home") continue;

    serversProcessed++;

    // Kill all scripts on the server first
    ns.killall(server);

    // Remove each file if it exists
    for (const file of filesToRemove) {
      if (ns.fileExists(file, server)) {
        ns.rm(file, server);
        filesRemoved++;
      }
    }
  }

  if (serversProcessed > 0) {
    ns.tprint(
      `🧹 Cleaned ${filesRemoved} script files from ${serversProcessed} hacked servers`
    );
  }
}

/**
 * Get a list of all hacked servers (servers with root access)
 * @param {NS} ns - NetScript API
 * @returns {Promise<string[]>} Array of server names
 */
export async function getHackedServers(ns) {
  // Start with home
  const servers = ["home"];
  const queue = ["home"];
  const visited = new Set(queue);

  // Breadth-first search to find all servers
  while (queue.length > 0) {
    const current = queue.shift();

    // Get all connected servers
    const connected = ns.scan(current);

    for (const server of connected) {
      if (!visited.has(server)) {
        visited.add(server);

        // Only add servers we have root access to
        if (ns.hasRootAccess(server)) {
          servers.push(server);
          queue.push(server);
        }
      }
    }
  }

  return servers;
}
