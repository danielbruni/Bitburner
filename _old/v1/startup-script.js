/** 
 * @param {NS} ns
 * @param {String} host 
 * 
 * @returns {number}
 */
async function getServerMaxRam(ns, host) {
  const servRam = ns.getServerMaxRam(serv);

  tprint("Max memory on server " + host + " is: ", servRam);

  return servRam;
}


/** @param {NS} ns */
export async function main(ns) {
  // Array of all servers that dont need any ports opened
  const servers0Port = [
    "sigma-cosmetics",
    "joesguns",
    "nectar-net",
    "hong-fang-tea",
    "harakiri-sushi"
  ];

  // Array of all servers that only need 1 port opened
  const servers1Port = [
    "neo-net",
    "max-hardware",
    "iron-gym"
  ];

  // script to copy and exec on servers
  const scriptName = "early-hack-template.js";

  // Copy scripts onto each server that requires 0 ports
  for (let i = 0; i < servers0Port.length; ++i) {
    const serv = servers0Port[i];

    ns.scp(scriptName, serv);
    ns.nuke(serv);
    ns.exec(scriptName, serv, 6);
  }

  // Wait until acquire "bruteSSH"
  while (!ns.fileExists("BruteSSH.exe")) {
    await ns.sleep(60000);
  }

  // Copy scripts onto each server that requires 1 ports
  for (let i = 0; i < servers1Port.length; ++i) {
    const serv = servers1Port[i];

    ns.scp(scriptName, serv);
    ns.brutessh(serv);
    ns.nuke(serv);
    ns.exec(scriptName, serv, 12);
  }


}