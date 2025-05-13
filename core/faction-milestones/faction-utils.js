/**
 * faction-utils.js - Utility functions for faction operations
 * 
 * This module contains utility functions for working with factions,
 * including status checking and augmentation management.
 */

import { FACTION_SERVERS, PORT_OPENERS } from "./faction-data.js";

/**
 * Count available port opener programs
 * @param {NS} ns - NetScript API
 * @returns {number} - Number of port openers available
 */
export function countAvailablePorts(ns) {
  return PORT_OPENERS.filter(program => ns.fileExists(program.name, "home")).length;
}

/**
 * Check if backdoor is installed on a server (using indirect methods)
 * @param {NS} ns - NetScript API
 * @param {string} serverName - Server to check
 * @returns {boolean} - Whether backdoor is installed
 */
export function checkBackdoorInstalled(ns, serverName) {
  const serverInfo = FACTION_SERVERS[serverName];
  if (!serverInfo) return false;
  
  // If we're in the faction, we likely backdoored it
  return ns.getPlayer().factions.includes(serverInfo.faction);
}

/**
 * Get augmentation status for a faction
 * @param {NS} ns - NetScript API
 * @param {string} factionName - Faction name
 * @returns {Object} - Object with total, owned, and available augmentation counts
 */
export async function getAugmentationStatus(ns, factionName) {
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
  const ownedAugs = ns.singularity.getOwnedAugmentations(true);
  const factionRep = ns.singularity.getFactionRep(factionName);
  
  for (const aug of augmentations) {
    if (ownedAugs.includes(aug)) {
      owned++;
    } else if (ns.singularity.getAugmentationRepReq(aug) <= factionRep) {
      available++;
    }
  }
  
  return { total, owned, available };
}

/**
 * Get detailed info about a server's accessibility
 * @param {NS} ns - NetScript API
 * @param {string} serverName - Server to check
 * @returns {Object} - Object with server accessibility details
 */
export function getServerAccessInfo(ns, serverName) {
  const serverInfo = FACTION_SERVERS[serverName];
  const hackingLevel = ns.getHackingLevel();
  const requiredHackingLevel = ns.getServerRequiredHackingLevel(serverName);
  const hasRootAccess = ns.hasRootAccess(serverName);
  const portsRequired = ns.getServerNumPortsRequired(serverName);
  const portsAvailable = countAvailablePorts(ns);
  const canHack = hackingLevel >= requiredHackingLevel;
  const canRoot = canHack && portsAvailable >= portsRequired;
  
  return {
    serverName,
    hasRootAccess,
    requiredHackingLevel,
    currentHackingLevel: hackingLevel,
    canHack,
    portsRequired,
    portsAvailable,
    canRoot,
    faction: serverInfo?.faction
  };
}

/**
 * Get detailed info about faction status
 * @param {NS} ns - NetScript API
 * @param {string} factionName - Faction name
 * @returns {Object} - Object with faction status details
 */
export async function getFactionStatus(ns, factionName) {
  const joined = ns.getPlayer().factions.includes(factionName);
  const factionRep = joined ? ns.singularity.getFactionRep(factionName) : 0;
  const augStatus = joined ? await getAugmentationStatus(ns, factionName) : { total: 0, owned: 0, available: 0 };
  const invitations = ns.singularity.checkFactionInvitations();
  const hasInvitation = invitations.includes(factionName);
  
  return {
    factionName,
    joined,
    factionRep,
    augStatus,
    hasInvitation
  };
}
