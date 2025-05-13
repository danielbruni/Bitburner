/**
 * system-actions.js - Core system actions for milestones progression
 *
 * This module contains core actions for completing milestones,
 * including installing backdoors, joining factions, and purchasing augmentations.
 */

import { findPath } from "/core/helper/connect.js";
import { FACTION_SERVERS, getServerByFaction } from "./faction-data.js";
import {
  checkBackdoorInstalled,
  getAugmentationStatus,
} from "./faction-utils.js";

/**
 * Gain root access on a server
 * @param {NS} ns - NetScript API
 * @param {string} target - Target server
 * @returns {boolean} - Whether root access was successfully gained
 */
export async function gainRootAccess(ns, target) {
  ns.tprint(`🔓 Attempting to gain root access on ${target}...`);

  // Check if we already have root access
  if (ns.hasRootAccess(target)) {
    ns.tprint(`Already have root access on ${target}.`);
    return true;
  }

  // Check hacking level
  const requiredHackingLevel = ns.getServerRequiredHackingLevel(target);
  const hackingLevel = ns.getHackingLevel();
  if (hackingLevel < requiredHackingLevel) {
    ns.tprint(
      `❌ Insufficient hacking level. Need ${requiredHackingLevel}, you have ${hackingLevel}.`
    );
    return false;
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
    return false;
  }

  // Nuke the server
  try {
    ns.nuke(target);
    ns.tprint(`✅ Successfully gained root access to ${target}!`);
    return true;
  } catch (e) {
    ns.tprint(`❌ Failed to nuke ${target}: ${e}`);
    return false;
  }
}

/**
 * Install backdoor on target server
 * @param {NS} ns - NetScript API
 * @param {string} target - Target server
 * @returns {boolean} - Whether backdoor was successfully installed
 */
export async function installBackdoor(ns, target) {
  // First check if we have root access
  if (!ns.hasRootAccess(target)) {
    ns.tprint(`❌ You need root access on ${target} first.`);
    return false;
  }

  // Check if backdoor is already installed
  if (checkBackdoorInstalled(ns, target)) {
    ns.tprint(`Backdoor already installed on ${target}.`);
    return true;
  }

  // Check if we have sufficient hacking skill
  const serverInfo = FACTION_SERVERS[target];
  const hackingLevel = ns.getHackingLevel();
  if (hackingLevel < serverInfo.requiredHackingLevel) {
    ns.tprint(
      `❌ Insufficient hacking level. Need ${serverInfo.requiredHackingLevel}, you have ${hackingLevel}.`
    );
    return false;
  }

  // Connect to target server (using findPath from connect.js)
  const path = findPath(ns, "home", target);
  if (!path) {
    ns.tprint(`❌ Could not find path to server: ${target}`);
    return false;
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

  // Check if we received an invitation
  if (ns.singularity.checkFactionInvitations().includes(serverInfo.faction)) {
    await joinFaction(ns, serverInfo.faction);
  }

  return checkBackdoorInstalled(ns, target);
}

/**
 * Join specified faction
 * @param {NS} ns - NetScript API
 * @param {string} faction - Faction name
 * @returns {boolean} - Whether successfully joined the faction
 */
export async function joinFaction(ns, faction) {
  // Check if we're already in the faction
  if (ns.getPlayer().factions.includes(faction)) {
    ns.tprint(`You are already a member of ${faction}.`);
    return true;
  }

  // Check if we have an invitation
  const invitations = ns.singularity.checkFactionInvitations();
  if (!invitations.includes(faction)) {
    ns.tprint(`❌ No invitation from ${faction} available.`);

    // Check if we need to backdoor a server first
    const serverInfo = getServerByFaction(faction);
    if (serverInfo) {
      const serverName = serverInfo.serverName;
      if (
        ns.hasRootAccess(serverName) &&
        !checkBackdoorInstalled(ns, serverName)
      ) {
        ns.tprint(`💡 Hint: Try installing a backdoor on ${serverName} first.`);
      }
    }
    return false;
  }

  // Join the faction
  if (ns.singularity.joinFaction(faction)) {
    ns.tprint(`✅ Successfully joined ${faction}!`);
    return true;
  } else {
    ns.tprint(`❌ Failed to join ${faction} for unknown reasons.`);
    return false;
  }
}

/**
 * Display and optionally purchase augmentations for a faction
 * @param {NS} ns - NetScript API
 * @param {string} faction - Faction name
 * @param {boolean} shouldBuy - Whether to buy available augmentations
 * @returns {Object} - Object with results of the operation
 */
export async function manageAugmentations(ns, faction, shouldBuy = false) {
  // Check if we're in the faction
  if (!ns.getPlayer().factions.includes(faction)) {
    ns.tprint(`❌ You are not a member of ${faction}.`);
    return { success: false, purchased: 0 };
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
  let purchaseCount = 0;
  if (shouldBuy && purchasableAugs.length > 0) {
    ns.tprint("\nPurchasing available augmentations...");

    // Sort augmentations by price (descending) to optimize purchases
    purchasableAugs.sort(
      (a, b) =>
        ns.singularity.getAugmentationPrice(b) -
        ns.singularity.getAugmentationPrice(a)
    );

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

  return {
    success: true,
    purchased: purchaseCount,
    available: availableCount,
    affordable: affordableCount,
    total: augmentations.length,
    owned: ownedAugs.filter((aug) => augmentations.includes(aug)).length,
  };
}
