/**
 * utils.js - Utility functions for server management
 */

/**
 * Get the maximum RAM we can afford for a purchased server
 * @param {NS} ns - NetScript API
 * @param {number} money - Available money
 * @returns {number} Maximum affordable RAM
 */
export function getMaxAffordableRam(ns, money) {
  let ram = 2; // Start with 2GB

  while (ram <= ns.getPurchasedServerMaxRam()) {
    const cost = ns.getPurchasedServerCost(ram * 2);
    if (cost > money) break;
    ram *= 2;
  }
  return ram;
}
