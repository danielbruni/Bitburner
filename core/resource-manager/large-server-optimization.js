/**
 * large-server-optimization.js - Optimizations for servers with >1TB RAM
 */

/**
 * Calculate optimal thread chunks for large servers
 * This helps distribute threads more efficiently on very large servers
 * @param {NS} ns - NetScript API
 * @param {Object} task - Task to calculate threads for
 * @param {number} totalRam - Total RAM available
 * @param {number} workerRam - RAM required per worker thread
 * @returns {Array} Array of thread chunks to distribute
 */
export function calculateLargeServerChunks(ns, task, totalRam, workerRam) {
  // Skip optimization for servers under 1TB
  if (totalRam < 1024) {
    return [
      {
        threads: Math.floor(totalRam / workerRam),
        action: task.action,
      },
    ];
  }

  // For large servers, we'll split the allocation into multiple chunks
  // This allows for more efficient utilization and better parallelism
  const chunks = [];
  const maxThreadsPerChunk = 10000; // Avoid too large single allocations
  let remainingRam = totalRam;

  // For very large servers with >1TB RAM, distribute tasks more efficiently
  while (remainingRam >= workerRam) {
    // Calculate how many threads we can fit in this chunk
    const maxPossibleThreads = Math.floor(remainingRam / workerRam);
    const threadsForChunk = Math.min(maxPossibleThreads, maxThreadsPerChunk);

    if (threadsForChunk <= 0) break;

    // Add the chunk
    chunks.push({
      threads: threadsForChunk,
      action: task.action,
    });

    // Update remaining RAM
    remainingRam -= threadsForChunk * workerRam;
  }

  return chunks;
}

/**
 * Launch worker scripts in chunks on a large server
 * @param {NS} ns - NetScript API
 * @param {string} server - Server name
 * @param {Array} chunks - Array of thread chunks
 * @param {Object} task - Task details
 * @param {Object} assignedHosts - Tracking for assignments
 * @param {Object} taskData - Task tracking data
 * @returns {number} Total threads assigned
 */
export async function launchChunkedWorkers(
  ns,
  server,
  chunks,
  task,
  assignedHosts,
  taskData
) {
  let totalThreadsAssigned = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Skip empty chunks
    if (chunk.threads <= 0) continue;

    // Add a small delay between launches to prevent overloading
    if (i > 0) await ns.sleep(50);

    // Launch worker with this chunk
    const pid = ns.exec(
      "/shared/worker.js",
      server,
      chunk.threads,
      task.target,
      chunk.action,
      chunk.threads,
      JSON.stringify({ ...task, chunkId: i })
    );

    if (pid > 0) {
      // Track assignment
      if (!assignedHosts[server]) {
        assignedHosts[server] = [];
      }

      assignedHosts[server].push({
        target: task.target,
        action: chunk.action,
        threads: chunk.threads,
        timestamp: Date.now(),
        chunkId: i,
      });

      totalThreadsAssigned += chunk.threads;
      taskData.activeWorkers++;

      ns.print(
        `✅ Chunk ${i + 1}/${chunks.length}: ${chunk.threads} threads for ${
          chunk.action
        } on ${task.target}`
      );
    } else {
      ns.print(
        `❌ Failed to launch chunk ${i + 1}/${chunks.length} with ${
          chunk.threads
        } threads`
      );
    }
  }

  return totalThreadsAssigned;
}
