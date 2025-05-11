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

/**
 * Format money values to be more readable
 * @param {number} money - Money value to format
 * @returns {string} Formatted money string
 */
export function formatMoney(money) {
  if (money >= 1e12) return `${(money / 1e12).toFixed(2)}t`;
  if (money >= 1e9) return `${(money / 1e9).toFixed(2)}b`;
  if (money >= 1e6) return `${(money / 1e6).toFixed(2)}m`;
  if (money >= 1e3) return `${(money / 1e3).toFixed(2)}k`;
  return `${money.toFixed(2)}`;
}
