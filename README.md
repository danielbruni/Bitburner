# Bitburner Dynamic Resource Allocation System

A sophisticated automation system for the programming-based incremental game [Bitburner](https://danielyxie.github.io/bitburner/), built to maximize efficiency through intelligent resource allocation.

## Overview

This system uses a dynamic approach to resource allocation, constantly evaluating server statuses and deploying optimal hacking operations based on real-time conditions rather than using fixed batches. This maximizes utilization of all available computing resources to generate maximum in-game income.

## Key Components

- **Main System** (`main.js`) - Central coordinator that initiates all subsystems
- **Shutdown System** (`shutdown.js`) - Safely stops all processes and cleans up resources
- **Core Directory** - Contains all essential operational systems
  - **Server Manager** - Discovers, categorizes, and prepares servers
  - **Resource Manager** - Intelligently allocates resources to tasks
  - **Operations** - Basic hacking operations (hack, grow, weaken)
  - **Workers** - Scripts that coordinate operations on target servers

## Features

- 🔄 **Dynamic Targeting** - Continuously reassesses and prioritizes targets
- 🖥️ **Server Auto-Discovery** - Automatically finds and gains access to new servers
- 💰 **Profit Optimization** - Targets servers with best money-to-security ratio
- 🚀 **Efficient Resource Allocation** - Distributes computing power where it will have maximum impact
- 🔌 **Large Server Optimization** - Special handling for servers with >1TB RAM
- 📊 **Modular Design** - Cleanly separated components for easy maintenance

## Usage

1. Copy all files to your Bitburner home server
2. Run the main script:

   ```
   run main.js                   # Normal startup
   run main.js --clear-data=true # Reset data files and start fresh
   ```

3. To shut down the system safely:
   ```
   run shutdown.js               # Normal shutdown
   run shutdown.js --clear-data=true # Shutdown and clear data for fresh restart
   ```

The `shutdown.js` script ensures a clean shutdown by:

- Terminating all system processes
- Killing worker scripts on all servers
- Removing scripts from remote servers
- Optionally clearing data files for a fresh start

The `--clear-data` flag is useful when:

- Recovering from corrupted data files
- After major system changes
- Troubleshooting system issues
- When you want to reset all tracking and start fresh

## Configuration

Edit the CONFIG object in `main.js` to customize behavior:

```javascript
const CONFIG = {
  targetUpdateInterval: 60000, // How often to reassess targets (ms)
  serverUpdateInterval: 10000, // How often to scan for new servers (ms)
  homeReservedRam: 10, // GB of RAM to reserve on home server
  shouldUpgradeServers: false, // Set to true to upgrade purchased servers
  moneyThreshold: 0.75, // Hack when server has this much money (75%)
  securityThreshold: 5, // Extra security above minimum to tolerate
  logLevel: 1, // 0: minimal, 1: normal, 2: verbose
};
```

## Directory Structure

- `/core/` - Core functionality
  - `/debug/` - Comprehensive debugging and monitoring system
  - `/operations/` - Basic hacking operations
  - `/workers/` - Worker scripts for coordination
  - `/resource-manager/` - Resource allocation system
  - `/server-manager/` - Modular server discovery and preparation system
  - `/utils/` - Common utility functions (formatMoney, formatBytes, etc.)
  - `server-manager.js` - Legacy wrapper for compatibility
- `/data/` - Data storage for system state
  - `servers.json` - Information about available and target servers
  - `targets.json` - Prioritized target servers for hacking
  - `process-health.json` - Process monitoring data
- `/helper/` - Utility scripts and functions
- `/tests/` - Test scripts for system validation

## Advanced Features

- **Debug System** - Comprehensive troubleshooting and monitoring:

  - `debug-runner.js` - Central launcher for all debug tools
  - Money generation analysis and earnings monitoring
  - Worker activity tracking and efficiency analysis
  - System health checks with auto-fix capabilities
  - Real-time monitoring dashboards

- **Common Utilities** - Centralized formatting and helper functions:

  - Money, bytes, time, and percentage formatting
  - Shared across all system components for consistency
  - Located in `/core/utils/common.js`

- **Server RAM Categorization** - Optimizes resource usage based on server size:

  - Tiny: <8GB RAM
  - Small: 8-32GB RAM
  - Medium: 32-128GB RAM
  - Large: 128-512GB RAM
  - Huge: >512GB RAM

- **Large Server Chunking** - For servers with >1TB RAM, tasks are split into chunks to improve efficiency and prevent "all eggs in one basket" problems

- **Data Management**
  - System state is persistently stored in JSON files in the `/data/` directory
  - Built-in data reset functionality via the `--clear-data` flag
  - Automatic recovery from corrupted or missing data files
  - Data staleness detection with automatic refresh
- **System Management**
  - Clean shutdown capability via `shutdown.js`
  - Thorough cleanup of remote server scripts
  - Process termination and resource recovery
  - Safe reset functionality for troubleshooting

## License

This project is open source and available for personal use and modification.
