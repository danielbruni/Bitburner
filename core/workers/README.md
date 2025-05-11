# Worker Scripts

This directory contains scripts that act as workers to coordinate and execute hacking operations.

## Scripts

- `worker.js` - Main worker script that dynamically handles hacking tasks, including specialized behavior for different server RAM sizes

## Usage

The worker script is launched by the resource manager and executes hack, grow, or weaken operations based on the current state and needs of target servers.

Worker Script Arguments:

1. Target server name
2. Action type ('hack', 'grow', or 'weaken')
3. Number of threads to use
4. JSON-encoded task information (optional)

Example:

```
run worker.js n00dles hack 5 '{"priority":0.8}'
```
