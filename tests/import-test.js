// Simple import test for strategy coordinator
try {
  console.log("Testing imports...");
  // Test if we can import the strategy coordinator
  import("../core/process/strategy-coordinator.js")
    .then((module) => {
      console.log("✅ Strategy coordinator import successful");
      console.log("Available exports:", Object.keys(module));

      // Test creating an instance
      const mockNS = {
        print: console.log,
        read: () => "{}",
        write: () => {},
        fileExists: () => false,
        getPlayer: () => ({ money: 1000000 }),
      };

      const coordinator = module.createStrategyCoordinator(mockNS);
      console.log("✅ Strategy coordinator created successfully");

      // Test the method that was failing
      const currentStrategy = coordinator.getCurrentStrategy();
      console.log(`✅ getCurrentStrategy() works: ${currentStrategy}`);
    })
    .catch((error) => {
      console.error("❌ Import failed:", error);
    });
} catch (error) {
  console.error("❌ Test failed:", error);
}
