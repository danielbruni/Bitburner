/** @param {NS} ns */
export async function main(ns) {
  const target = ns.args[0] || "joesguns";

  // Check if we can hack this target
  const hackLevel = ns.getHackingLevel();
  const reqLevel = ns.getServerRequiredHackingLevel(target);

  if (hackLevel < reqLevel) {
    ns.tprint(
      `ERROR: Need hacking level ${reqLevel} for ${target}, you have ${hackLevel}`
    );
    return;
  }

  // Try to gain access
  try {
    if (ns.fileExists("BruteSSH.exe")) ns.brutessh(target);
    if (ns.fileExists("FTPCrack.exe")) ns.ftpcrack(target);
    if (ns.fileExists("relaySMTP.exe")) ns.relaysmtp(target);
    if (ns.fileExists("HTTPWorm.exe")) ns.httpworm(target);
    if (ns.fileExists("SQLInject.exe")) ns.sqlinject(target);

    if (!ns.hasRootAccess(target)) {
      ns.nuke(target);
    }

    ns.tprint(`✅ Successfully gained access to ${target}`);
  } catch (e) {
    ns.tprint(`❌ Failed to gain access to ${target}: ${e}`);
    return;
  }

  // Start hacking
  ns.tprint(`🎯 Starting simple hack loop on ${target}`);
  let earnings = 0;

  while (true) {
    const securityThresh = ns.getServerMinSecurityLevel(target) + 5;
    const moneyThresh = ns.getServerMaxMoney(target) * 0.1; // 10% threshold

    if (ns.getServerSecurityLevel(target) > securityThresh) {
      ns.print("Weakening...");
      await ns.weaken(target);
    } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
      ns.print("Growing...");
      await ns.grow(target);
    } else {
      const stolen = await ns.hack(target);
      if (stolen > 0) {
        earnings += stolen;
        ns.print(
          `💰 Hacked $${ns.formatNumber(
            stolen
          )}, total earned: $${ns.formatNumber(earnings)}`
        );
      }
    }
  }
}
