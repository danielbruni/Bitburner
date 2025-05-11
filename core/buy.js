/** @param {NS} ns */
export async function main(ns) {
  const CONFIG = {
    buyUpdateInterval: 60000, // How often try to buy (ms)
    exeList: [
      { name: "AutoLink.exe", requiredLevel: 100 },
      { name: "BruteSSH.exe", requiredLevel: 100 },
      { name: "DeepscanV1.exe", requiredLevel: 100 },
      { name: "DeepscanV2.exe", requiredLevel: 100 },
      { name: "FTPCrack.exe", requiredLevel: 100 },
      { name: "Formulas.exe", requiredLevel: 1000 },
      { name: "HTTPWorm.exe", requiredLevel: 500 },
      { name: "SQLInject.exe", requiredLevel: 750 },
      { name: "ServerProfiler.exe", requiredLevel: 100 },
      { name: "relaySMTP.exe", requiredLevel: 100 },
    ],
  };


  let shouldBuyMore = true;


  while (shouldBuyMore) {
    try {

      if (!ns.hasTorRouter()) {
        ns.tprint("No TOR router detected. Try to buy...");
        // ns.singularity.purchaseTor();
      }


      for (const exe of CONFIG.exeList) {
        // Check if File already exists
        if (ns.fileExists(exe.name)) {
          continue;
        }

        // Check if we have the required hacking level
        const hackingLevel = ns.getHackingLevel();
        if (hackingLevel < exe.requiredLevel) {
          ns.print(`Program ${exe.name} needs a Hacking-Level of ${exe.requiredLevel} - You have ${hackingLevel}`);
          continue;
        }

        // Check if we have enough Money
        //const currentMoney = ns.getServerMoneyAvailable(targetName);

        // Try to buy exe
        // ns.singularity.purchaseProgram(exe.name);
      }

      // Wait for next cycle
      await ns.sleep(CONFIG.buyUpdateInterval);
    } catch (error) {
      ns.print(`ERROR: ${error.toString()}`);
      await ns.sleep(5000);
    }
  }
}