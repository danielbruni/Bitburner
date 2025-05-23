/** @param {NS} ns */
export async function main(ns) {
  ns.tprint("=== DIAGNOSTIC REPORT ===");

  // 1. Check if data files exist and have content
  ns.tprint("\n1. DATA FILES:");
  const dataFiles = ["/data/servers.txt", "/data/targets.txt"];
  for (const file of dataFiles) {
    if (ns.fileExists(file)) {
      try {
        const content = JSON.parse(ns.read(file));
        ns.tprint(`${file}: ✅ EXISTS`);
        if (file === "/data/servers.txt") {
          ns.tprint(`  Available servers: ${content.available?.length || 0}`);
        } else if (file === "/data/targets.txt") {
          ns.tprint(`  Target servers: ${content.targets?.length || 0}`);
          if (content.targets && content.targets.length > 0) {
            ns.tprint("  Top 3 targets:");
            content.targets
              .slice(0, 3)
              .forEach((t) =>
                ns.tprint(
                  `    ${t.name}: Req Level ${
                    t.requiredHackingLevel
                  }, Max $${ns.formatNumber(t.maxMoney || 0)}`
                )
              );
          }
        }
      } catch (e) {
        ns.tprint(`${file}: ❌ CORRUPT - ${e}`);
      }
    } else {
      ns.tprint(`${file}: ❌ MISSING`);
    }
  }

  // 2. Check running scripts
  ns.tprint("\n2. RUNNING SCRIPTS:");
  const scripts = [
    "/core/server-manager/index.js",
    "/core/resource-manager/index.js",
    "/core/workers/worker.js",
  ];
  for (const script of scripts) {
    const isRunning = ns.scriptRunning(script, "home");
    ns.tprint(`${script}: ${isRunning ? "✅ RUNNING" : "❌ NOT RUNNING"}`);
  }

  // 3. Check hackable servers manually
  ns.tprint("\n3. MANUAL SERVER CHECK:");
  const hackLevel = ns.getHackingLevel();
  ns.tprint(`Your hacking level: ${hackLevel}`);

  const testServers = [
    "joesguns",
    "nectar-net",
    "hong-fang-tea",
    "harakiri-sushi",
  ];
  for (const server of testServers) {
    try {
      const reqLevel = ns.getServerRequiredHackingLevel(server);
      const maxMoney = ns.getServerMaxMoney(server);
      const currentMoney = ns.getServerMoneyAvailable(server);
      const hasRoot = ns.hasRootAccess(server);

      ns.tprint(`${server}:`);
      ns.tprint(
        `  Req Level: ${reqLevel} (${
          hackLevel >= reqLevel ? "✅ CAN HACK" : "❌ TOO HIGH"
        })`
      );
      ns.tprint(`  Max Money: $${ns.formatNumber(maxMoney)}`);
      ns.tprint(`  Current Money: $${ns.formatNumber(currentMoney)}`);
      ns.tprint(`  Root Access: ${hasRoot ? "✅ YES" : "❌ NO"}`);
    } catch (e) {
      ns.tprint(`${server}: ❌ ERROR - ${e}`);
    }
  }

  // 4. Check RAM usage
  ns.tprint("\n4. RAM USAGE:");
  const totalRam = ns.getServerMaxRam("home");
  const usedRam = ns.getServerUsedRam("home");
  const freeRam = totalRam - usedRam;
  ns.tprint(
    `Home server: ${usedRam.toFixed(2)}/${totalRam}GB used, ${freeRam.toFixed(
      2
    )}GB free`
  );
}
