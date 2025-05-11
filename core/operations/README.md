# Core Operation Scripts

This directory contains the minimal scripts that perform the fundamental hacking operations in Bitburner.

## Scripts

- `hack.js` - Simple script that performs a hack operation on a target server
- `grow.js` - Simple script that performs a grow operation on a target server
- `weaken.js` - Simple script that performs a weaken operation on a target server

## Usage

These scripts are automatically copied to all available servers by the main script and are primarily used by the worker scripts rather than being run directly.

Each script takes a single argument: the name of the target server.

Example:

```
run hack.js n00dles
```
