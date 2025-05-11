/** @param {NS} ns */
export async function main(ns) {
  // Parse command line argument for max upgrade level
  let upgradeMax = ns.args[0];
  let currentUpgrade = 1;

  // Loop through each upgrade level up to the max
  while (currentUpgrade <= upgradeMax) {
    let ramSize = Math.pow(2, currentUpgrade);
    ns.tprint(`Starting upgrade to ${ramSize}GB RAM (Tier ${currentUpgrade})`);

    // Try to upgrade each server from 0 to 24
    let i = 0;
    while (i < 25) {
      // Check if the server exists - upgrade if it does, purchase if it doesn't
      if (ns.serverExists("pserv-" + i)) {
        // Get the cost to upgrade this server
        const upgradeCost = ns.getPurchasedServerUpgradeCost(
          "pserv-" + i,
          ramSize
        );

        // Check if we have enough money to upgrade
        if (ns.getServerMoneyAvailable("home") >= upgradeCost) {
          ns.tprint(
            `Upgrading pserv-${i} to ${ramSize}GB for $${ns.formatNumber(
              upgradeCost
            )}`
          );
          ns.upgradePurchasedServer("pserv-" + i, ramSize);
          i++;
          continue;
        }
      } else {
        // Get the cost to purchase a new server
        const purchaseCost = ns.getPurchasedServerCost(ramSize);

        // Check if we have enough money to buy a new server
        if (ns.getServerMoneyAvailable("home") >= purchaseCost) {
          ns.tprint(
            `Purchasing pserv-${i} with ${ramSize}GB for $${ns.formatNumber(
              purchaseCost
            )}`
          );
          ns.purchaseServer("pserv-" + i, ramSize);
          i++;
          continue;
        }
      }

      // If we reach here, we don't have enough money - wait a bit and try again
      ns.print("RAM size = " + ramSize);
      ns.print("Current upgrade level = " + currentUpgrade);
      ns.print("Last bought/upgraded server = " + "pserv-" + i);
      ns.print("Waiting for more money...");
      await ns.sleep(10000); // Wait 10 seconds before trying again
    }

    ns.tprint(
      "Completed upgrade for " +
        Math.pow(2, currentUpgrade) +
        "GB, Tier " +
        currentUpgrade
    );
    currentUpgrade++;
  }
  ns.tprint(
    "Servers fully upgraded to tier " +
      (currentUpgrade - 1) +
      " (" +
      Math.pow(2, currentUpgrade - 1) +
      "GB)"
  );
}
