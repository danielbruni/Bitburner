/**
 *
 * @param {NS} ns
 */
export async function main(ns) {
  const config = {
    maxNodes: 20,
    targetLevel: 200,
    targetRam: 64,
    targetCores: 16,
    moneyReserve: 1000000000, // Keep 1B for other activities
  };

  while (true) {
    await manageHackenet(ns, config);
    await ns.sleep(10000); // Sleep for 10 second to avoid busy-waiting
  }
}

/**
 * Manage Hacknet Nodes by purchasing new nodes and upgrading existing ones.
 * @param {NS} ns
 * @param {{ maxNodes: number; targetLevel: number; targetRam: number; targetCores: number; moneyReserve: number; }} config
 */
async function manageHackenet(ns, config) {
  const money = ns.getServerMoneyAvailable("home");
  const numNodes = ns.hacknet.numNodes();

  // Buy new nodes if we have less than max and enough money
  if (numNodes < config.maxNodes && money > config.moneyReserve) {
    const cost = ns.hacknet.getPurchaseNodeCost();

    if (money - cost > config.moneyReserve) {
      const newIndex = ns.hacknet.purchaseNode();
      if (newIndex >= 0) {
        ns.print(
          `✅ Purchased new Hacknet Node #${newIndex}  for $${cost.toLocaleString()}`
        );
      }
    }
  }

  // Upgrade existing nodes
  for (let i = 0; i < numNodes; i++) {
    await upgradeNode(ns, i, config, money);
  }
}

/**
 * Upgrade a Hacknet Node based on the provided configuration.
 * @param {NS} ns
 * @param {number} nodeIndex
 * @param {Object} config
 * @param {number} availableMoney
 */
async function upgradeNode(ns, nodeIndex, config, availableMoney) {
  const stats = ns.hacknet.getNodeStats(nodeIndex);
  const money = availableMoney - config.moneyReserve;

  // Priority order: Level > RAM > Cores

  // Upgrade level
  if (stats.level < config.targetLevel) {
    const cost = ns.hacknet.getLevelUpgradeCost(nodeIndex, 1);
    if (cost <= money) {
      ns.hacknet.upgradeLevel(nodeIndex, 1);
      ns.print(`📈 Upgraded node ${nodeIndex} level to ${stats.level + 1}`);
      return;
    }
  }

  // Upgrade RAM
  if (stats.ram < config.targetRam) {
    const cost = ns.hacknet.getRamUpgradeCost(nodeIndex, 1);
    if (cost <= money) {
      ns.hacknet.upgradeRam(nodeIndex, 1);
      ns.print(`💾 Upgraded node ${nodeIndex} RAM to ${stats.ram * 2}GB`);
      return;
    }
  }

  // Upgrade cores
  if (stats.cores < config.targetCores) {
    const cost = ns.hacknet.getCoreUpgradeCost(nodeIndex, 1);
    if (cost <= money) {
      ns.hacknet.upgradeCore(nodeIndex, 1);
      ns.print(`⚙️ Upgraded node ${nodeIndex} cores to ${stats.cores + 1}`);
      return;
    }
  }
}
