/**
 * index.js - Automated Faction Milestone Progression System
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

// Import modular components
import { FACTION_SERVERS, FACTION_PROGRESSION } from "./faction-data.js";
import {
  checkBackdoorInstalled,
  getAugmentationStatus,
} from "./faction-utils.js";
import {
  gainRootAccess,
  installBackdoor,
  joinFaction,
  manageAugmentations,
} from "./system-actions.js";
import {
  findNextMilestone,
  getAllMilestoneStatus,
  formatMilestoneStatus,
} from "./milestone-tracker.js";

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

  // Process command-line arguments
  ns.disableLog("ALL");
  const args = ns.flags([
    ["automate", false],
    ["buy", false],
    ["verbose", false],
    ["help", false],
  ]);

  // Show help information
  if (args.help) {
    ns.tprint(`Faction Milestones - Automate faction progression
Usage: run /core/faction-milestones/index.js [options]

Options:
  --automate     Try to complete the next milestone automatically
  --buy          Purchase available augmentations from factions
  --verbose      Show detailed information
  --help         Show this help message
`);
    return;
  }

  // Show status and exit if no action flags
  if (!args.automate && !args.buy) {
    await printMilestoneProgress(ns, args.verbose);
    return;
  }

  // Buy augmentations mode
  if (args.buy) {
    ns.tprint("=== Purchasing Available Augmentations ===");
    let totalPurchased = 0;

    for (const serverName of FACTION_PROGRESSION) {
      const serverInfo = FACTION_SERVERS[serverName];
      const faction = serverInfo.faction;

      if (ns.getPlayer().factions.includes(faction)) {
        ns.tprint(`\nChecking ${faction} augmentations...`);
        const result = await manageAugmentations(ns, faction, true);
        totalPurchased += result.purchased;
      }
    }

    ns.tprint(`\nTotal augmentations purchased: ${totalPurchased}`);
    if (totalPurchased > 0) {
      ns.tprint(`⚠️ Remember to install augmentations to activate them!`);
    }
    return;
  }

  // Automate next milestone
  if (args.automate) {
    await automateNextMilestone(ns);
  }
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

  // Get status for all milestones
  const milestones = await getAllMilestoneStatus(ns);

  // Display each milestone status
  for (const status of milestones) {
    ns.tprint(formatMilestoneStatus(ns, status, verbose));
  }

  // Suggest next milestone
  ns.tprint("\n=== Suggested Next Steps ===");
  const nextMilestone = await findNextMilestone(ns);
  ns.tprint(nextMilestone.message);
  if (nextMilestone.actionPossible) {
    ns.tprint(
      `Run 'run /core/faction-milestones/index.js --automate' to try to complete this step automatically.`
    );
  }
}

/**
 * Automate the next milestone in the progression
 * @param {NS} ns - NetScript API
 */
async function automateNextMilestone(ns) {
  // Find the next milestone to tackle
  const nextMilestone = await findNextMilestone(ns);
  ns.tprint(`Next milestone: ${nextMilestone.message}`);

  // Check if it's something we can automate
  if (!nextMilestone.actionPossible) {
    ns.tprint(
      "❌ This milestone cannot be automated yet. Manual player action required."
    );
    return;
  }

  // Attempt to automate based on the action type
  switch (nextMilestone.action) {
    case "root":
      await gainRootAccess(ns, nextMilestone.server);
      break;

    case "backdoor":
      await installBackdoor(ns, nextMilestone.server);
      break;

    case "join":
      await joinFaction(ns, nextMilestone.faction);
      break;

    case "purchase":
      await manageAugmentations(ns, nextMilestone.faction, true);
      break;

    default:
      ns.tprint("⚠️ Unknown action required. Unable to automate.");
      break;
  }

  // Show updated milestone status after taking action
  await printMilestoneProgress(ns, false);
}
