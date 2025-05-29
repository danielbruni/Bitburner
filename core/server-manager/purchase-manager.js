/**
 * purchase-manager.js - Handles buying and upgrading servers
 */

import { getMaxAffordableRam } from "./utils.js";
import { formatMoney } from "../utils/common.js";

/**
 * Purchase and manage owned servers
 * @param {NS} ns - NetScript API
 * @param {boolean} shouldUpgrade - Whether to upgrade existing servers
 */
export async function manageOwnedServers(ns, shouldUpgrade) {
  // Get current purchased servers
  const purchasedServers = ns.getPurchasedServers();
  const maxServers = ns.getPurchasedServerLimit();

  // Check how much money we have to spend
  const money = ns.getPlayer().money;
  const maxAffordableRam = getMaxAffordableRam(ns, money);

  // Report status
  ns.print(
    `💻 Server management: ${purchasedServers.length}/${maxServers} servers purchased`
  );
  ns.print(`💰 Available funds: $${formatMoney(money)}`);
  ns.print(`🖥️ Max affordable RAM: ${maxAffordableRam}GB`);

  if (shouldUpgrade) {
    // Upgrade existing servers if we can afford better ones
    for (const server of purchasedServers) {
      const currentRam = ns.getServerMaxRam(server);

      // Only upgrade if we can afford at least double the RAM
      if (currentRam < maxAffordableRam / 2) {
        // Calculate optimal RAM upgrade
        const upgradeRam = Math.min(
          maxAffordableRam,
          Math.pow(2, Math.floor(Math.log2(maxAffordableRam)))
        );

        // Delete and replace the server
        ns.killall(server);
        ns.deleteServer(server);
        ns.purchaseServer(server, upgradeRam);

        ns.print(
          `🔄 Upgraded ${server} from ${currentRam}GB to ${upgradeRam}GB RAM`
        );
      }
    }
  } else {
    ns.print(
      `ℹ️ Server upgrades are disabled. Set shouldUpgradeServers to true to enable.`
    );
  }

  // Buy new servers if we don't have max
  while (purchasedServers.length < maxServers) {
    const ram = 8;

    // Check if we can afford it
    const cost = ns.getPurchasedServerCost(ram);
    if (ns.getPlayer().money < cost) {
      ns.print(
        `⚠️ Cannot afford more servers right now. Need $${formatMoney(
          cost
        )} for a ${ram}GB server.`
      );
      break;
    }

    // Buy the server
    const serverName = `pserv-${purchasedServers.length}`;
    ns.purchaseServer(serverName, ram);
    ns.print(`✅ Purchased new server ${serverName} with ${ram}GB RAM`);

    // Update our list
    purchasedServers.push(serverName);
  }
}
