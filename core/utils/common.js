/**
 * common.js - Common utility functions shared across the entire system
 */

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

/**
 * Format bytes for display
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted bytes string
 */
export function formatBytes(bytes) {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)}TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)}GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)}MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)}KB`;
  return `${bytes}B`;
}

/**
 * Format time duration in milliseconds to human readable string
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string
 */
export function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format percentage for display
 * @param {number} value - Value (0-1 or 0-100)
 * @param {boolean} isDecimal - Whether value is decimal (0-1) or percentage (0-100)
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, isDecimal = true) {
  const percent = isDecimal ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get current timestamp formatted for display
 * @returns {string} Formatted timestamp
 */
export function getTimestamp() {
  return new Date().toLocaleTimeString();
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
