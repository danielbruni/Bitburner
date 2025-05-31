/**
 * Utility functions for debugging in Bitburner
 * @param {NS} ns
 * @param {string} message
 */
export function timestampedPrint(ns, message) {
  const now = new Date();
  const timestamp = now.toISOString().replace("T", " ").substring(0, 19);
  ns.print(`[${timestamp}] ${message}`);
}

/**
 * Utility function to print a timestamped message to the terminal
 * @param {NS} ns
 * @param {string} message
 */
export function timestampedTPrint(ns, message) {
  const now = new Date();
  const timestamp = now.toISOString().replace("T", " ").substring(0, 19);
  ns.tprint(`[${timestamp}] ${message}`);
}
