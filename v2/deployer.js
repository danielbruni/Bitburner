/** @param {NS} ns */
export async function main(ns) {
  let servers = [];
  let ramPerThread = ns.getScriptRam("early-hack-template.js");
  let serversToScan = ns.scan("home");

  ns.tprint('before while servers: ' + serversToScan);


  while (serversToScan.length > 0) {
    let server = serversToScan.shift();

    if (!servers.includes(server) && server !== "home") {
      servers.push(server);
      serversToScan = serversToScan.concat(ns.scan(server));

      let openPorts = 0;

      if (ns.fileExists("BruteSSH.exe")) {
        ns.brutessh(server);
        openPorts++;
      }

      if (ns.fileExists("FTPCrack.exe")) {
        ns.ftpcrack(server);
        openPorts++;
      }

      if (ns.fileExists("RelaySMTP.exe")) {
        ns.relaysmtp(server);
        openPorts++;
      }

      if (ns.fileExists("HTTPWorm.exe")) {
        ns.httpworm(serverName);
        openPorts++;
      }

      if (ns.fileExists("SQLInject.exe")) {
        ns.sqlinject(serverName);
        openPorts++;
      }


      if (ns.getServerNumPortsRequired(server) <= openPorts) {
        ns.nuke(server);
      }


      if (ns.hasRootAccess(server)) {
        ns.scp("early-hack-template.js", server);

        let ramAvailable = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
        let threads = Math.floor(ramAvailable / ramPerThread);

        if (threads > 0) {
          ns.exec("early-hack-template.js", server, threads);
        }
      }
    }
  }
}