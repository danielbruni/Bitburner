/** @param {NS} ns */
export async function main(ns) {
  // How much RAM each purchased server will have
  const ram = 8;

  // Iterator we'll use for our loop
  let i = 0;

  while (i < ns.getPurchasedServerLimit()) {
    // Check if we have enough money
    if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram)) {
      // If we have enough money, then:
      //  1. Purchase the server
      //  2. Copy our hacking script onto the newly-purchased server
      //  3. Run our hacking script on the newly-purchased server with 3 threads
      //  4. Increment our iterator to indicate that we've bought a new server
      let hostname = ns.purchaseServer("pserv-" + i, ram);
      ns.scp("early-hack-template.js", hostname);
      ns.exec("early-hack-template.js", hostname, 3);
      i++;
    }

    await ns.sleep(1000);
  }
}