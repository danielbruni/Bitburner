/**
 * connect.js - Connect to any server in the network
 *
 * This script uses BFS to find a path from home to a target server
 * and automatically connects to it through terminal commands.
 */

/** @param {NS} ns */
export async function main(ns) {
  // Get the target server from arguments
  const targetServer = ns.args[0];

  if (!targetServer) {
    ns.tprint("❌ Error: Please provide a server name to connect to.");
    ns.tprint("Usage: run connect.js [server-name]");
    return;
  }

  // Find path to target server
  const path = findPath(ns, "home", targetServer);

  if (!path) {
    ns.tprint(`❌ Could not find a path to server: ${targetServer}`);
    return;
  }

  // Connect to each server in the path
  let connectionCommands = "";

  for (const server of path) {
    connectionCommands += `connect ${server}; `;
  }

  // Remove trailing semicolon and space
  connectionCommands = connectionCommands.slice(0, -2);

  // Execute the commands in the terminal
  ns.tprint(`🔗 Path found: home -> ${path.join(" -> ")}`);
  ns.tprint(`📡 Connecting to ${targetServer}...`);
  const terminalInput = document.getElementById("terminal-input");
  terminalInput.value = connectionCommands;
  const handler = Object.keys(terminalInput)[1];
  terminalInput[handler].onChange({ target: terminalInput });
  terminalInput[handler].onKeyDown({
    key: "Enter",
    preventDefault: () => null,
  });
}

/**
 * Find the shortest path from source to target server
 * @param {NS} ns - NetScript API
 * @param {string} source - Source server name
 * @param {string} target - Target server name
 * @returns {string[]|null} - Array of server names in the path or null if no path
 */
function findPath(ns, source, target) {
  // Edge case - source is the target
  if (source === target) {
    return [];
  }

  // Use BFS to find the shortest path
  const queue = [[source]];
  const visited = new Set([source]);

  while (queue.length > 0) {
    const path = queue.shift();
    const currentServer = path[path.length - 1];

    // Get all neighbors
    const neighbors = ns.scan(currentServer);

    for (const neighbor of neighbors) {
      if (neighbor === target) {
        // Found the target, return the path excluding source
        return path.slice(1).concat(neighbor);
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(path.concat(neighbor));
      }
    }
  }

  // No path found
  return null;
}
