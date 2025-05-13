# Faction Milestones System

This module provides automated tracking and completion of faction progression milestones in Bitburner.

## Features

- Track progress through faction milestones
- Automatically gain root access on faction servers
- Install backdoors on faction servers
- Join factions when eligible
- Purchase and install faction augmentations
- Intelligent next-step recommendations

## Usage

```
run /core/faction-milestones/index.js [options]
```

### Options

- `--automate`: Try to complete the next milestone automatically
- `--buy`: Purchase available augmentations from factions
- `--verbose`: Show detailed information
- `--help`: Show help information

## Architecture

The system is divided into modular components:

- `index.js`: Main entry point and UI controller
- `faction-data.js`: Centralized data for faction servers and progression paths
- `faction-utils.js`: Utility functions for checking faction status
- `system-actions.js`: Core actions like installing backdoors and joining factions
- `milestone-tracker.js`: Track milestones and recommend next steps

## Faction Progression Path

1. CyberSec (CSEC) - Required Hacking: 50
2. NiteSec (avmnite-02h) - Required Hacking: 202
3. The Black Hand (I.I.I.I) - Required Hacking: 300
4. BitRunners (run4theh111z) - Required Hacking: 505

## Dependencies

- Requires Singularity API functions (Source File 4)
- Uses connect.js from the helper folder for server navigation
