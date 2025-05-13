/**
 * faction-data.js - Data module for faction-related information
 * 
 * This module contains data about faction servers, progression paths,
 * and other faction-related constants used by the milestones script.
 */

/** Server details for faction-related milestone targets */
export const FACTION_SERVERS = {
  CSEC: {
    serverName: "CSEC",
    requiredHackingLevel: 50,
    faction: "CyberSec",
    factionServer: true,
  },
  "avmnite-02h": {
    serverName: "avmnite-02h",
    requiredHackingLevel: 202,
    faction: "NiteSec",
    factionServer: true,
  },  "I.I.I.I": {
    serverName: "I.I.I.I",
    requiredHackingLevel: 300,
    faction: "The Black Hand",
    factionServer: true,
  },
  run4theh111z: {
    serverName: "run4theh111z",
    requiredHackingLevel: 505,
    faction: "BitRunners",
    factionServer: true,
  },
};

/** List of port opener programs in order of acquisition */
export const PORT_OPENERS = [
  { name: "BruteSSH.exe", func: "brutessh" },
  { name: "FTPCrack.exe", func: "ftpcrack" },
  { name: "relaySMTP.exe", func: "relaysmtp" },
  { name: "HTTPWorm.exe", func: "httpworm" },
  { name: "SQLInject.exe", func: "sqlinject" },
];

/** Ordered progression of faction servers (first to last) */
export const FACTION_PROGRESSION = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z"];

/** 
 * Get faction information by server name
 * @param {string} serverName - Name of the server
 * @returns {Object|null} Faction information or null if not found
 */
export function getFactionByServer(serverName) {
  return FACTION_SERVERS[serverName] || null;
}

/**
 * Get faction information by faction name
 * @param {string} factionName - Name of the faction
 * @returns {Object|null} Server information or null if not found
 */
export function getServerByFaction(factionName) {
  for (const [serverName, serverInfo] of Object.entries(FACTION_SERVERS)) {
    if (serverInfo.faction === factionName) {
      return { serverName, ...serverInfo };
    }
  }
  return null;
}

/**
 * Get the next faction server in the progression
 * @param {string} currentServer - Current server name
 * @returns {string|null} Next server name or null if at the end
 */
export function getNextFactionServer(currentServer) {
  const currentIndex = FACTION_PROGRESSION.indexOf(currentServer);
  if (currentIndex === -1 || currentIndex === FACTION_PROGRESSION.length - 1) {
    return null;
  }
  return FACTION_PROGRESSION[currentIndex + 1];
}
