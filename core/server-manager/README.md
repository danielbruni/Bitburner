# Server Manager Module

The Server Manager has been refactored into a modular structure to improve maintainability and readability.

## Module Structure

- `index.js` - The main entry point that coordinates all other modules
- `purchase-manager.js` - Handles purchasing and upgrading servers
- `server-scanner.js` - Scans and discovers all servers in the network
- `root-access.js` - Handles gaining root access to servers
- `server-categorizer.js` - Categorizes servers as targets or resources
- `data-exporter.js` - Exports server data to files
- `utils.js` - Utility functions for server management

## Key Improvements

1. **Modularity** - Each component has a clear responsibility, making the system easier to maintain and extend
2. **Separation of Concerns** - Each module focuses on a specific task, improving code organization
3. **Better Error Handling** - Improved error isolation by module
4. **Maintainability** - Smaller files are easier to understand and modify

## How to Use

The server manager can be started directly from the main.js script, or manually using:

```
run /core/server-manager/index.js [shouldUpgradeServers] [homeReservedRam]
```

Where:

- `shouldUpgradeServers` - Set to `true` to automatically upgrade existing servers
- `homeReservedRam` - Amount of RAM to reserve on home server (default: 10GB)
