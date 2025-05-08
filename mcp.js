/** 
 * @param {NS} ns 
 **/



const SEC_DIF = 5
const MON_PERC = 0.5
const SLEEP_TIME = 1
let SERVERS = {
  "n00dles": { "action": null, "servers": ["max-hardware"] },
  "foodnstuff": { "action": null, "servers": ["zer0"] },
  "sigma-cosmetics": { "action": null, "servers": ["nectar-net", "CSEC"] },
  "joesguns": { "action": null, "servers": [] },
  "hong-fang-tea": { "action": null, "servers": [] },
  "harakiri-sushi": { "action": null, "servers": [] },
  "iron-gym": { "action": null, "servers": [] },
}
const EXECUTE_SCRIPT = "scripts/execute.js"

function disable_logs(ns) {
  let logs = ["scan", "run", 'getServerSecurityLevel', 'getServerMoneyAvailable', 'getServerMoneyAvailable', 'getServerMaxMoney', 'getServerMinSecurityLevel']
  for (let i in logs) {
    ns.disableLog(logs[i])
  }
}

function get_action(ns, host) {
  let actions = ns.ps(host)
  if (actions.length == 0) {
    ns.print(host, " has no scripts.")
    return null
  }
  return actions[0].filename.replace("scripts/", "").replace(".js", "")
}

function get_all_servers(ns) {
  let servers = ["home"]
  let result = []
  let i = 0
  while (i < servers.length) {
    let server = servers[i]
    let s = ns.scan(server)
    for (let j in s) {
      let con = s[j]
      if (servers.indexOf(con) < 0) {
        servers.push(con)
        result.push(con)
      }
    }
    i += 1
  }
  return result
}

function update_servers(ns, SERVERS) {
  let all_servers = get_all_servers(ns)
  for (let i in all_servers) {
    let server = all_servers[i]
    if (parseInt(ns.getServerMaxMoney(server)) == 0) {
      ns.print(`Skipping ${server}`)
      continue
    }
    SERVERS[server] = { "action": null, "servers": [] }
    SERVERS[server]["action"] = get_action(ns, server)
  }
}

function determine_action(ns, server) {
  let money = ns.getServerMoneyAvailable(server)
  let mon_perc = money / ns.getServerMaxMoney(server)
  let sec_dif = ns.getServerSecurityLevel(server) - ns.getServerMinSecurityLevel(server)
  // determine action	
  if (sec_dif >= SEC_DIF) { return "weaken" }
  else if (mon_perc < MON_PERC) { return "grow" }
  else { return "hack" }
}

/** 
 * @param {NS} ns 
**/
export async function main(ns) {
  disable_logs(ns)
  update_servers(ns, SERVERS)
  while (true) {
    for (let server in SERVERS) {
      if (!ns.hasRootAccess(server)) {
        continue
      }
      let action = determine_action(ns, server)
      // execute action if the current action is different.
      if (SERVERS[server]["action"] != action) {
        SERVERS[server]["action"] = action
        ns.run(EXECUTE_SCRIPT, 1, action, server, server)
        await ns.sleep(500)
        for (let i in SERVERS[server]["servers"]) {
          let host = SERVERS[server]["servers"][i]
          ns.run(EXECUTE_SCRIPT, 1, action, server, host)
          await ns.sleep(500)
        }
        if (ns.serverExists(server + "-serv")) {
          ns.run(EXECUTE_SCRIPT, 1, action, server, server + "-serv")
        }
      } else {
        ns.print(`No action taken for ${server}. ${SERVERS[server]["action"]} == ${action}`)
      }
    }
    await ns.sleep(60000 * SLEEP_TIME)
  }
}