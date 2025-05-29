/**
 * coordination.js - Inter-Process Coordination System
 * Manages coordination between system processes using shared state files
 */

/**
 * Process coordination manager for handling shared state and communication
 */
export class ProcessCoordinator {
  constructor(ns) {
    this.ns = ns;
    this.stateFile = "/data/system-state.json";
    this.coordinationFile = "/data/coordination.json";
    this.lastStateUpdate = 0;
    this.state = this.loadState();
  }

  /**
   * Load current system state
   * @returns {Object} System state
   */
  loadState() {
    try {
      const stateData = this.ns.read(this.stateFile);
      return stateData ? JSON.parse(stateData) : this.getDefaultState();
    } catch {
      return this.getDefaultState();
    }
  }

  /**
   * Get default system state
   * @returns {Object} Default state
   */
  getDefaultState() {
    return {
      lastServerScan: 0,
      lastTargetUpdate: 0,
      serverDataAge: 0,
      targetDataAge: 0,
      filesCopied: false,
      systemStartTime: Date.now(),
      coordinationVersion: 1,
    };
  }

  /**
   * Update system state
   * @param {Object} updates - State updates to apply
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.saveState();
  }

  /**
   * Save current state to file
   */
  saveState() {
    try {
      this.ns.write(
        this.stateFile,
        JSON.stringify({
          ...this.state,
          lastUpdate: Date.now(),
        }),
        "w"
      );
      this.lastStateUpdate = Date.now();
    } catch (error) {
      this.ns.print(`ERROR saving system state: ${error}`);
    }
  }

  /**
   * Check if server data needs refreshing
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} True if data is stale
   */
  isServerDataStale(maxAge = 10000) {
    return Date.now() - this.state.lastServerScan > maxAge;
  }

  /**
   * Check if target data needs refreshing
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} True if data is stale
   */
  isTargetDataStale(maxAge = 60000) {
    return Date.now() - this.state.lastTargetUpdate > maxAge;
  }

  /**
   * Mark server data as refreshed
   */
  markServerDataRefreshed() {
    this.updateState({
      lastServerScan: Date.now(),
      serverDataAge: Date.now(),
    });
  }

  /**
   * Mark target data as refreshed
   */
  markTargetDataRefreshed() {
    this.updateState({
      lastTargetUpdate: Date.now(),
      targetDataAge: Date.now(),
    });
  }

  /**
   * Check if files have been copied to servers recently
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {boolean} True if files were copied recently
   */
  areFilesFresh(maxAge = 300000) {
    // 5 minutes default
    if (!this.state.filesCopied) return false;
    return Date.now() - this.state.filesCopied < maxAge;
  }

  /**
   * Mark files as copied to servers
   */
  markFilesCopied() {
    this.updateState({ filesCopied: Date.now() });
  }

  /**
   * Send coordination message to other processes
   * @param {string} type - Message type
   * @param {Object} data - Message data
   */
  sendMessage(type, data = {}) {
    try {
      const coordination = this.loadCoordination();
      const message = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        sender: "main",
      };

      coordination.messages.push(message);

      // Keep only last 50 messages
      if (coordination.messages.length > 50) {
        coordination.messages = coordination.messages.slice(-50);
      }

      this.ns.write(this.coordinationFile, JSON.stringify(coordination), "w");
    } catch (error) {
      this.ns.print(`ERROR sending coordination message: ${error}`);
    }
  }

  /**
   * Read coordination messages
   * @param {string} type - Filter by message type (optional)
   * @returns {Array} Array of messages
   */
  readMessages(type = null) {
    try {
      const coordination = this.loadCoordination();
      const messages = coordination.messages || [];

      if (type) {
        return messages.filter((msg) => msg.type === type);
      }

      return messages;
    } catch {
      return [];
    }
  }

  /**
   * Load coordination data
   * @returns {Object} Coordination data
   */
  loadCoordination() {
    try {
      const coordData = this.ns.read(this.coordinationFile);
      return coordData ? JSON.parse(coordData) : { messages: [], version: 1 };
    } catch {
      return { messages: [], version: 1 };
    }
  }

  /**
   * Request server data refresh if needed
   * @param {number} maxAge - Maximum age before refresh needed
   * @returns {boolean} True if refresh was requested
   */
  requestServerRefreshIfNeeded(maxAge = 10000) {
    if (this.isServerDataStale(maxAge)) {
      this.sendMessage("server_refresh_needed", {
        reason: "Data stale",
        lastScan: this.state.lastServerScan,
        maxAge,
      });
      return true;
    }
    return false;
  }

  /**
   * Request target data refresh if needed
   * @param {number} maxAge - Maximum age before refresh needed
   * @returns {boolean} True if refresh was requested
   */
  requestTargetRefreshIfNeeded(maxAge = 60000) {
    if (this.isTargetDataStale(maxAge)) {
      this.sendMessage("target_refresh_needed", {
        reason: "Data stale",
        lastUpdate: this.state.lastTargetUpdate,
        maxAge,
      });
      return true;
    }
    return false;
  }

  /**
   * Get system uptime in seconds
   * @returns {number} Uptime in seconds
   */
  getSystemUptime() {
    return Math.floor((Date.now() - this.state.systemStartTime) / 1000);
  }

  /**
   * Get coordination status summary
   * @returns {Object} Status summary
   */
  getStatusSummary() {
    const now = Date.now();
    return {
      uptime: this.getSystemUptime(),
      serverDataAge: Math.floor((now - this.state.lastServerScan) / 1000),
      targetDataAge: Math.floor((now - this.state.lastTargetUpdate) / 1000),
      filesCopiedAge: this.state.filesCopied
        ? Math.floor((now - this.state.filesCopied) / 1000)
        : null,
      recentMessages: this.readMessages().length,
      lastStateUpdate: Math.floor((now - this.lastStateUpdate) / 1000),
    };
  }
}
