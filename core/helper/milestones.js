/**
 * milestones.js - Automate progression milestones in Bitburner
 *
 * This script helps track and complete faction progression milestones:
 * - Gain root access on CSEC
 * - Install backdoor on CSEC
 * - Join CyberSec faction
 * - Install all CyberSec augmentations
 * - Join NiteSec faction
 * - Install all NiteSec augmentations
 * - Join The Black Hand faction
 * - Install all The Black Hand augmentations
 * - Join BitRunners faction
 * - Install all BitRunners augmentations
 */

import { findPath } from "/core/helper/connect.js";

/** Server details for faction-related milestone targets */
const FACTION_SERVERS = {
  CSEC: {
    hostname: "CSEC",
    requiredHackingLevel: 50,
    faction: "CyberSec",
    factionServer: true,
  },
  "avmnite-02h": {
    hostname: "avmnite-02h",
    requiredHackingLevel: 202,
    faction: "NiteSec",
    factionServer: true,
  },
  "I.I.I.I": {
    hostname: "I.I.I.I",
    requiredHackingLevel: 300,
    faction: "The Black Hand",
    factionServer: true,
  },
  run4theh111z: {
    hostname: "run4theh111z",
    requiredHackingLevel: 505,
    faction: "BitRunners",
    factionServer: true,
  },
};

/** @param {NS} ns */
export async function main(ns) {
  // Make sure we have access to Singularity functions
  if (!ns.singularity) {
    ns.tprint(
      "❌ ERROR: Singularity API functions required (installed source file 4)"
    );
    ns.tprint(
      "This script requires access to the Singularity API functions to work properly."
    );
    return;
  }

  // Parse command-line arguments
  const argParser = ns.flags([
    ["help", false],
    ["info", false],
    ["automate", false],
    ["verbose", false],
    ["target", ""],
    ["backdoor", false],
    ["join", false],
    ["augs", false],
    ["buy", false],
  ]);

  if (argParser.help) {
    printHelp(ns);
    return;
  }

  if (argParser.info) {
    await printMilestoneProgress(ns, argParser.verbose);
    return;
  }

  if (argParser.target) {
    const target = argParser.target;

    if (!FACTION_SERVERS[target]) {
      ns.tprint(`❌ Invalid target: ${target}`);
      ns.tprint("Valid targets: CSEC, avmnite-02h, I.I.I.I, run4theh111z");
      return;
    }

    if (argParser.backdoor) {
      await installBackdoor(ns, target);
      return;
    }

    if (argParser.join) {
      await joinFaction(ns, FACTION_SERVERS[target].faction);
      return;
    }

    if (argParser.augs) {
      await displayAugmentations(
        ns,
        FACTION_SERVERS[target].faction,
        argParser.buy
      );
      return;
    }
  }

  if (argParser.automate) {
    await automateProgression(ns, argParser.verbose);
    return;
  }

  // Default: print milestone progress
  await printMilestoneProgress(ns, false);
}

/**
 * Print command help
 * @param {NS} ns - NetScript API
 */
function printHelp(ns) {
  ns.tprint("=== Milestones Script Help ===");
  ns.tprint(
    "This script helps automate progression through key faction milestones."
  );
  ns.tprint("");
  ns.tprint("Usage:");
  ns.tprint("run milestones.js [options]");
  ns.tprint("");
  ns.tprint("Options:");
  ns.tprint("  --help        : Show this help information");
  ns.tprint("  --info        : Display current milestone progress");
  ns.tprint("  --verbose     : Show more detailed information");
  ns.tprint("  --automate    : Try to complete next available milestone");
  ns.tprint(
    "  --target X    : Specify a target (CSEC, avmnite-02h, I.I.I.I, run4theh111z)"
  );
  ns.tprint("  --backdoor    : Install backdoor on target (requires --target)");
  ns.tprint(
    "  --join        : Join faction associated with target (requires --target)"
  );
  ns.tprint(
    "  --augs        : List available augmentations for target faction (requires --target)"
  );
  ns.tprint(
    "  --buy         : Buy all affordable augmentations (use with --augs)"
  );
}

/**
 * Print current milestone progress
 * @param {NS} ns - NetScript API
 * @param {boolean} verbose - Whether to show detailed information
 */
async function printMilestoneProgress(ns, verbose = false) {
  ns.tprint("=== Faction Progression Milestones ===");

  // Player hacking level
  const hackingLevel = ns.getHackingLevel();
  ns.tprint(`Current Hacking Level: ${hackingLevel}`);

  // Server access and status
  for (const [serverName, serverInfo] of Object.entries(FACTION_SERVERS)) {
    const hasRootAccess = ns.hasRootAccess(serverName);
    const hasBackdoor = checkBackdoorInstalled(ns, serverName);
    const joinedFaction = ns.getPlayer().factions.includes(serverInfo.faction);
    const factionRep = joinedFaction
      ? ns.singularity.getFactionRep(serverInfo.faction)
      : 0;
    const augStatus = await getAugmentationStatus(ns, serverInfo.faction);

    let serverStatus = `${hasRootAccess ? "✅" : "❌"} Root Access | ${
      hasBackdoor ? "✅" : "❌"
    } Backdoor | ${joinedFaction ? "✅" : "❌"} Joined Faction`;

    ns.tprint(
      `\n${serverInfo.faction} (${serverName}) - Required Hacking: ${serverInfo.requiredHackingLevel}`
    );
    ns.tprint(serverStatus);

    if (verbose) {
      if (joinedFaction) {
        ns.tprint(`  Reputation: ${factionRep.toLocaleString()}`);
      }
      ns.tprint(
        `  Augmentations: ${augStatus.owned}/${augStatus.total} installed (${augStatus.available} available)`
      );
    }
  }
  // Suggest next milestone
  ns.tprint("\n=== Suggested Next Steps ===");
  const nextMilestone = await findNextMilestone(ns);
  ns.tprint(nextMilestone.message);
  if (nextMilestone.actionPossible) {
    ns.tprint(
      `Run 'run milestones.js --automate' to try to complete this step automatically.`
    );
  }
}

/**
 * Check if backdoor is installed on a server (using indirect methods)
 * @param {NS} ns - NetScript API
 * @param {string} serverName - Server to check
 * @returns {boolean} - Whether backdoor is installed
 */
function checkBackdoorInstalled(ns, serverName) {
  // The game doesn't directly expose backdoor status through the API
  // We can check if the player has joined the corresponding faction as an indicator
  const serverInfo = FACTION_SERVERS[serverName];
  if (!serverInfo) return false;

  // If we're in the faction, we likely backdoored it
  if (ns.getPlayer().factions.includes(serverInfo.faction)) {
    return true;
  }

  // If we have root access and enough hacking skill but aren't in the faction,
  // we probably haven't backdoored it yet
  return false;
}

/**
 * Get augmentation status for a faction
 * @param {NS} ns - NetScript API
 * @param {string} factionName - Faction name
 * @returns {Object} - Object with total, owned, and available augmentation counts
 */
async function getAugmentationStatus(ns, factionName) {
  // Initialize counters
  let total = 0;
  let owned = 0;
  let available = 0;

  // Check if we're in the faction
  const inFaction = ns.getPlayer().factions.includes(factionName);
  if (!inFaction) {
    return { total: 0, owned: 0, available: 0 };
  }

  // Get all augmentations for faction
  const augmentations = ns.singularity.getAugmentationsFromFaction(factionName);
  total = augmentations.length;

  // Check which ones we own or can purchase
  for (const aug of augmentations) {
    if (ns.singularity.getOwnedAugmentations(true).includes(aug)) {
      owned++;
    } else if (
      ns.singularity.getAugmentationRepReq(aug) <=
      ns.singularity.getFactionRep(factionName)
    ) {
      available++;
    }
  }

  return { total, owned, available };
}

/**
 * Find the next milestone to work on
 * @param {NS} ns - NetScript API
 * @returns {Object} - Object with milestone info and whether action is possible
 */
async function findNextMilestone(ns) {
  const hackingLevel = ns.getHackingLevel();

  // Check each faction server in order
  for (const [serverName, serverInfo] of Object.entries(FACTION_SERVERS)) {
    // Check if we have root access
    if (!ns.hasRootAccess(serverName)) {
      const canHack = hackingLevel >= serverInfo.requiredHackingLevel;
      const portsNeeded = ns.getServerNumPortsRequired(serverName);
      const portsAvailable = countAvailablePorts(ns);

      if (canHack && portsAvailable >= portsNeeded) {
        return {
          message: `Gain root access on ${serverName} (${serverInfo.faction})`,
          server: serverName,
          action: "root",
          actionPossible: true,
        };
      } else {
        if (!canHack) {
          return {
            message: `Increase hacking level to ${serverInfo.requiredHackingLevel} for ${serverName} (currently ${hackingLevel})`,
            server: serverName,
            action: "level",
            actionPossible: false,
          };
        } else {
          return {
            message: `Acquire more port opener programs for ${serverName} (need ${portsNeeded}, have ${portsAvailable})`,
            server: serverName,
            action: "ports",
            actionPossible: false,
          };
        }
      }
    }

    // Check if we've installed backdoor
    if (!checkBackdoorInstalled(ns, serverName)) {
      return {
        message: `Install backdoor on ${serverName} (${serverInfo.faction})`,
        server: serverName,
        action: "backdoor",
        actionPossible: true,
      };
    }

    // Check if we've joined the faction
    if (!ns.getPlayer().factions.includes(serverInfo.faction)) {
      return {
        message: `Join the ${serverInfo.faction} faction`,
        server: serverName,
        faction: serverInfo.faction,
        action: "join",
        actionPossible: true,
      };
    }

    // Check if we've installed all augmentations
    const augStatus = await getAugmentationStatus(ns, serverInfo.faction);
    if (augStatus.owned < augStatus.total) {
      if (augStatus.available > 0) {
        return {
          message: `Purchase available augmentations from ${serverInfo.faction} (${augStatus.available} available)`,
          faction: serverInfo.faction,
          action: "purchase",
          actionPossible: true,
        };
      } else {
        return {
          message: `Increase reputation with ${serverInfo.faction} to unlock more augmentations`,
          faction: serverInfo.faction,
          action: "reputation",
          actionPossible: false,
        };
      }
    }
  }

  // If all milestones completed
  return {
    message: "All faction milestones completed! Congratulations!",
    action: "completed",
    actionPossible: false,
  };
}

/**
 * Count available port opener programs
 * @param {NS} ns - NetScript API
 * @returns {number} - Number of port openers available
 */
function countAvailablePorts(ns) {
  let count = 0;
  const portOpeners = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
  ];

  for (const program of portOpeners) {
    if (ns.fileExists(program, "home")) {
      count++;
    }
  }

  return count;
}

/**
 * Install backdoor on target server
 * @param {NS} ns - NetScript API
 * @param {string} target - Target server
 */
async function installBackdoor(ns, target) {
  // First check if we have root access
  if (!ns.hasRootAccess(target)) {
    ns.tprint(`❌ You need root access on ${target} first.`);
    return;
  }

  // Check if we have sufficient hacking skill
  const serverInfo = FACTION_SERVERS[target];
  const hackingLevel = ns.getHackingLevel();
  if (hackingLevel < serverInfo.requiredHackingLevel) {
    ns.tprint(
      `❌ Insufficient hacking level. Need ${serverInfo.requiredHackingLevel}, you have ${hackingLevel}.`
    );
    return;
  }

  // Connect to target server (using findPath from connect.js)
  const path = findPath(ns, "home", target);
  if (!path) {
    ns.tprint(`❌ Could not find path to server: ${target}`);
    return;
  }

  ns.tprint(`🔗 Connecting to ${target}...`);

  // Connect through terminal
  let connectionCommands = "";
  for (const server of path) {
    connectionCommands += `connect ${server}; `;
  }
  const terminalInput = document.getElementById("terminal-input");
  terminalInput.value = connectionCommands;
  const handler = Object.keys(terminalInput)[1];
  terminalInput[handler].onChange({ target: terminalInput });
  terminalInput[handler].onKeyDown({
    key: "Enter",
    preventDefault: () => null,
  });

  // Give time for connection to complete
  await ns.sleep(500);

  // Install backdoor
  ns.tprint(`🔓 Installing backdoor on ${target}...`);
  terminalInput.value = "backdoor";
  terminalInput[handler].onChange({ target: terminalInput });
  terminalInput[handler].onKeyDown({
    key: "Enter",
    preventDefault: () => null,
  });

  // Backdoor takes time to install
  const backdoorTime = ns.getHackTime(target) * 2.5; // Estimated time
  ns.tprint(
    `⏳ Backdoor installation in progress (this will take ~${Math.ceil(
      backdoorTime / 1000
    )} seconds)...`
  );

  // Automatically join faction if we get an invitation after backdoor completes
  await ns.sleep(backdoorTime + 1000);

  // Return to home server
  terminalInput.value = "home";
  terminalInput[handler].onChange({ target: terminalInput });
  terminalInput[handler].onKeyDown({
    key: "Enter",
    preventDefault: () => null,
  });

  if (ns.singularity.checkFactionInvitations().includes(serverInfo.faction)) {
    await joinFaction(ns, serverInfo.faction);
  }
}

/**
 * Join specified faction
 * @param {NS} ns - NetScript API
 * @param {string} faction - Faction name
 */
async function joinFaction(ns, faction) {
  // Check if we're already in the faction
  if (ns.getPlayer().factions.includes(faction)) {
    ns.tprint(`You are already a member of ${faction}.`);
    return;
  }

  // Check if we have an invitation
  const invitations = ns.singularity.checkFactionInvitations();
  if (!invitations.includes(faction)) {
    ns.tprint(`❌ No invitation from ${faction} available.`);

    // Check if we need to backdoor a server first
    for (const [serverName, serverInfo] of Object.entries(FACTION_SERVERS)) {
      if (serverInfo.faction === faction) {
        if (
          ns.hasRootAccess(serverName) &&
          !checkBackdoorInstalled(ns, serverName)
        ) {
          ns.tprint(
            `💡 Hint: Try installing a backdoor on ${serverName} first.`
          );
        }
        break;
      }
    }
    return;
  }

  // Join the faction
  if (ns.singularity.joinFaction(faction)) {
    ns.tprint(`✅ Successfully joined ${faction}!`);
  } else {
    ns.tprint(`❌ Failed to join ${faction} for unknown reasons.`);
  }
}

/**
 * Display and optionally purchase augmentations for a faction
 * @param {NS} ns - NetScript API
 * @param {string} faction - Faction name
 * @param {boolean} shouldBuy - Whether to buy available augmentations
 */
async function displayAugmentations(ns, faction, shouldBuy = false) {
  // Check if we're in the faction
  if (!ns.getPlayer().factions.includes(faction)) {
    ns.tprint(`❌ You are not a member of ${faction}.`);
    return;
  }

  // Get available augmentations
  const augmentations = ns.singularity.getAugmentationsFromFaction(faction);
  const ownedAugs = ns.singularity.getOwnedAugmentations(true);
  const factionRep = ns.singularity.getFactionRep(faction);
  const playerMoney = ns.getPlayer().money;

  ns.tprint(`=== ${faction} Augmentations ===`);
  ns.tprint(`Current reputation: ${factionRep.toLocaleString()}`);
  ns.tprint(`Available money: $${playerMoney.toLocaleString()}`);
  ns.tprint("");

  let availableCount = 0;
  let affordableCount = 0;
  let purchasableAugs = [];

  // Display augmentations
  for (const aug of augmentations) {
    const owned = ownedAugs.includes(aug);
    const repReq = ns.singularity.getAugmentationRepReq(aug);
    const canBuy = repReq <= factionRep;
    const price = ns.singularity.getAugmentationPrice(aug);
    const affordable = price <= playerMoney;

    let status = owned
      ? "✅ OWNED"
      : canBuy
      ? affordable
        ? "💰 AVAILABLE"
        : "⚠️ NEED MONEY"
      : "⛔ NEED REP";

    ns.tprint(`${status} - ${aug}`);
    ns.tprint(
      `  Price: $${price.toLocaleString()}, Rep: ${repReq.toLocaleString()}`
    );

    if (!owned && canBuy) {
      availableCount++;
      if (affordable) {
        affordableCount++;
        purchasableAugs.push(aug);
      }
    }
  }

  ns.tprint(
    `\n${availableCount} augmentations available, ${affordableCount} affordable`
  );

  // Buy augmentations if requested
  if (shouldBuy && purchasableAugs.length > 0) {
    ns.tprint("\nPurchasing available augmentations...");

    // Sort augmentations by price (descending) to optimize purchases
    purchasableAugs.sort(
      (a, b) =>
        ns.singularity.getAugmentationPrice(b) -
        ns.singularity.getAugmentationPrice(a)
    );

    let purchaseCount = 0;
    for (const aug of purchasableAugs) {
      if (ns.singularity.purchaseAugmentation(faction, aug)) {
        ns.tprint(`✅ Purchased ${aug}`);
        purchaseCount++;
      } else {
        ns.tprint(`❌ Failed to purchase ${aug}`);
      }
    }

    ns.tprint(
      `\nPurchased ${purchaseCount}/${purchasableAugs.length} augmentations.`
    );
    if (purchaseCount > 0) {
      ns.tprint("\n⚠️ Remember to install augmentations to activate them!");
    }
  }
}

/**
 * Try to automate progression through milestones
 * @param {NS} ns - NetScript API
 * @param {boolean} verbose - Whether to show detailed information
 */
async function automateProgression(ns, verbose = false) {
  const nextMilestone = await findNextMilestone(ns);
  ns.tprint(`Next milestone: ${nextMilestone.message}`);

  if (!nextMilestone.actionPossible) {
    ns.tprint(
      "❌ This milestone cannot be automated yet. Manual player action required."
    );
    return;
  }

  switch (nextMilestone.action) {
    case "root":
      // Gain root access
      await gainRootAccess(ns, nextMilestone.server);
      break;

    case "backdoor":
      // Install backdoor
      await installBackdoor(ns, nextMilestone.server);
      break;

    case "join":
      // Join faction
      await joinFaction(ns, nextMilestone.faction);
      break;

    case "purchase":
      // Purchase augmentations
      await displayAugmentations(ns, nextMilestone.faction, true);
      break;

    default:
      ns.tprint("⚠️ Unknown action required. Unable to automate.");
      break;
  }
}

/**
 * Gain root access on a server
 * @param {NS} ns - NetScript API
 * @param {string} target - Target server
 */
async function gainRootAccess(ns, target) {
  ns.tprint(`🔓 Attempting to gain root access on ${target}...`);

  // Check if we already have root access
  if (ns.hasRootAccess(target)) {
    ns.tprint(`Already have root access on ${target}.`);
    return;
  }

  // Check hacking level
  const requiredHackingLevel = ns.getServerRequiredHackingLevel(target);
  const hackingLevel = ns.getHackingLevel();
  if (hackingLevel < requiredHackingLevel) {
    ns.tprint(
      `❌ Insufficient hacking level. Need ${requiredHackingLevel}, you have ${hackingLevel}.`
    );
    return;
  }

  // Check port requirements
  const portsRequired = ns.getServerNumPortsRequired(target);
  const portOpenerFunctions = [
    { name: "BruteSSH.exe", func: ns.brutessh },
    { name: "FTPCrack.exe", func: ns.ftpcrack },
    { name: "relaySMTP.exe", func: ns.relaysmtp },
    { name: "HTTPWorm.exe", func: ns.httpworm },
    { name: "SQLInject.exe", func: ns.sqlinject },
  ];

  let openedPorts = 0;
  // Open ports
  for (const portOpener of portOpenerFunctions) {
    if (ns.fileExists(portOpener.name, "home")) {
      try {
        portOpener.func(target);
        openedPorts++;
        ns.tprint(`✅ Opened port using ${portOpener.name}`);
      } catch (e) {
        // Port might already be open
      }
    }
  }

  if (openedPorts < portsRequired) {
    ns.tprint(
      `❌ Not enough ports opened. Need ${portsRequired}, opened ${openedPorts}.`
    );
    return;
  }

  // Nuke the server
  try {
    ns.nuke(target);
    ns.tprint(`✅ Successfully gained root access to ${target}!`);
  } catch (e) {
    ns.tprint(`❌ Failed to nuke ${target}: ${e}`);
  }
}
