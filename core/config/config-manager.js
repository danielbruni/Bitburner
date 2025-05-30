/**
 * config-manager.js - Interactive configuration management utility
 *
 * Provides tools for viewing, editing, and validating system configuration.
 * Run this script to manage your Bitburner system configuration.
 */

import {
  getConfig,
  setConfig,
  getCategoryConfig,
  validateConfig,
  getConfigSummary,
  loadConfigFromFile,
  saveConfigToFile,
} from "./system-config.js";

/** @param {NS} ns */
export async function main(ns) {
  const args = ns.flags([
    ["help", false],
    ["summary", false],
    ["validate", false],
    ["get", ""],
    ["set", ""],
    ["value", ""],
    ["category", ""],
    ["save", ""],
    ["load", ""],
    ["interactive", false],
    ["backup", false],
    ["restore", ""],
  ]);

  ns.disableLog("ALL");

  if (args.help) {
    showHelp(ns);
    return;
  }

  if (args.summary) {
    ns.tprint(getConfigSummary());
    return;
  }

  if (args.validate) {
    const errors = validateConfig();
    if (errors.length === 0) {
      ns.tprint(
        "✅ Configuration validation passed! All values are within acceptable ranges."
      );
    } else {
      ns.tprint("❌ Configuration validation failed:");
      errors.forEach((error) => ns.tprint(`  - ${error}`));
    }
    return;
  }

  if (args.get) {
    const value = getConfig(args.get);
    if (value !== null) {
      ns.tprint(`${args.get} = ${JSON.stringify(value, null, 2)}`);
    } else {
      ns.tprint(`❌ Configuration path '${args.get}' not found`);
    }
    return;
  }

  if (args.set && args.value !== "") {
    let newValue;
    try {
      // Try to parse as JSON first (for numbers, booleans, objects)
      newValue = JSON.parse(args.value);
    } catch {
      // If JSON parsing fails, treat as string
      newValue = args.value;
    }

    if (setConfig(args.set, newValue)) {
      ns.tprint(`✅ Set ${args.set} = ${JSON.stringify(newValue)}`);

      // Validate after setting
      const errors = validateConfig();
      if (errors.length > 0) {
        ns.tprint("⚠️ Warning: New value may be outside acceptable range:");
        errors.forEach((error) => ns.tprint(`  - ${error}`));
      }
    } else {
      ns.tprint(`❌ Failed to set configuration path '${args.set}'`);
    }
    return;
  }

  if (args.category) {
    const categoryConfig = getCategoryConfig(args.category);
    if (Object.keys(categoryConfig).length > 0) {
      ns.tprint(`=== ${args.category.toUpperCase()} CONFIGURATION ===`);
      ns.tprint(JSON.stringify(categoryConfig, null, 2));
    } else {
      ns.tprint(`❌ Configuration category '${args.category}' not found`);
    }
    return;
  }

  if (args.save) {
    if (saveConfigToFile(ns, args.save)) {
      ns.tprint(`✅ Configuration saved to ${args.save}`);
    } else {
      ns.tprint(`❌ Failed to save configuration to ${args.save}`);
    }
    return;
  }

  if (args.load) {
    if (loadConfigFromFile(ns, args.load)) {
      ns.tprint(`✅ Configuration loaded from ${args.load}`);
    } else {
      ns.tprint(`❌ Failed to load configuration from ${args.load}`);
    }
    return;
  }

  if (args.backup) {
    const backupFile = `/config/backup-${Date.now()}.json`;
    if (saveConfigToFile(ns, backupFile)) {
      ns.tprint(`✅ Configuration backed up to ${backupFile}`);
    } else {
      ns.tprint(`❌ Failed to create backup`);
    }
    return;
  }

  if (args.restore) {
    if (loadConfigFromFile(ns, args.restore)) {
      ns.tprint(`✅ Configuration restored from ${args.restore}`);

      // Validate after restoring
      const errors = validateConfig();
      if (errors.length > 0) {
        ns.tprint("⚠️ Warning: Restored configuration has validation errors:");
        errors.forEach((error) => ns.tprint(`  - ${error}`));
      }
    } else {
      ns.tprint(`❌ Failed to restore configuration from ${args.restore}`);
    }
    return;
  }

  if (args.interactive) {
    await interactiveMode(ns);
    return;
  }

  // Default behavior - show summary
  ns.tprint(getConfigSummary());
}

/**
 * Show help information
 */
function showHelp(ns) {
  ns.tprint("=== CONFIGURATION MANAGER HELP ===");
  ns.tprint("");
  ns.tprint("Usage: run config-manager.js [options]");
  ns.tprint("");
  ns.tprint("Options:");
  ns.tprint("  --help             Show this help message");
  ns.tprint("  --summary          Show configuration summary");
  ns.tprint("  --validate         Validate current configuration");
  ns.tprint("  --get PATH         Get configuration value at PATH");
  ns.tprint("  --set PATH         Set configuration value at PATH");
  ns.tprint("  --value VALUE      Value to set (use with --set)");
  ns.tprint("  --category CAT     Show all values in category CAT");
  ns.tprint("  --save FILE        Save configuration to FILE");
  ns.tprint("  --load FILE        Load configuration from FILE");
  ns.tprint("  --backup           Create backup of current configuration");
  ns.tprint("  --restore FILE     Restore configuration from backup FILE");
  ns.tprint("  --interactive      Enter interactive mode");
  ns.tprint("");
  ns.tprint("Examples:");
  ns.tprint("  run config-manager.js --summary");
  ns.tprint("  run config-manager.js --get resources.homeReservedRam");
  ns.tprint(
    "  run config-manager.js --set resources.homeReservedRam --value 30"
  );
  ns.tprint("  run config-manager.js --category resources");
  ns.tprint("  run config-manager.js --save /config/my-config.json");
  ns.tprint("  run config-manager.js --backup");
  ns.tprint("");
  ns.tprint("Configuration Categories:");
  ns.tprint("  processes, resources, serverCategories, workers,");
  ns.tprint("  debug, optimization, factions, serverManagement,");
  ns.tprint("  paths, limits");
}

/**
 * Interactive configuration mode
 */
async function interactiveMode(ns) {
  ns.tprint("=== INTERACTIVE CONFIGURATION MODE ===");
  ns.tprint("Note: Interactive mode is limited in this environment.");
  ns.tprint("Use command-line flags for full functionality.");
  ns.tprint("");

  // Show current critical settings
  ns.tprint("Current Critical Settings:");
  ns.tprint(`  Home Reserved RAM: ${getConfig("resources.homeReservedRam")}GB`);
  ns.tprint(
    `  Money Threshold: ${getConfig("resources.moneyThreshold") * 100}%`
  );
  ns.tprint(
    `  Security Threshold: +${getConfig("resources.securityThreshold")}`
  );
  ns.tprint(
    `  Health Check Interval: ${getConfig("processes.healthCheckInterval")}ms`
  );
  ns.tprint(`  Log Level: ${getConfig("debug.logLevel")}`);
  ns.tprint("");

  // Validation
  const errors = validateConfig();
  if (errors.length === 0) {
    ns.tprint("✅ All settings are valid");
  } else {
    ns.tprint("⚠️ Configuration issues found:");
    errors.forEach((error) => ns.tprint(`  - ${error}`));
  }

  ns.tprint("");
  ns.tprint("Use command-line flags to modify settings:");
  ns.tprint(
    "Example: run config-manager.js --set resources.homeReservedRam --value 25"
  );
}

/**
 * Get commonly used configuration presets
 */
export function getConfigPresets() {
  return {
    conservative: {
      resources: {
        homeReservedRam: 50,
        moneyThreshold: 0.9,
        securityThreshold: 2,
      },
      processes: {
        healthCheckInterval: 10000,
        fileCopyInterval: 600000,
      },
      optimization: {
        enabled: false,
      },
    },

    aggressive: {
      resources: {
        homeReservedRam: 10,
        moneyThreshold: 0.5,
        securityThreshold: 10,
      },
      processes: {
        healthCheckInterval: 3000,
        fileCopyInterval: 120000,
      },
      optimization: {
        enabled: true,
      },
    },

    balanced: {
      resources: {
        homeReservedRam: 20,
        moneyThreshold: 0.75,
        securityThreshold: 5,
      },
      processes: {
        healthCheckInterval: 5000,
        fileCopyInterval: 300000,
      },
      optimization: {
        enabled: true,
      },
    },
  };
}

/**
 * Apply a configuration preset
 * @param {string} presetName - Name of preset to apply
 * @returns {boolean} True if preset was applied successfully
 */
export function applyConfigPreset(presetName) {
  const presets = getConfigPresets();
  const preset = presets[presetName];

  if (!preset) {
    return false;
  }

  // Apply each configuration value in the preset
  function applyPresetSection(section, path = "") {
    for (const [key, value] of Object.entries(section)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        applyPresetSection(value, fullPath);
      } else {
        setConfig(fullPath, value);
      }
    }
  }

  applyPresetSection(preset);
  return true;
}
