# Debug System for Money Generation Issues

This debug system helps identify why your hacking system isn't generating money. It provides comprehensive analysis and monitoring tools.

## Quick Start

If you're not making money, start with this command:

```
run debug-runner.js quick
```

This will quickly identify the most common issues.

## Available Tools

### 1. Quick Diagnostic

```
run debug-runner.js quick
```

Fast check for obvious problems like missing scripts or no workers.

### 2. System Health Check

```
run debug-runner.js health
run debug-runner.js fix       # Same as above but attempts auto-fixes
```

Comprehensive system health analysis including:

- Main script status
- Resource manager status
- Required files check
- Data files validation
- RAM availability
- Target accessibility

### 3. Money Analysis

```
run debug-runner.js money
```

Deep analysis of money generation including:

- Server resource utilization
- Target server status (ready to hack?)
- Worker activity breakdown
- System bottlenecks
- Actionable recommendations

### 4. Live Monitoring

```
run debug-runner.js monitor
```

Real-time earnings monitor showing:

- Current money and earnings
- Earnings rate per second/minute/hour
- Active worker count
- System status

### 5. Worker Analysis

```
run debug-runner.js workers    # Current worker status
run debug-runner.js track      # Live worker earnings tracking
run debug-runner.js analyze    # Worker efficiency analysis
```

### 6. Comprehensive Analysis

```
run debug-runner.js all
```

Runs all diagnostics for complete system analysis.

## Common Issues and Solutions

### Issue: No Workers Running

**Symptoms:** Money not increasing, worker count is 0  
**Causes:**

- Main script not running
- Resource manager not running
- No available RAM on servers
- Missing script files

**Solutions:**

1. Run `run debug-runner.js fix` for auto-repair
2. Restart main.js: `run main.js`
3. Check RAM usage and upgrade servers

### Issue: Workers Running But No Money

**Symptoms:** Workers active but no hack workers, or hack workers on poor targets  
**Causes:**

- All workers are grow/weaken (preparing targets)
- Targets need more preparation before hacking
- Workers assigned to low-value targets

**Solutions:**

1. Wait for targets to be prepared (this can take time)
2. Use `run debug-runner.js workers` to see what workers are doing
3. Check if targets have sufficient money and low security

### Issue: Very Slow Money Generation

**Symptoms:** Money increasing but very slowly  
**Causes:**

- Too few hack workers
- Workers on low-value targets
- Servers overloaded (>95% RAM usage)
- Inefficient resource allocation

**Solutions:**

1. Upgrade servers for more RAM
2. Use `run debug-runner.js analyze` to check efficiency
3. Ensure high-value targets are being prioritized

### Issue: System Keeps Stopping

**Symptoms:** Scripts stop running frequently  
**Causes:**

- RAM shortage causing script kills
- Missing dependencies
- Errors in scripts

**Solutions:**

1. Check home server RAM usage
2. Upgrade servers if needed
3. Use `run debug-runner.js health` to identify issues

## Understanding the Output

### Worker Status Codes

- **H** = Hack workers (generate money)
- **G** = Grow workers (increase target money)
- **W** = Weaken workers (reduce target security)

### Target Status

- **Money %** = Current money / Maximum money
- **Security** = Current security / Minimum security
- Higher money % and lower security = better for hacking

### RAM Utilization

- **<50%** = Underutilized (can run more workers)
- **50-85%** = Good utilization
- **85-95%** = High utilization (efficient)
- **>95%** = Overloaded (may cause issues)

## Monitoring Your System

For ongoing monitoring, use:

```
run debug-runner.js monitor
```

This shows real-time earnings and will help you understand:

- If money is being generated
- How fast money is being generated
- Whether the system is working properly

## When to Use Each Tool

1. **System suddenly stopped making money** → `run debug-runner.js quick`
2. **Never made money** → `run debug-runner.js fix`
3. **Making money but very slowly** → `run debug-runner.js analyze`
4. **Want to watch earnings live** → `run debug-runner.js monitor`
5. **Complete system analysis** → `run debug-runner.js all`

## Tips for Better Money Generation

1. **Ensure targets are ready**: Use grow/weaken to prepare targets before hacking
2. **Upgrade servers**: More RAM = more workers = more money
3. **Monitor efficiency**: Use the analyze command to ensure optimal worker distribution
4. **Be patient**: Target preparation can take several minutes
5. **Focus on high-value targets**: Some servers are worth much more than others

## Troubleshooting Steps

If you're still not making money after using the debug tools:

1. Run `run debug-runner.js fix`
2. Wait 2-3 minutes for system to stabilize
3. Run `run debug-runner.js monitor` to watch for earnings
4. If still no earnings, run `run debug-runner.js all` for complete analysis
5. Check that you have root access to profitable targets
6. Ensure your hacking level is sufficient for good targets

The debug system will guide you through identifying and fixing the specific issues preventing money generation in your setup.
