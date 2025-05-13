/**
 * milestone-tracker.js - Track and identify next milestones
 * 
 * This module handles tracking milestone progress and identifying
 * next steps in the progression path.
 */

import { FACTION_SERVERS, FACTION_PROGRESSION } from "./faction-data.js";
import { 
  checkBackdoorInstalled, 
  getAugmentationStatus, 
  countAvailablePorts,
  getServerAccessInfo
} from "./faction-utils.js";

/**
 * Get milestone status for a specific server
 * @param {NS} ns - NetScript API
 * @param {string} serverName - Server name
 * @returns {Object} - Milestone status object
 */
export async function getServerMilestoneStatus(ns, serverName) {
  const serverInfo = FACTION_SERVERS[serverName];
  if (!serverInfo) {
    return null;
  }

  const serverAccess = getServerAccessInfo(ns, serverName);
  const hasRootAccess = serverAccess.hasRootAccess;
  const hasBackdoor = checkBackdoorInstalled(ns, serverName);
  const joinedFaction = ns.getPlayer().factions.includes(serverInfo.faction);
  const factionRep = joinedFaction ? ns.singularity.getFactionRep(serverInfo.faction) : 0;
  const augStatus = await getAugmentationStatus(ns, serverInfo.faction);

  return {
    serverName,
    serverInfo,
    hasRootAccess,
    hasBackdoor,
    joinedFaction,
    factionRep,
    augStatus,
    accessInfo: serverAccess,
    completed: hasRootAccess && hasBackdoor && joinedFaction && (augStatus.owned === augStatus.total)
  };
}

/**
 * Get milestone status for all faction servers
 * @param {NS} ns - NetScript API
 * @returns {Array} - Array of milestone status objects
 */
export async function getAllMilestoneStatus(ns) {
  const statuses = [];
  
  for (const serverName of FACTION_PROGRESSION) {
    const status = await getServerMilestoneStatus(ns, serverName);
    statuses.push(status);
  }
  
  return statuses;
}

/**
 * Find the next milestone to work on
 * @param {NS} ns - NetScript API
 * @returns {Object} - Object with milestone info and whether action is possible
 */
export async function findNextMilestone(ns) {
  const hackingLevel = ns.getHackingLevel();
  
  // Check each faction server in order
  for (const serverName of FACTION_PROGRESSION) {
    const serverInfo = FACTION_SERVERS[serverName];
    
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
 * Format milestone status for display
 * @param {NS} ns - NetScript API
 * @param {Object} status - Milestone status object
 * @param {boolean} verbose - Whether to show detailed information
 * @returns {string} - Formatted status string
 */
export function formatMilestoneStatus(ns, status, verbose = false) {
  if (!status) return "";
  
  const { serverName, serverInfo, hasRootAccess, hasBackdoor, joinedFaction, factionRep, augStatus } = status;
  
  let output = `\n${serverInfo.faction} (${serverName}) - Required Hacking: ${serverInfo.requiredHackingLevel}\n`;
  output += `${hasRootAccess ? "✅" : "❌"} Root Access | ${hasBackdoor ? "✅" : "❌"} Backdoor | ${joinedFaction ? "✅" : "❌"} Joined Faction\n`;
  
  if (verbose) {
    if (joinedFaction) {
      output += `  Reputation: ${factionRep.toLocaleString()}\n`;
    }
    output += `  Augmentations: ${augStatus.owned}/${augStatus.total} installed (${augStatus.available} available)\n`;
  }
  
  return output;
}
