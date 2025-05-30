# Bitburner Strategy Change System Documentation

## Overview

The Bitburner hacking system now includes an automatic strategy change mechanism that detects when money generation stagnates and automatically switches strategies to improve performance.

## Key Components

### 1. Money Tracking (`/core/process/money-tracker.js`)

- **Purpose**: Continuously monitors money generation rates and detects stagnation
- **Features**:
  - Tracks earnings rate over configurable time windows (default: 30 samples over 5 minutes)
  - Detects when earnings stagnate (no positive income for 5+ minutes)
  - Provides formatted status information for monitoring
  - Suggests strategy changes when performance is poor

### 2. Strategy Coordination (`/core/process/strategy-coordinator.js`)

- **Purpose**: Manages strategy changes across the entire system
- **Strategies Available**:
  - **Balanced**: Default strategy with standard parameters
  - **Aggressive**: Lower thresholds, faster execution, higher risk tolerance
  - **Conservative**: Higher thresholds, slower execution, more retries
  - **Emergency**: Very aggressive targeting of only the best servers
- **Features**:
  - Automatic strategy switching based on performance
  - Manual strategy override capability
  - Strategy change history tracking
  - Cooldown periods to prevent rapid strategy switching

### 3. Resource Manager Integration (`/core/resource-manager/index.js`)

- **Purpose**: Applies strategy-specific resource allocation adjustments
- **Strategy Effects**:
  - **Aggressive**: 50% lower money thresholds, 50% higher security tolerance
  - **Conservative**: 100% higher money thresholds, 30% lower security tolerance
  - **Emergency**: 200% higher money thresholds, focus on best targets only
  - **Balanced**: Standard configuration values

### 4. Worker Strategy Parameters (`/core/resource-manager/server-assignment.js`)

- **Purpose**: Applies strategy-specific behavior to individual workers
- **Strategy Effects**:
  - **Aggressive**: 500ms cooldown, lower thresholds, more risk tolerance
  - **Conservative**: 2000ms cooldown, higher thresholds, more retries (3x)
  - **Emergency**: 100ms cooldown, very aggressive thresholds
  - **Balanced**: Standard 1000ms cooldown and default parameters

## Integration Points

### Main System (`main.js`)

- Imports MoneyTracker and StrategyCoordinator
- Initializes both systems during startup
- Calls `handleMoneyTrackingAndStrategy()` every health check cycle
- Displays money tracking and strategy status in system output
- Coordinates strategy change notifications across processes

### Configuration (`/core/config/system-config.js`)

- Money tracking configuration (intervals, thresholds, sample sizes)
- Strategy management settings (cooldowns, performance tracking)
- All strategy parameters are configurable

## Monitoring and Testing

### Real-time Monitoring (`strategy-monitor.js`)

```
run strategy-monitor.js
```

Shows live updates of:

- Current money generation rates
- Strategy status and recent changes
- Performance metrics per strategy
- System warnings and recommendations

### Testing Tools (`test-strategy-system.js`)

```
run test-strategy-system.js basic      # Test basic functionality
run test-strategy-system.js manual     # Test manual strategy changes
run test-strategy-system.js stagnation # Test stagnation detection
```

## How It Works

1. **Continuous Monitoring**: MoneyTracker updates every 10 seconds, tracking money generation rates
2. **Stagnation Detection**: If no positive earnings for 5+ minutes, system flags as stagnant
3. **Strategy Recommendation**: When stagnant, StrategyCoordinator recommends a different strategy
4. **System-wide Changes**: Strategy changes propagate to resource manager and all workers
5. **Performance Tracking**: System tracks performance of each strategy to optimize future decisions

## Configuration Options

Key settings in `system-config.js`:

```javascript
moneyTracking: {
  interval: 10000,           // Update frequency (10 seconds)
  sampleSize: 30,           // Samples to keep (5 minutes of data)
  minRateThreshold: 1000,   // Minimum acceptable rate ($/sec)
  stagnationTime: 300000,   // Stagnation threshold (5 minutes)
}

strategyManagement: {
  cooldownTime: 600000,     // Strategy change cooldown (10 minutes)
  performanceWindowSize: 10, // Performance tracking window
  enabled: true,            // Enable automatic strategy changes
}
```

## Benefits

1. **Automatic Optimization**: System automatically adapts when performance degrades
2. **No Manual Intervention**: Runs completely autonomously
3. **Performance Tracking**: Learns which strategies work best in different situations
4. **Comprehensive Integration**: All system components respect strategy changes
5. **Monitoring Tools**: Rich debugging and monitoring capabilities included

## Status Integration

The main system now displays money tracking information in its status output:

```
💰 Money Status - Rate: $1.23k/sec | Strategy: balanced | Stagnant: NO
```

This provides at-a-glance visibility into the system's earning performance and current strategy.
