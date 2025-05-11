import { table } from 'helper/table.js';


/** @param {NS} ns */
export async function main(ns) {
  // Read results from server manager
  const serverData = JSON.parse(ns.read('/v6/data/servers.txt'));
  const availableServers = serverData.available || [];

  for (const server of availableServers) {

  }


  table(availableServers);
}