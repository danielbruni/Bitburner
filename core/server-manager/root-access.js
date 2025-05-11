/**
 * root-access.js - Handles gaining root access to servers
 */

/**
 * Try to gain root access to a server using available exploits
 * @param {NS} ns - NetScript API
 * @param {string} server - Server to target
 */
export async function tryGetRootAccess(ns, server) {
  // Check required hacking skill
  const requiredHackingSkill = ns.getServerRequiredHackingLevel(server);
  const playerHackingSkill = ns.getPlayer().skills.hacking;

  if (playerHackingSkill < requiredHackingSkill) {
    return; // Can't hack this yet
  }

  // Check which ports we need to open
  const requiredPorts = ns.getServerNumPortsRequired(server);
  let openablePorts = 0;

  // Check which programs we have available
  const portOpeners = [
    { program: "BruteSSH.exe", method: ns.brutessh },
    { program: "FTPCrack.exe", method: ns.ftpcrack },
    { program: "relaySMTP.exe", method: ns.relaysmtp },
    { program: "HTTPWorm.exe", method: ns.httpworm },
    { program: "SQLInject.exe", method: ns.sqlinject },
  ];

  // Open ports if we have the programs
  for (const opener of portOpeners) {
    if (ns.fileExists(opener.program, "home")) {
      try {
        opener.method(server);
        openablePorts++;
      } catch (e) {
        // Port may already be open
      }
    }
  }

  // Nuke if we can
  if (openablePorts >= requiredPorts) {
    ns.nuke(server);
    ns.print(`🔓 Gained root access to ${server}`);
  }
}
