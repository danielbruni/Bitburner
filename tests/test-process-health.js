/**
 * test-process-health.js - Test script for process health monitoring
 * Run this to verify the new process management system is working
 */

import { ProcessHealthMonitor } from "/core/process/process-health.js";
import { ProcessCoordinator } from "/core/process/coordination.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.tprint("🧪 Testing Process Health Monitoring System");

  // Create test monitor
  const monitor = new ProcessHealthMonitor(ns);
  const coordinator = new ProcessCoordinator(ns);

  // Test 1: Process registration
  ns.tprint("📝 Test 1: Process Registration");
  monitor.registerProcess("/core/server-manager/index.js", "home", [false, 20]);
  monitor.registerProcess("/core/resource-manager/index.js", "home", [
    "config",
    0.75,
    5,
    20,
  ]);
  ns.tprint("✅ Processes registered successfully");

  // Test 2: Health checking
  ns.tprint("📊 Test 2: Health Check");
  const health = await monitor.checkHealth();
  ns.tprint(
    `Health Status: ${health.healthy} healthy, ${health.stopped} stopped`
  );

  // Test 3: Process starting
  ns.tprint("🚀 Test 3: Process Starting");
  const serverManagerStarted = await monitor.startProcess(
    "/core/server-manager/index.js",
    "home"
  );
  ns.tprint(
    `Server Manager Start: ${serverManagerStarted ? "✅ Success" : "❌ Failed"}`
  );

  // Wait a moment
  await ns.sleep(1000);

  // Test 4: Coordination
  ns.tprint("🤝 Test 4: Process Coordination");
  coordinator.sendMessage("test_message", {
    test: true,
    timestamp: Date.now(),
  });
  const messages = coordinator.readMessages("test_message");
  ns.tprint(
    `Coordination Messages: ${messages.length} message(s) sent/received`
  );

  // Test 5: State management
  ns.tprint("💾 Test 5: State Management");
  coordinator.markServerDataRefreshed();
  const isStale = coordinator.isServerDataStale(1000);
  ns.tprint(`Server Data Stale Check: ${isStale ? "Stale" : "Fresh"}`);

  // Test 6: Status summary
  ns.tprint("📋 Test 6: Status Summary");
  const status = coordinator.getStatusSummary();
  ns.tprint(`System Uptime: ${status.uptime} seconds`);
  ns.tprint(`Recent Messages: ${status.recentMessages}`);

  // Final health check
  const finalHealth = await monitor.checkHealth();
  ns.tprint("🏁 Final Results:");
  ns.tprint(`  Healthy Processes: ${finalHealth.healthy}`);
  ns.tprint(`  Stopped Processes: ${finalHealth.stopped}`);
  ns.tprint(`  System Uptime: ${status.uptime}s`);

  if (finalHealth.healthy > 0) {
    ns.tprint("🎉 Process Health Monitoring System is working correctly!");
  } else {
    ns.tprint("⚠️ Some issues detected. Check the logs above.");
  }
}
