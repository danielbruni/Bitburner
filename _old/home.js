/** @param {NS} ns */
export async function main(ns) {
  const server = "home";
  const ramPerThread = ns.getScriptRam("early-hack-template.js");
  
  const ramAvailable = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
  const threads = Math.floor(ramAvailable / ramPerThread);

  if (threads > 0) {
    ns.exec("early-hack-template.js", server, threads);
  }
}