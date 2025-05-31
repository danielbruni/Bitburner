// Simple test to verify the missing methods exist
import { createStrategyCoordinator } from "../core/process/strategy-coordinator.js";

// Mock NS object for testing
const mockNS = {
  print: console.log,
  tprint: console.log,
  read: () => "{}",
  write: () => {},
  fileExists: () => false,
  getPlayer: () => ({ money: 1000000 }),
  sleep: async (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

async function testMethods() {
  console.log("🧪 Testing StrategyCoordinator methods...");

  const coordinator = createStrategyCoordinator(mockNS);

  // Test getCurrentStrategy
  console.log("✅ Testing getCurrentStrategy()");
  const currentStrategy = coordinator.getCurrentStrategy();
  console.log(`   Current strategy: ${currentStrategy}`);

  // Test changeStrategy
  console.log("✅ Testing changeStrategy()");
  const changeResult = await coordinator.changeStrategy("aggressive", "test");
  console.log(`   Change result: ${JSON.stringify(changeResult, null, 2)}`);

  // Test getStrategyHistory
  console.log("✅ Testing getStrategyHistory()");
  const history = coordinator.getStrategyHistory();
  console.log(`   History length: ${history.length}`);

  console.log("🎉 All method tests completed!");
}

testMethods().catch(console.error);
