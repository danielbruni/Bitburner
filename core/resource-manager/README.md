# Modular Resource Manager

The Resource Manager has been refactored into a modular structure to improve maintainability and readability.

## Module Structure

- `index.js` - The main entry point that coordinates all other modules
- `prepare-servers.js` - Handles server preparation and script copying
- `task-prioritization.js` - Prioritizes tasks based on server status and potential profit
- `thread-calculator.js` - Calculates optimal thread counts for each task type
- `resource-allocation.js` - Manages allocation of server resources to tasks
- `server-assignment.js` - Handles assignment of specific servers to tasks
- `large-server-optimization.js` - Optimizations for servers with >1TB RAM
- `utils.js` - Utility functions for output and cleanup

## Key Improvements

1. **Modularity** - Each component has a clear responsibility, making the system easier to maintain and extend
2. **Large Server Optimization** - Special handling for servers with >1TB RAM, implementing task chunking for better performance
3. **Separation of Concerns** - Each module focuses on a specific task, improving code organization
4. **Better Error Handling** - Improved error isolation by module

## How to Use

The resource manager can be started directly from the main.js script, or manually using:

```
run /core/resource-manager/index.js [moneyThreshold] [securityThreshold] [homeReservedRam]
```

## RAM Size Categories

The system categorizes servers by RAM size to optimize allocation:

- Tiny: <8GB RAM
- Small: 8-32GB RAM
- Medium: 32-128GB RAM
- Large: 128-512GB RAM
- Huge: >512GB RAM

## Large Server Optimization

For servers with more than 1TB RAM, the system now splits tasks into smaller chunks to improve performance. This prevents the "all eggs in one basket" problem where all RAM is assigned to a single task.
